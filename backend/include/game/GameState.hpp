#pragma once

#include "game/CityGraph.hpp"
#include "game/Player.hpp"
#include <string>
#include <optional>

namespace two_spies::game {

/// Action types the client can send.
enum class ActionKind { MOVE, STRIKE, ABILITY };

inline const char* to_string(ActionKind a) {
    switch (a) {
        case ActionKind::MOVE:    return "MOVE";
        case ActionKind::STRIKE:  return "STRIKE";
        case ActionKind::ABILITY: return "ABILITY";
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

private:
    CityGraph graph_;
    PlayerData red_;
    PlayerData blue_;
    PlayerSide current_turn_ = PlayerSide::RED;
    int turn_number_ = 1;
    bool game_over_ = false;
    PlayerSide winner_{};
    std::string game_over_reason_;

    /// Check if both spies are in the same city with no cover.
    ActionResult check_same_city();
};

} // namespace two_spies::game
