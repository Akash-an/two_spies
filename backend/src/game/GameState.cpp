#include "game/GameState.hpp"
#include "config/AbilityCosts.hpp"
#include <algorithm>
#include <stdexcept>
#include <chrono>
#include <iostream>

namespace two_spies::game {

GameState::GameState(const MapDef& map)
    : graph_(map), rng_(std::chrono::system_clock::now().time_since_epoch().count())
{
    alpha_.side = PlayerSide::ALPHA;
    beta_.side = PlayerSide::BETA;

    // Initialize Intel pop-up threshold (3-5 actions)
    std::uniform_int_distribution<> dist(3, 5);
    next_intel_popup_threshold_ = dist(rng_);

    // Initialize Action pop-up threshold (7-10 actions, rarer than Intel)
    std::uniform_int_distribution<> action_dist(7, 10);
    next_action_popup_threshold_ = action_dist(rng_);
}

void GameState::set_starting_cities(const std::string& alpha_city, const std::string& beta_city) {
    if (!graph_.has_city(alpha_city) || !graph_.has_city(beta_city)) {
        throw std::invalid_argument("Starting city does not exist on the map");
    }
    if (alpha_city == beta_city) {
        throw std::invalid_argument("Starting cities must be distinct");
    }
    if (graph_.are_adjacent(alpha_city, beta_city)) {
        throw std::invalid_argument("Starting cities cannot be adjacent");
    }
    alpha_.current_city = alpha_city;
    alpha_.starting_city = alpha_city;
    alpha_.visited_cities.insert(alpha_city);  // Starting city is visited
    alpha_.has_cover = false;  // Start visible to opponent
    beta_.current_city = beta_city; 
    beta_.starting_city = beta_city;
    beta_.visited_cities.insert(beta_city);  // Starting city is visited
    beta_.has_cover = false;  // Start visible to opponent
    alpha_.actions_remaining = 2;
    beta_.actions_remaining = 2;
    alpha_.intel = 2;
    beta_.intel = 2;

    // Initial reveal: players start the game knowing each other's location
    alpha_.known_opponent_city = beta_city;
    beta_.known_opponent_city = alpha_city;
}

void GameState::set_starting_turn(PlayerSide side) {
    current_turn_ = side;
}

const PlayerData& GameState::player(PlayerSide side) const {
    return side == PlayerSide::ALPHA ? alpha_ : beta_;
}

PlayerData& GameState::player_mut(PlayerSide side) {
    return side == PlayerSide::ALPHA ? alpha_ : beta_;
}

std::string GameState::player_name(PlayerSide side) const {
    const auto& p = player(side);
    if (!p.name.empty()) {
        return p.name;
    }
    return side == PlayerSide::ALPHA ? "Alpha" : "Beta";
}

// ── MOVE ─────────────────────────────────────────────────────────────

ActionResult GameState::move(PlayerSide side, const std::string& target_city) {
    ActionResult result;

    if (game_over_) {
        result.error = "Game is already over.";
        return result;
    }
    if (side != current_turn_) {
        result.error = "Not your turn.";
        return result;
    }

    auto& p = player_mut(side);
    if (p.actions_remaining <= 0) {
        result.error = "No actions remaining — end your turn.";
        return result;
    }
    if (!graph_.has_city(target_city)) {
        result.error = "Target city does not exist.";
        return result;
    }
    if (!graph_.are_adjacent(p.current_city, target_city)) {
        result.error = "Cannot move to " + target_city + " — not adjacent to " + p.current_city + ".";
        return result;
    }

    // Cannot move into a disappeared city
    if (disappeared_cities_.find(target_city) != disappeared_cities_.end()) {
        result.error = "Cannot move to " + target_city + " — the city has been destroyed.";
        return result;
    }

    p.current_city = target_city;
    p.actions_remaining -= 1;
    p.has_cover = true;  // moving grants cover
    if (!p.has_moved_from_start) {
        p.has_moved_from_start = true;  // first move away from starting city
    }

    // Check if this is a new city (not previously visited)
    if (p.visited_cities.find(target_city) == p.visited_cities.end()) {
        p.visited_cities.insert(target_city);  // Mark as visited
        p.moved_to_new_city_this_turn = true;  // Flag for end-of-turn bonus
    }

    // Check if opponent controls this city — if so, cover is blown
    // UNLESS the player has deep_cover_active
    bool entered_controlled_city = false;
    auto it = city_controllers_.find(target_city);
    if (it != city_controllers_.end() && it->second == opposite(side)) {
        // Opponent controls this city — entry allowed but cover blown
        if (!p.deep_cover_active) {
            // No deep cover — automatically blow this player's cover
            p.has_cover = false;
            entered_controlled_city = true;
        }
        // With deep_cover_active, the player remains hidden despite controlled city
    }

    // Rapid Recon: if this player has it unlocked, entering the opponent's city blows opponent's cover
    // (unless opponent has deep_cover_active)
    auto& opponent = player_mut(opposite(side));
    if (p.rapid_recon_unlocked && opponent.current_city == target_city) {
        if (!opponent.deep_cover_active) {
            opponent.has_cover = false;
            p.known_opponent_city = target_city;  // Mover learns opponent's location
            std::cerr << "[RAPID_RECON] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA")
                      << " entered opponent's city " << target_city << " — opponent cover blown!\n";
        }
    }

