#pragma once

#include "game/CityGraph.hpp"
#include "game/Player.hpp"
#include <string>
#include <optional>
#include <unordered_set>
#include <random>

namespace two_spies::game {

/// Represents an Intel reward pop-up spawned on the board.
struct IntelPopup {
    std::string city_id;    // city where Intel appeared
    int amount = 10;        // amount (fixed at 10)
    int turn_created;       // turn number when created
};

/// Represents an Action pickup spawned on the board.
struct ActionPopup {
    std::string city_id;    // city where Action pickup appeared
    int turn_created;       // turn number when created
};

/// Action types the client can send.
enum class ActionKind { MOVE, STRIKE, ABILITY, WAIT, CONTROL };

inline const char* to_string(ActionKind a) {
    switch (a) {
        case ActionKind::MOVE:    return "MOVE";
        case ActionKind::STRIKE:  return "STRIKE";
        case ActionKind::ABILITY: return "ABILITY";
        case ActionKind::WAIT:    return "WAIT";
        case ActionKind::CONTROL: return "CONTROL";
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

    /// Assign starting cities for both players. Must be distinct.
    void set_starting_cities(const std::string& alpha_city, const std::string& beta_city);

    /// Set which player starts the game.
    void set_starting_turn(PlayerSide side);

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

    /// Control action - claim control of the current city.
    ActionResult control(PlayerSide side);

    /// End the current player's turn.
    /// @param side The player whose turn is ending
    /// @param skip_exploration_bonus If true (e.g., on timeout), skip the +4 exploration bonus
    ActionResult end_turn(PlayerSide side, bool skip_exploration_bonus = false);

    /// Abort the match (requested by a player).
    void abort(PlayerSide side);

    // ── Queries ──────────────────────────────────────────────────
    PlayerSide current_turn() const { return current_turn_; }
    int turn_number() const { return turn_number_; }
    bool is_game_over() const { return game_over_; }
    PlayerSide winner() const { return winner_; }
    const std::string& game_over_reason() const { return game_over_reason_; }

    const PlayerData& player(PlayerSide side) const;
    PlayerData& player_mut(PlayerSide side);

    const CityGraph& graph() const { return graph_; }

    // ── City Control Feature ──────────────────────────────────
    /// Get the player who controls a city (if any)
    PlayerSide get_city_controller(const std::string& city) const;
    
    /// Get all controlled cities as a map: city_id -> controlling_player
    const std::unordered_map<std::string, PlayerSide>& city_controllers() const { return city_controllers_; }

    // ── Intel Pop-up Feature ───────────────────────────────────
    /// Get all active Intel pop-ups on the board
    const std::vector<IntelPopup>& intel_popups() const { return intel_popups_; }

    // ── Action Pop-up Feature ──────────────────────────────────
    /// Get all active Action pop-ups on the board
    const std::vector<ActionPopup>& action_popups() const { return action_popups_; }

    // ── Shrinking Map Feature ─────────────────────────────────
    /// Get the city scheduled to disappear at the end of this action count
    const std::string& scheduled_disappear_city() const { return scheduled_disappear_city_; }
    
    /// Get all cities that have disappeared
    const std::unordered_set<std::string>& disappeared_cities() const { return disappeared_cities_; }
    
    /// Check if a player is stranded (in a disappearing city)
    bool is_player_stranded(PlayerSide side) const;

private:
    CityGraph graph_;
    PlayerData alpha_;
    PlayerData beta_;
    PlayerSide current_turn_ = PlayerSide::ALPHA;
    int turn_number_ = 1;
    bool game_over_ = false;
    PlayerSide winner_{};
    std::string game_over_reason_;

    // ── Shrinking Map Tracking ────────────────────────────────
    int action_count_ = 0;                              // cumulative action count
    std::string scheduled_disappear_city_;              // city to disappear at action 6, 12, 18, etc.
    std::unordered_set<std::string> disappeared_cities_; // cities that have already disappeared
    std::mt19937 rng_{};                                // for random city selection

    // ── City Control Tracking ─────────────────────────────────
    std::unordered_map<std::string, PlayerSide> city_controllers_;  // city_id -> controlling PlayerSide

    // ── Intel Pop-up Tracking ─────────────────────────────────
    std::vector<IntelPopup> intel_popups_;         // active Intel pop-ups on board
    int actions_since_last_intel_popup_ = 0;       // action counter for spawning
    int next_intel_popup_threshold_ = 0;           // how many more actions until next popup (3-5)

    // ── Action Pop-up Tracking ────────────────────────────────
    std::vector<ActionPopup> action_popups_;       // active Action pop-ups on board
    int actions_since_last_action_popup_ = 0;      // independent counter for spawning
    int next_action_popup_threshold_ = 0;          // how many more actions until next action popup (5-8)

    /// Select a random city to disappear (one that hasn't disappeared yet)
    /// Ensures the remaining graph stays connected
    std::string select_random_city_to_disappear();

    /// Check if graph would remain connected after removing a city
    bool would_graph_stay_connected(const std::string& city_to_remove) const;

    /// Handle action count increment and city disappearance logic
    void increment_action_count();

    /// Spawn a random Intel pop-up if threshold is reached
    void try_spawn_intel_popup();

    /// Spawn a random Action pop-up if threshold is reached (independent cycle)
    void try_spawn_action_popup();

    /// Process Intel claiming: if player is at city with Intel, mark it for claiming
    void try_claim_intel(PlayerSide side);

    /// Process Action claiming: if player is at city with Action pickup, mark it for claiming
    void try_claim_action(PlayerSide side);

    /// Apply claimed Intel at start of turn (blows cover)
    void apply_claimed_intel(PlayerSide side);

    /// Apply claimed Action at start of turn (blows cover, grants +1 action)
    void apply_claimed_action(PlayerSide side);

    /// Check if both spies are in the same city with no cover.
    ActionResult check_same_city();
};

} // namespace two_spies::game
