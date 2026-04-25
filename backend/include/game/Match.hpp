#pragma once

#include "game/GameState.hpp"
#include "game/Player.hpp"
#include <string>
#include <memory>
#include <functional>
#include <mutex>
#include <chrono>

namespace two_spies::game {

/**
 * Match — ties two player sessions to a single GameState.
 *
 * The Match owns the GameState and routes validated actions.
 * It uses a callback to send messages back to each player's session.
 */
class Match {
public:
    using SendFn = std::function<void(const std::string& player_id, const std::string& json_msg)>;

    explicit Match(const std::string& session_id, const MapDef& map, SendFn send_fn);

    const std::string& session_id() const { return session_id_; }

    /// Add a player to this match.  Returns the assigned side, or nullopt if full.
    std::optional<PlayerSide> add_player(const std::string& player_id);

    /// Set the display name for a player.
    void set_player_name(const std::string& player_id, const std::string& name);

    /// Returns true when two players have joined.
    bool is_full() const;

    /// Called when both players are present. Assigns starting cities and broadcasts MATCH_START + initial state.
    void start(unsigned int seed);

    /// Handle a PLAYER_ACTION from a client.
    void handle_action(const std::string& player_id, const std::string& action,
                       const std::string& target_city, const std::string& ability_id);

    /// Handle END_TURN from a client.
    void handle_end_turn(const std::string& player_id);

    /// Abort the match (requested by a player).
    void handle_abort(const std::string& player_id);

    /// Handle turn timeout: forfeits remaining actions and transfers control to opponent.
    /// Sends TURN_CHANGE message to both players and broadcasts new state.
    void handle_turn_timeout();

    /// Remove a player (disconnect).
    void remove_player(const std::string& player_id);

    /// Called periodically to check for timeouts and broadcast state.
    /// This ensures timeout detection even when players are idle.
    void periodic_broadcast();

    bool is_started() const { return started_; }
    bool is_game_over() const;

    const GameState& state() const { return *state_; }

    /// Returns milliseconds since turn started.
    long long time_since_turn_start() const;

    /// Returns true if current turn has exceeded time limit (15 seconds).
    /// Does NOT modify state — just checks if timeout occurred.
    bool check_turn_timeout();

private:
    std::string session_id_;
    std::unique_ptr<GameState> state_;
    SendFn send_;
    std::mutex mutex_;

    // Player bookkeeping
    std::string red_player_id_;
    std::string blue_player_id_;
    bool started_ = false;

    // Turn timer (15 seconds per turn)
    static constexpr long long TURN_DURATION_MS = 15000;
    std::chrono::steady_clock::time_point turn_start_time_;

    PlayerSide side_of(const std::string& player_id) const;
    std::string player_id_of(PlayerSide side) const;
    void broadcast_state();
    void send_to(const std::string& player_id, const std::string& msg);
    void send_error(const std::string& player_id, const std::string& error);
};

} // namespace two_spies::game