    // Clear opponent's knowledge of this player's location (Locate effect wears off)
    // UNLESS we just entered their controlled city AND don't have deep_cover (then they gain sight of us)
    if (!entered_controlled_city) {
        opponent.known_opponent_city = "";  // player took action, clear their known location
    } else {
        opponent.known_opponent_city = target_city;  // opponent sees us due to controlled city
    }

    // No automatic collision detection - players must strike to win
    // auto collision = check_same_city();
    // if (collision.game_over) return collision;

    // Increment action counter for shrinking map feature
    increment_action_count();

    result.ok = true;
    return result;
}

// ── STRIKE ───────────────────────────────────────────────────────────

ActionResult GameState::strike(PlayerSide side, const std::string& /*target_city*/) {
    ActionResult result;

    if (game_over_) {
        result.error = "Game is already over.";
        return result;
    }
    if (side != current_turn_) {
        result.error = "Not your turn.";
        return result;
    }

    // Check if player is stranded in a disappearing city
    if (is_player_stranded(side)) {
        result.error = "Cannot use abilities or strike while in a disappearing city. You must move out.";
        return result;
    }

    auto& attacker = player_mut(side);
    if (attacker.actions_remaining <= 0) {
        result.error = "No actions remaining — end your turn.";
        return result;
    }

    const std::string& striker_city = attacker.current_city;

    attacker.actions_remaining -= 1;

    const auto& defender = player(opposite(side));

    if (defender.current_city == striker_city) {
        // HIT — striker wins the round
        game_over_ = true;
        winner_ = side;
        game_over_reason_ = player_name(side) + " struck " + striker_city + " — HIT!";
        result.ok = true;
        result.game_over = true;
        result.winner = side;
        result.game_over_reason = game_over_reason_;
        
        std::cerr << "[STRIKE] HIT! Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                  << " eliminated opponent at " << striker_city << "\n";
    } else {
        // MISS — striker becomes visible by attempting a strike
        result.ok = true;
        result.game_over = false;
        
        auto& defender_mut = player_mut(opposite(side));
        if (!attacker.encryption_unlocked) {
            defender_mut.opponent_used_strike = true;    // notify opponent that a strike was attempted
        }
        
        // Per Field Manual: a missed STRIKE only blows the striker's cover
        // (and reveals their position) if the defender has unlocked Strike
        // Reports. Otherwise the strike attempt is "silent" — the opponent
        // is notified a strike happened but does not learn where.
        if (defender_mut.strike_report_unlocked) {
            attacker.has_cover = false;
            defender_mut.known_opponent_city = striker_city;
            std::cerr << "[STRIKE] MISS! Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                      << " struck at " << striker_city << " but opponent was not there. Position REVEALED by Strike Report.\n";
        } else {
            std::cerr << "[STRIKE] MISS! Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                      << " struck at " << striker_city << " but opponent was not there. Opponent knows a strike occurred but not where.\n";
        }
    }

    // Increment action counter for shrinking map feature
    increment_action_count();

    return result;
}

// ── ABILITY ──────────────────────────────────────────────────────────

