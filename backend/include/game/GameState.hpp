#pragma once

#include "game/CityGraph.hpp"
#include "game/Player.hpp"
#include <string>
#include <optional>
#include <unordered_set>
#include <random>

namespace two_spies::game {

/// Action types the client can send.
enum class ActionKind { MOVE, STRIKE, ABILITY, WAIT };

inline const char* to_string(ActionKind a) {
    switch (a) {
        case ActionKind::MOVE:    return "MOVE";
        case ActionKind::STRIKE:  return "STRIKE";
        case ActionKind::ABILITY: return "ABILITY";
        case ActionKind::WAIT:    return "WAIT";
    }
    return "UNKNOWN";
}

/// Result of an action validation / execution.
struct ActionResult {
    bool ok = false;
    std::string error;            // non-empty on failure
    bool game_over = false;       // true if the game ended due to this action
    PlayerSide winner{};          // valid only when game_over == true
    std::string game_over_reason; // human-readable reason
};

/**
 * GameState — pure server-authoritative game logic.
 *
 * Contains NO networking code.  Deterministic: given the same sequence of
 * actions, produces the same state.  Map data comes from CityGraph (external
 * config, not hardcoded).
 */
class GameState {
public:
    explicit GameState(const MapDef& map);

    // ── Setup ────────────────────────────────────────────────────
    /// Assign starting cities for both players. Must be distinct.
    void set_starting_cities(const std::string& red_city, const std::string& blue_city);

    // ── Actions ──────────────────────────────────────────────────
    /// Attempt a MOVE action for the given side.
    ActionResult move(PlayerSide side, const std::string& target_city);

    /// Attempt a STRIKE action for the given side on a target city.
    ActionResult strike(PlayerSide side, const std::string& target_city);

    /// Attempt to use an ABILITY.
    ActionResult use_ability(PlayerSide side, AbilityId ability,
                             const std::string& target_city = "");

    /// Wait action - consumes an action point without doing anything.
    ActionResult wait(PlayerSide side);

    /// End the current player's turn.
    ActionResult end_turn(PlayerSide side);

    // ── Queries ──────────────────────────────────────────────────
    PlayerSide current_turn() const { return current_turn_; }
    int turn_number() const { return turn_number_; }
    bool is_game_over() const { return game_over_; }
    PlayerSide winner() const { return winner_; }
    const std::string& game_over_reason() const { return game_over_reason_; }

    const PlayerData& player(PlayerSide side) const;
    PlayerData& player_mut(PlayerSide side);

    const CityGraph& graph() const { return graph_; }

    // ── Shrinking Map Feature ─────────────────────────────────
    /// Get the city scheduled to disappear at the end of this action count
    const std::string& scheduled_disappear_city() const { return scheduled_disappear_city_; }
    
    /// Get all cities that have disappeared
    const std::unordered_set<std::string>& disappeared_cities() const { return disappeared_cities_; }
    
    /// Check if a player is stranded (in a disappearing city)
    bool is_player_stranded(PlayerSide side) const;

private:
    CityGraph graph_;
    PlayerData red_;
    PlayerData blue_;
    PlayerSide current_turn_ = PlayerSide::RED;
    int turn_number_ = 1;
    bool game_over_ = false;
    PlayerSide winner_{};
    std::string game_over_reason_;

    // ── Shrinking Map Tracking ────────────────────────────────
    int action_count_ = 0;                              // cumulative action count
    std::string scheduled_disappear_city_;              // city to disappear at action 6, 12, 18, etc.
    std::unordered_set<std::string> disappeared_cities_; // cities that have already disappeared
    std::mt19937 rng_{};                                // for random city selection

    /// Select a random city to disappear (one that hasn't disappeared yet)
    /// Ensures the remaining graph stays connected
    std::string select_random_city_to_disappear();

    /// Check if graph would remain connected after removing a city
    bool would_graph_stay_connected(const std::string& city_to_remove) const;

    /// Handle action count increment and city disappearance logic
    void increment_action_count();

    /// Check if both spies are in the same city with no cover.
    ActionResult check_same_city();
};

} // namespace two_spies::game
