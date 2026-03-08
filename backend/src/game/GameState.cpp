#include "game/GameState.hpp"
#include "config/AbilityCosts.hpp"
#include <algorithm>
#include <stdexcept>
#include <chrono>

namespace two_spies::game {

GameState::GameState(const MapDef& map)
    : graph_(map), rng_(std::chrono::system_clock::now().time_since_epoch().count())
{
    red_.side = PlayerSide::RED;
    blue_.side = PlayerSide::BLUE;
}

void GameState::set_starting_cities(const std::string& red_city, const std::string& blue_city) {
    if (!graph_.has_city(red_city) || !graph_.has_city(blue_city)) {
        throw std::invalid_argument("Starting city does not exist on the map");
    }
    if (red_city == blue_city) {
        throw std::invalid_argument("Starting cities must be distinct");
    }
    if (graph_.are_adjacent(red_city, blue_city)) {
        throw std::invalid_argument("Starting cities cannot be adjacent");
    }
    red_.current_city = red_city;
    red_.starting_city = red_city;
    red_.visited_cities.insert(red_city);  // Starting city is visited
    blue_.current_city = blue_city; 
    blue_.starting_city = blue_city;
    blue_.visited_cities.insert(blue_city);  // Starting city is visited
    red_.actions_remaining = 2;
    blue_.actions_remaining = 2;
    red_.intel = 2;
    blue_.intel = 2;
}

const PlayerData& GameState::player(PlayerSide side) const {
    return side == PlayerSide::RED ? red_ : blue_;
}

PlayerData& GameState::player_mut(PlayerSide side) {
    return side == PlayerSide::RED ? red_ : blue_;
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
    bool entered_controlled_city = false;
    auto it = city_controllers_.find(target_city);
    if (it != city_controllers_.end() && it->second == opposite(side)) {
        // Opponent controls this city — automatically blow this player's cover
        p.has_cover = false;
        entered_controlled_city = true;
    }

    // Clear opponent's knowledge of this player's location (Locate effect wears off)
    // UNLESS we just entered their controlled city (then they gain sight of us)
    auto& opponent = player_mut(opposite(side));
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

ActionResult GameState::strike(PlayerSide side, const std::string& target_city) {
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
    if (!graph_.has_city(target_city)) {
        result.error = "Target city does not exist.";
        return result;
    }

    attacker.actions_remaining -= 1;

    // Clear opponent's knowledge of attacker's location (Locate effect wears off)
    auto& opponent = player_mut(opposite(side));
    opponent.known_opponent_city = "";  // attacker took action, clear their known location

    const auto& defender = player(opposite(side));

    if (defender.current_city == target_city) {
        // HIT — striker wins the round
        game_over_ = true;
        winner_ = side;
        game_over_reason_ = std::string(to_string(side)) + " struck " + target_city + " — HIT!";
        result.ok = true;
        result.game_over = true;
        result.winner = side;
        result.game_over_reason = game_over_reason_;
        // Increment action count before returning
        increment_action_count();
        return result;
    }

    // MISS — striker loses cover but their location is NOT revealed to the opponent.
    // The opponent is only notified that a strike occurred (opponent_used_strike flag);
    // they learn nothing about WHERE the striker is.
    opponent.opponent_used_strike = true;  // notify opponent that a strike was attempted
    attacker.has_cover = false;             // striker loses cover for taking an aggressive action

    // Increment action counter for shrinking map feature
    increment_action_count();

    result.ok = true;
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

    // Clear opponent's knowledge of this player's location (Locate effect wears off)
    auto& opponent = player_mut(opposite(side));
    opponent.known_opponent_city = "";  // player took action, clear their known location

    // TODO: per-ability effects (deep cover, locate, etc.)
    switch (ability) {
        case AbilityId::DEEP_COVER:
            p.has_cover = true;
            break;
        case AbilityId::LOCATE:
            // Reveal a clue about opponent's location
            // For now: if opponent has no cover, reveal their city
            {
                const auto& opp = player(opposite(side));
                if (!opp.has_cover) {
                    p.known_opponent_city = opp.current_city;
                }
                // Notify opponent that locate was used
                auto& opponent_mut = player_mut(opposite(side));
                opponent_mut.opponent_used_locate = true;
            }
            break;
        default:
            // Other abilities: stub for now
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

    // Wait action: consume an action point without doing anything
    p.actions_remaining -= 1;

    // Clear opponent's knowledge of this player's location (Locate effect wears off)
    auto& opponent = player_mut(opposite(side));
    opponent.known_opponent_city = "";  // player took action, clear their known location

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

    // Consume one action
    p.actions_remaining -= 1;

    // Increment action counter for shrinking map feature
    increment_action_count();

    result.ok = true;
    return result;
}

// ── END TURN ─────────────────────────────────────────────────────────

ActionResult GameState::end_turn(PlayerSide side) {
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

    // Intel income: base 1 per turn
    int income = 1;
    p.intel += income;

    // Exploration bonus: +4 Intel if player moved to a new city this turn
    if (p.moved_to_new_city_this_turn) {
        p.intel += 4;
        p.moved_to_new_city_this_turn = false;  // Reset flag for next turn
    }

    // Reset cover at end of turn
    p.has_cover = false;

    // Advance turn
    current_turn_ = opposite(current_turn_);
    turn_number_ += 1;

    // Reset the next player's actions
    auto& next = player_mut(current_turn_);
    next.actions_remaining = 2;
    
    // Clear opponent action notifications for the new turn
    next.opponent_used_strike = false;
    next.opponent_used_locate = false;

    result.ok = true;
    return result;
}

// ── Same-city check ──────────────────────────────────────────────────

ActionResult GameState::check_same_city() {
    ActionResult result;

    if (red_.current_city == blue_.current_city) {
        // If neither has cover → the one who moved into the city loses
        // (per GDD §6: ending turn in same city without cover = loss)
        // During a move (mid-turn), we check if the mover has cover.
        // The mover just gained cover from moving, so they're safe.
        // But if the OTHER player is here without cover, they lose.
        auto& other_side = (current_turn_ == PlayerSide::RED) ? blue_ : red_;
        if (!other_side.has_cover) {
            // The player whose turn it is NOT loses
            game_over_ = true;
            winner_ = current_turn_;
            game_over_reason_ = std::string("Cover blown! ") +
                to_string(opposite(current_turn_)) + " was caught in " + red_.current_city;
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
    // Return a default PlayerSide value (RED) if no controller found
    // Caller should check if city is actually controlled using city_controllers() map
    return PlayerSide::RED;  // This value indicates "not controlled" when used with the map check
}

} // namespace two_spies::game