ActionResult GameState::use_ability(PlayerSide side, AbilityId ability,
                                     const std::string& /*target_city*/) {
    ActionResult result;

    if (game_over_) {
        result.error = "Game is already over.";
        return result;
    }
    if (side != current_turn_) {
        result.error = "Not your turn.";
        return result;
    }

    // Check if player is stranded in a disappearing city
    if (is_player_stranded(side)) {
        result.error = "Cannot use abilities or strike while in a disappearing city. You must move out.";
        return result;
    }

    auto& p = player_mut(side);
    if (p.actions_remaining <= 0) {
        result.error = "No actions remaining — end your turn.";
        return result;
    }

    // Check the player actually has this ability
    auto it = std::find(p.abilities.begin(), p.abilities.end(), ability);
    if (it == p.abilities.end()) {
        result.error = std::string("You don't have ability: ") + to_string(ability);
        return result;
    }

    if (ability == AbilityId::STRIKE_REPORT && p.strike_report_unlocked) {
        result.error = "Strike Report is already unlocked.";
        return result;
    }

    // Check if player has enough Intel to use the ability
    int cost = config::get_ability_cost(ability);
    if (p.intel < cost) {
        result.error = std::string("Insufficient Intel. ") + to_string(ability) + 
                       " costs " + std::to_string(cost) + " but you only have " + 
                       std::to_string(p.intel) + ".";
        return result;
    }

    // Deduct the ability cost
    p.intel -= cost;

    // Consume one action
    p.actions_remaining -= 1;

    auto& opponent = player_mut(opposite(side));

    // Per-ability effects
    switch (ability) {
        case AbilityId::DEEP_COVER:
            // Deep Cover must be used as the last action (1 action remaining before consuming)
            // Note: action was already consumed above, so check if we now have 0 remaining
            if (p.actions_remaining != 0) {
                // Refund the action and Intel cost
                p.actions_remaining += 1;
                p.intel += cost;
                result.error = "DEEP_COVER can only be used as your last action.";
                return result;
            }
            // Cannot use in opponent-controlled city
            {
                auto ctrl_it = city_controllers_.find(p.current_city);
                if (ctrl_it != city_controllers_.end() && ctrl_it->second == opposite(side)) {
                    // Refund the action and Intel cost
                    p.actions_remaining += 1;
                    p.intel += cost;
                    result.error = "Cannot use DEEP_COVER in an opponent-controlled city.";
                    return result;
                }
            }
            // Deep Cover grants cover (player becomes hidden) until beginning of their next turn
            p.deep_cover_active = true;
            p.deep_cover_used_on_turn = turn_number_;  // Track which turn it was used
            p.has_cover = true;
            // Clear opponent's knowledge of this player's location
            opponent.known_opponent_city = "";
            // Notify opponent that player used Deep Cover (unless encryption hides it)
            if (!p.encryption_unlocked) {
                opponent.opponent_used_deep_cover = true;
            }
            break;
        case AbilityId::LOCATE:
            // Locate reveals opponent's current location to the current player
            // UNLESS opponent has deep_cover_active — in that case, it fails
            {
                const auto& opp = player(opposite(side));
                auto& opp_mut = player_mut(opposite(side));
                
                if (opp_mut.deep_cover_active) {
                    // Cannot locate a player in deep cover
                    // Still costs Intel and action, but fails to reveal
                    p.known_opponent_city = "";
                    opp_mut.opponent_used_locate = false;  // They don't get notified
                    p.locate_blocked_by_deep_cover = true;  // Notify THIS player that their Locate failed
                    fprintf(stderr, "[!!!] SET locate_blocked_by_deep_cover=TRUE for player %s\n", 
                            side == PlayerSide::ALPHA ? "ALPHA" : "BETA");
                    // Both players stay in their current visibility state
                } else {
                    // Normal locate behavior
                    // I learn opponent's location
                    p.known_opponent_city = opp.current_city;
                    // Opponent becomes visible to me
                    opp_mut.has_cover = false;  // Locate ability reveals opponent
                    // Notify opponent (unless encryption hides it)
                    if (p.encryption_unlocked) {
                        opp_mut.cover_blown_stealthily = true;
                    } else {
                        opp_mut.opponent_used_locate = true;
                    }
                    p.locate_blocked_by_deep_cover = false;  // Locate succeeded, did not fail
                    // Note: Current player does NOT become visible by using Locate
                    // Only the opponent's location is revealed one-way
                }
            }
            break;
        case AbilityId::STRIKE_REPORT:
            p.strike_report_unlocked = true;
            if (!p.encryption_unlocked) {
                opponent.opponent_unlocked_strike_report = true;
                p.strike_report_revealed = true;
            }
            std::cerr << "[ABILITY] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                      << " unlocked STRIKE_REPORT.\n";
            break;
        case AbilityId::ENCRYPTION:
            if (p.encryption_unlocked) {
                // Refund — already unlocked
                p.actions_remaining += 1;
                p.intel += cost;
                result.error = "ENCRYPTION is already unlocked.";
                return result;
            }
            p.encryption_unlocked = true;
            // The act of enabling encryption is always notified to the opponent,
            // but subsequent actions will be hidden by it.
            opponent.opponent_used_encryption = true;

            
            // Remove from available abilities (one-time purchase)
            {
                auto abil_it = std::find(p.abilities.begin(), p.abilities.end(), AbilityId::ENCRYPTION);
                if (abil_it != p.abilities.end()) {
                    p.abilities.erase(abil_it);
                }
            }
            std::cerr << "[ABILITY] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                      << " unlocked ENCRYPTION.\n";
            break;
        case AbilityId::RAPID_RECON:
            if (p.rapid_recon_unlocked) {
                // Refund — already unlocked
                p.actions_remaining += 1;
                p.intel += cost;
                result.error = "RAPID_RECON is already unlocked.";
                return result;
            }
            p.rapid_recon_unlocked = true;
            // Remove from available abilities (one-time purchase)
            {
                auto abil_it = std::find(p.abilities.begin(), p.abilities.end(), AbilityId::RAPID_RECON);
                if (abil_it != p.abilities.end()) {
                    p.abilities.erase(abil_it);
                }
                if (!p.encryption_unlocked) {
                    p.rapid_recon_revealed = true;
                }
            }
            std::cerr << "[ABILITY] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                      << " unlocked RAPID_RECON.\n";
            break;
        case AbilityId::PREP_MISSION:
            // Prep Mission must be used as the last action
            if (p.actions_remaining != 0) {
                // Refund the action and Intel cost
                p.actions_remaining += 1;
                p.intel += cost;
                result.error = "PREP_MISSION can only be used as your last action.";
                return result;
            }
            // Cannot use in opponent-controlled city
            {
                auto ctrl_it = city_controllers_.find(p.current_city);
                if (ctrl_it != city_controllers_.end() && ctrl_it->second == opposite(side)) {
                    // Refund
                    p.actions_remaining += 1;
                    p.intel += cost;
                    result.error = "Cannot use PREP_MISSION in an opponent-controlled city.";
                    return result;
                }
            }
            p.prep_mission_active = true;
            if (!p.encryption_unlocked) {
                opponent.opponent_used_prep_mission = true;
            }
            std::cerr << "[ABILITY] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                      << " activated PREP_MISSION — next turn will have 3 actions.\n";
            break;
    }

    // Increment action counter for shrinking map feature
    increment_action_count();

    result.ok = true;
    return result;
}

