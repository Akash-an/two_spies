#include "game/GameState.hpp"
#include <algorithm>
#include <stdexcept>

namespace two_spies::game {

GameState::GameState(const MapDef& map)
    : graph_(map)
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
    blue_.current_city = blue_city; 
    blue_.starting_city = blue_city;
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

    p.current_city = target_city;
    p.actions_remaining -= 1;
    p.has_cover = true;  // moving grants cover
    if (!p.has_moved_from_start) {
        p.has_moved_from_start = true;  // first move away from starting city
    }

    // Clear opponent's knowledge of this player's location (Locate effect wears off)
    auto& opponent = player_mut(opposite(side));
    opponent.known_opponent_city = "";  // player took action, clear their known location

    // No automatic collision detection - players must strike to win
    // auto collision = check_same_city();
    // if (collision.game_over) return collision;

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
        return result;
    }

    // MISS — striker loses cover but their location is NOT revealed to the opponent.
    // The opponent is only notified that a strike occurred (opponent_used_strike flag);
    // they learn nothing about WHERE the striker is.
    opponent.opponent_used_strike = true;  // notify opponent that a strike was attempted
    attacker.has_cover = false;             // striker loses cover for taking an aggressive action

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

    // Stub: consume one action.  Ability-specific effects will be
    // implemented per-ability in Phase 4.
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

    // Intel income: base 1 per turn + bonus cities
    int income = 1;
    const auto* city_def = graph_.get_city(p.current_city);
    if (city_def && city_def->is_bonus) {
        income += 1;
    }
    p.intel += income;

    // Pickup city: bonus Intel
    if (city_def && city_def->is_pickup) {
        p.intel += 1;
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

} // namespace two_spies::game