// ── WAIT ─────────────────────────────────────────────────────────────

ActionResult GameState::wait(PlayerSide side) {
    ActionResult result;

    if (game_over_) {
        result.error = "Game is already over.";
        return result;
    }
    if (side != current_turn_) {
        result.error = "Not your turn.";
        return result;
    }

    // Check if player is stranded in a disappearing city
    if (is_player_stranded(side)) {
        result.error = "Cannot wait while in a disappearing city. You must move out.";
        return result;
    }

    auto& p = player_mut(side);
    if (p.actions_remaining <= 0) {
        result.error = "No actions remaining — end your turn.";
        return result;
    }

    // Per Field Manual: "You cannot wait in a Target-controlled city."
    // Reject the action without consuming an action point.
    {
        auto ctrl_it = city_controllers_.find(p.current_city);
        if (ctrl_it != city_controllers_.end() && ctrl_it->second == opposite(side)) {
            result.error = "Cannot wait in a target-controlled city.";
            return result;
        }
    }

    // Wait action: consume an action point without doing anything
    p.actions_remaining -= 1;

    // We've already validated the city is not opponent-controlled above,
    // so waiting here always grants cover.
    p.has_cover = true;
    auto& opponent = player_mut(opposite(side));
    opponent.known_opponent_city = "";

    // Increment action counter for shrinking map feature
    increment_action_count();

    result.ok = true;
    return result;
}

// ── CONTROL ──────────────────────────────────────────────────────────

ActionResult GameState::control(PlayerSide side) {
    ActionResult result;

    if (game_over_) {
        result.error = "Game is already over.";
        return result;
    }
    if (side != current_turn_) {
        result.error = "Not your turn.";
        return result;
    }

    // Check if player is stranded in a disappearing city
    if (is_player_stranded(side)) {
        result.error = "Cannot control while in a disappearing city. You must move out.";
        return result;
    }

    auto& p = player_mut(side);
    if (p.actions_remaining <= 0) {
        result.error = "No actions remaining — end your turn.";
        return result;
    }

    const std::string& current_city = p.current_city;

    // Check if player already controls this city
    auto it = city_controllers_.find(current_city);
    if (it != city_controllers_.end() && it->second == side) {
        result.error = "You already control this city.";
        return result;
    }

    // Take control of the city (may override opponent's control)
    city_controllers_[current_city] = side;

    // Blow the player's cover — opponent knows their location
    p.has_cover = false;
    
    // Notify opponent of the action by revealing this player's location
    auto& opponent = player_mut(opposite(side));
    opponent.known_opponent_city = current_city;
    if (!p.encryption_unlocked) {
        opponent.opponent_used_control = true;  // notify opponent that player took control
    }

    // Consume one action
    p.actions_remaining -= 1;

    // Increment action counter for shrinking map feature
    increment_action_count();

    result.ok = true;
    return result;
}

// ── END TURN ─────────────────────────────────────────────────────────

ActionResult GameState::end_turn(PlayerSide side, bool skip_exploration_bonus) {
    ActionResult result;

    if (game_over_) {
        result.error = "Game is already over.";
        return result;
    }
    if (side != current_turn_) {
        result.error = "Not your turn.";
        return result;
    }

    auto& p = player_mut(side);

    // Check if player ends turn at a city with Intel pop-up
    try_claim_intel(side);

    // Check if player ends turn at a city with Action pop-up
    try_claim_action(side);

    // Intel income: base 4 per turn
    int income = 4;
    p.intel += income;

    // Exploration bonus: +4 Intel if player moved to a new city this turn
    // (unless skipped due to timeout)
    if (!skip_exploration_bonus && p.moved_to_new_city_this_turn) {
        p.intel += 4;
    }
    p.moved_to_new_city_this_turn = false;  // Reset flag for next turn

    // Controlled city income: +4 Intel per city this player controls
    for (const auto& [city_id, controller] : city_controllers_) {
        if (controller == side) {
            p.intel += 4;
        }
    }

    // NOTE: Cover state persists based on player actions. Do NOT reset at turn end.
    // Cover changes only when actions are taken (move, wait, strike, control, locate, deep_cover).

    // Advance turn
    current_turn_ = opposite(current_turn_);
    turn_number_ += 1;

    // Reset the next player's actions
    auto& next = player_mut(current_turn_);
    if (next.prep_mission_active) {
        next.actions_remaining = 3;  // Prep Mission grants +1 extra action
        next.prep_mission_active = false;
        std::cerr << "[PREP_MISSION] Player " << (current_turn_ == PlayerSide::ALPHA ? "ALPHA" : "BETA")
                  << " starts turn with 3 actions (Prep Mission active).\n";
    } else {
        next.actions_remaining = 2;
    }

    // Reset notification and stealth flags for the next player
    next.opponent_used_encryption = false;
    next.opponent_used_prep_mission = false;
    next.cover_blown_stealthily = false;
    
    // Apply any claimed Intel at the start of the new turn (blows cover)
    apply_claimed_intel(current_turn_);

    // Apply any claimed Action at the start of the new turn (blows cover, grants +1 action)
    apply_claimed_action(current_turn_);
    
    // Clear Intel pop-ups from disappeared cities
    auto it = intel_popups_.begin();
    while (it != intel_popups_.end()) {
        if (disappeared_cities_.find(it->city_id) != disappeared_cities_.end()) {
            it = intel_popups_.erase(it);
        } else {
            ++it;
        }
    }
    
    // Clear Action pop-ups from disappeared cities
    auto ait = action_popups_.begin();
    while (ait != action_popups_.end()) {
        if (disappeared_cities_.find(ait->city_id) != disappeared_cities_.end()) {
            ait = action_popups_.erase(ait);
        } else {
            ++ait;
        }
    }
    
    // Clear Deep Cover if it's been used for at least 2 turns (protecting through opponent's full turn)
    // Deep Cover is used on turn N, expires at beginning of turn N+2 (after opponent's full turn)
    if (next.deep_cover_active && next.deep_cover_used_on_turn >= 0) {
        int turns_since_use = turn_number_ - next.deep_cover_used_on_turn;
        std::cerr << "[DC-CHECK] turn_number_=" << turn_number_ 
                  << " next_player=" << (current_turn_ == PlayerSide::ALPHA ? "ALPHA" : "BETA")
                  << " deep_cover_  used_on_turn=" << next.deep_cover_used_on_turn
                  << " turns_since=" << turns_since_use << "\n";
        if (turns_since_use >= 2) {
            next.deep_cover_active = false;
            next.deep_cover_used_on_turn = -1;
            std::cerr << "[DC-CLEAR] Deep Cover cleared for " << (current_turn_ == PlayerSide::ALPHA ? "ALPHA" : "BETA") << "\n";
        }
    }

    // Per Field Manual: "Starting a turn in the same city as your Target"
    // blows the cover of the player whose turn is starting (unless they
    // are protected by an active Deep Cover from their previous turn).
    {
        auto& other = player_mut(opposite(current_turn_));
        if (next.current_city == other.current_city && !next.deep_cover_active) {
            next.has_cover = false;
            other.known_opponent_city = next.current_city;
            std::cerr << "[COVER] " << (current_turn_ == PlayerSide::ALPHA ? "ALPHA" : "BETA")
                      << " starts turn in same city as target ("
                      << next.current_city << ") — cover blown.\n";
        }
    }
    
    // Clear opponent action notifications for the player who just finished their turn.
    // This ensures they saw the notifications during their turn.
    p.opponent_used_strike = false;
    p.opponent_used_locate = false;
    p.opponent_used_deep_cover = false;
    p.opponent_used_control = false;
    p.opponent_claimed_intel = false;
    p.opponent_used_encryption = false;
    p.opponent_used_prep_mission = false;
    p.cover_blown_stealthily = false; // Turn ended, stealth reveal expires or becomes obvious

    p.opponent_unlocked_strike_report = false;
    p.locate_blocked_by_deep_cover = false;  // Clear Locate feedback flag

    result.ok = true;
    return result;
}

void GameState::abort(PlayerSide side) {
    game_over_ = true;
    winner_ = opposite(side);
    game_over_reason_ = player_name(side) + " aborted the match.";
}

// ── Same-city check ──────────────────────────────────────────────────

ActionResult GameState::check_same_city() {
    ActionResult result;

    if (alpha_.current_city == beta_.current_city) {
        // If neither has cover → the one who moved into the city loses
        // (per GDD §6: ending turn in same city without cover = loss)
        // During a move (mid-turn), we check if the mover has cover.
        // The mover just gained cover from moving, so they're safe.
        // But if the OTHER player is here without cover, they lose.
        auto& other_side = (current_turn_ == PlayerSide::ALPHA) ? beta_ : alpha_;
        if (!other_side.has_cover) {
            // The player whose turn it is NOT loses
            game_over_ = true;
            winner_ = current_turn_;
            game_over_reason_ = std::string("Cover blown! ") +
                player_name(opposite(current_turn_)) + " was caught in " + alpha_.current_city;
            result.ok = true;
            result.game_over = true;
            result.winner = current_turn_;
            result.game_over_reason = game_over_reason_;
        }
    }

    return result;
}

// ── Shrinking Map ────────────────────────────────────────────────────

bool GameState::would_graph_stay_connected(const std::string& city_to_remove) const {
    auto all_cities = graph_.all_city_ids();
    
    // Need at least 2 cities remaining to be "connected"
    if (all_cities.size() <= 1) return true;
    
    // Build set of cities that would remain
    std::unordered_set<std::string> remaining_cities;
    std::string start_city;
    for (const auto& city : all_cities) {
        if (city != city_to_remove && disappeared_cities_.find(city) == disappeared_cities_.end()) {
            remaining_cities.insert(city);
            if (start_city.empty()) start_city = city;  // Pick first remaining city as start
        }
    }
    
    if (remaining_cities.empty() || start_city.empty()) return true;
    
    // BFS to check if all remaining cities are reachable from start_city
    std::unordered_set<std::string> visited;
    std::vector<std::string> queue;
    queue.push_back(start_city);
    visited.insert(start_city);
    
    while (!queue.empty()) {
        auto current = queue.back();
        queue.pop_back();
        
        const auto& neighbors = graph_.adjacent(current);
        for (const auto& neighbor : neighbors) {
            // Only traverse to cities that will remain (not disappeared, not the one being removed)
            if (remaining_cities.find(neighbor) != remaining_cities.end() && 
                visited.find(neighbor) == visited.end()) {
                visited.insert(neighbor);
                queue.push_back(neighbor);
            }
        }
    }
    
    // Graph is connected if all remaining cities are visited
    return visited.size() == remaining_cities.size();
}

std::string GameState::select_random_city_to_disappear() {
    auto all_cities = graph_.all_city_ids();
    
    // Filter out cities that have already disappeared
    std::vector<std::string> available_cities;
    for (const auto& city : all_cities) {
        if (disappeared_cities_.find(city) == disappeared_cities_.end()) {
            available_cities.push_back(city);
        }
    }
    
    if (available_cities.empty()) {
        return "";  // No cities left (shouldn't happen in normal play)
    }
    
    // Prefer peripheral cities (on the extremes of the map using x, y coordinates)
    // to avoid disconnecting the graph
    
    // Find bounds
    double min_x = 1.0, max_x = 0.0, min_y = 1.0, max_y = 0.0;
    for (const auto& city_id : available_cities) {
        const auto* city_def = graph_.get_city(city_id);
        if (city_def) {
            min_x = std::min(min_x, city_def->x);
            max_x = std::max(max_x, city_def->x);
            min_y = std::min(min_y, city_def->y);
            max_y = std::max(max_y, city_def->y);
        }
    }
    
    // Define perimeter zones: cities near the edges (outer 20% of each dimension)
    double x_threshold = (max_x - min_x) * 0.2;
    double y_threshold = (max_y - min_y) * 0.2;
    
    std::vector<std::string> peripheral_cities;
    for (const auto& city_id : available_cities) {
        const auto* city_def = graph_.get_city(city_id);
        if (city_def) {
            // City is on perimeter if it's near an edge
            bool near_edge = 
                (city_def->x <= min_x + x_threshold) ||
                (city_def->x >= max_x - x_threshold) ||
                (city_def->y <= min_y + y_threshold) ||
                (city_def->y >= max_y - y_threshold);
            
            if (near_edge) {
                peripheral_cities.push_back(city_id);
            }
        }
    }
    
    // If we have peripheral cities, pick from them; otherwise fall back to any available city
    auto& cities_to_choose = !peripheral_cities.empty() ? peripheral_cities : available_cities;
    
    // Filter out cities that would disconnect the graph
    std::vector<std::string> safe_cities;
    for (const auto& city : cities_to_choose) {
        if (would_graph_stay_connected(city)) {
            safe_cities.push_back(city);
        }
    }
    
    // If all safe cities are taken, fall back to any city that keeps graph connected
    if (safe_cities.empty()) {
        for (const auto& city : available_cities) {
            if (would_graph_stay_connected(city)) {
                safe_cities.push_back(city);
            }
        }
    }
    
    // If still no safe cities (shouldn't happen), return empty
    if (safe_cities.empty()) {
        return "";
    }
    
    // Select a random city from the safe set
    std::uniform_int_distribution<size_t> dist(0, safe_cities.size() - 1);
    return safe_cities[dist(rng_)];
}

void GameState::increment_action_count() {
    action_count_++;
    
    // Try to spawn Intel pop-up (3-5 action threshold)
    try_spawn_intel_popup();

    // Try to spawn Action pop-up (5-8 action threshold, independent cycle)
    try_spawn_action_popup();
    
    // At action 4, 10, 16, 22, etc. (4, 4+6, 4+12, ...) schedule next disappearance
    // This means at actions 6, 12, 18, 24, ... we execute the disappearance
    if (action_count_ % 6 == 4) {
        // Schedule city to disappear in 2 more actions
        scheduled_disappear_city_ = select_random_city_to_disappear();
    } else if (action_count_ % 6 == 0) {
        // Execute disappearance: mark the scheduled city as disappeared
        if (!scheduled_disappear_city_.empty()) {
            disappeared_cities_.insert(scheduled_disappear_city_);
            scheduled_disappear_city_ = "";
        }
    }
}

bool GameState::is_player_stranded(PlayerSide side) const {
    const auto& p = player(side);
    // A player is stranded if they're in a city that has already disappeared
    return disappeared_cities_.find(p.current_city) != disappeared_cities_.end();
}

PlayerSide GameState::get_city_controller(const std::string& city) const {
    auto it = city_controllers_.find(city);
    if (it != city_controllers_.end()) {
        return it->second;
    }
    // Return a default PlayerSide value (ALPHA) if no controller found
    // Caller should check if city is actually controlled using city_controllers() map
    return PlayerSide::ALPHA;  // This value indicates "not controlled" when used with the map check
}

// ── Intel Pop-up Management ──────────────────────────────────────────

void GameState::try_spawn_intel_popup() {
    actions_since_last_intel_popup_++;
    
    std::cerr << "[INTEL-DEBUG] actions_since_last_popup=" << actions_since_last_intel_popup_ 
              << " threshold=" << next_intel_popup_threshold_ << "\n";
    
    if (actions_since_last_intel_popup_ >= next_intel_popup_threshold_) {
        // Select a random city that hasn't disappeared
        auto all_cities = graph_.all_city_ids();
        std::vector<std::string> valid_cities;
        
        for (const auto& city : all_cities) {
            if (disappeared_cities_.find(city) == disappeared_cities_.end()) {
                // Check no existing Intel popup at this city
                bool has_intel = std::any_of(intel_popups_.begin(), intel_popups_.end(),
                    [&city](const IntelPopup& p) { return p.city_id == city; });
                
                // Check no existing Action popup at this city
                bool has_action = std::any_of(action_popups_.begin(), action_popups_.end(),
                    [&city](const ActionPopup& p) { return p.city_id == city; });

                if (!has_intel && !has_action) {
                    valid_cities.push_back(city);
                }
            }
        }
        
        if (!valid_cities.empty()) {
            std::uniform_int_distribution<> dist(0, valid_cities.size() - 1);
            std::string popup_city = valid_cities[dist(rng_)];
            
            // Create new Intel pop-up
            IntelPopup popup;
            popup.city_id = popup_city;
            popup.amount = 10;
            popup.turn_created = turn_number_;
            intel_popups_.push_back(popup);
            
            std::cerr << "[INTEL] Spawned Intel pop-up of " << popup.amount << " at city " 
                      << popup_city << " on turn " << turn_number_ << "\n";
        }
        
        // Reset counter and pick new threshold
        actions_since_last_intel_popup_ = 0;
        std::uniform_int_distribution<> threshold_dist(3, 5);
        next_intel_popup_threshold_ = threshold_dist(rng_);
        
        std::cerr << "[INTEL] Next threshold set to: " << next_intel_popup_threshold_ << "\n";
    }
}

void GameState::try_claim_intel(PlayerSide side) {
    auto& p = player_mut(side);
    
    // Check if there's an Intel pop-up at player's current city
    auto it = std::find_if(intel_popups_.begin(), intel_popups_.end(),
                          [&p](const IntelPopup& popup) {
                              return popup.city_id == p.current_city;
                          });
    
    if (it != intel_popups_.end()) {
        // Mark that Intel should be claimed
        p.claimed_intel_this_turn = true;
        p.intel_claimed_from_city = it->city_id;
        
        std::cerr << "[INTEL] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                  << " will claim " << it->amount << " Intel at city " << it->city_id << "\n";
        
        // Remove the pop-up
        intel_popups_.erase(it);
    }
}

void GameState::apply_claimed_intel(PlayerSide side) {
    auto& p = player_mut(side);
    
    if (p.claimed_intel_this_turn) {
        // Add 10 Intel
        p.intel += 10;
        
        // Blow cover - player becomes visible
        p.has_cover = false;
        
        // Opponent can now see this player's location (stays visible until they move/wait)
        auto& opp = player_mut(opposite(side));
        opp.known_opponent_city = p.current_city;
        if (!p.encryption_unlocked) {
            opp.opponent_claimed_intel = true;  // notify opponent that player claimed intel
        }
        
        std::cerr << "[INTEL] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                  << " claimed Intel at " << p.intel_claimed_from_city 
                  << ". New Intel: " << p.intel << ". Cover blown."
                  << " Opponent now sees at: " << p.current_city << "\n";
        
        // Reset flags
        p.claimed_intel_this_turn = false;
        p.intel_claimed_from_city = "";
    }
}

// ── Action Pop-up Management ─────────────────────────────────────────

void GameState::try_spawn_action_popup() {
    actions_since_last_action_popup_++;
    
    if (actions_since_last_action_popup_ >= next_action_popup_threshold_) {
        // Select a random city that hasn't disappeared and doesn't already have an action popup
        auto all_cities = graph_.all_city_ids();
        std::vector<std::string> valid_cities;
        
        for (const auto& city : all_cities) {
            if (disappeared_cities_.find(city) == disappeared_cities_.end()) {
                // Check no existing Action popup at this city
                bool has_action = std::any_of(action_popups_.begin(), action_popups_.end(),
                    [&city](const ActionPopup& p) { return p.city_id == city; });
                
                // Check no existing Intel popup at this city
                bool has_intel = std::any_of(intel_popups_.begin(), intel_popups_.end(),
                    [&city](const IntelPopup& p) { return p.city_id == city; });

                if (!has_action && !has_intel) {
                    valid_cities.push_back(city);
                }
            }
        }
        
        if (!valid_cities.empty()) {
            std::uniform_int_distribution<> dist(0, valid_cities.size() - 1);
            std::string popup_city = valid_cities[dist(rng_)];
            
            ActionPopup popup;
            popup.city_id = popup_city;
            popup.turn_created = turn_number_;
            action_popups_.push_back(popup);
            
            std::cerr << "[ACTION] Spawned Action pop-up at city " 
                      << popup_city << " on turn " << turn_number_ << "\n";
        }
        
        // Reset counter and pick new threshold (7-10 actions)
        actions_since_last_action_popup_ = 0;
        std::uniform_int_distribution<> threshold_dist(7, 10);
        next_action_popup_threshold_ = threshold_dist(rng_);
    }
}

void GameState::try_claim_action(PlayerSide side) {
    auto& p = player_mut(side);
    
    // Check if there's an Action pop-up at player's current city
    auto it = std::find_if(action_popups_.begin(), action_popups_.end(),
                          [&p](const ActionPopup& popup) {
                              return popup.city_id == p.current_city;
                          });
    
    if (it != action_popups_.end()) {
        p.claimed_action_this_turn = true;
        p.action_claimed_from_city = it->city_id;
        
        std::cerr << "[ACTION] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                  << " will claim Action pickup at city " << it->city_id << "\n";
        
        // Remove the pop-up
        action_popups_.erase(it);
    }
}

void GameState::apply_claimed_action(PlayerSide side) {
    auto& p = player_mut(side);
    
    if (p.claimed_action_this_turn) {
        // Grant +1 extra action
        p.actions_remaining += 1;
        
        // Blow cover - player becomes visible
        p.has_cover = false;
        
        // Opponent can now see this player's location
        auto& opp = player_mut(opposite(side));
        opp.known_opponent_city = p.current_city;
        
        std::cerr << "[ACTION] Player " << (side == PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                  << " claimed Action pickup at " << p.action_claimed_from_city 
                  << ". Actions now: " << p.actions_remaining << ". Cover blown.\n";
        
        // Reset flags
        p.claimed_action_this_turn = false;
        p.action_claimed_from_city = "";
    }
}

} // namespace two_spies::game
