#pragma once

#include "game/GameState.hpp"
#include "game/Player.hpp"
#include <string>
#include <memory>
#include <functional>
#include <mutex>

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

    /// Remove a player (disconnect).
    void remove_player(const std::string& player_id);

    bool is_started() const { return started_; }
    bool is_game_over() const;

private:
    std::string session_id_;
    std::unique_ptr<GameState> state_;
    SendFn send_;
    std::mutex mutex_;

    // Player bookkeeping
    std::string red_player_id_;
    std::string blue_player_id_;
    bool started_ = false;

    PlayerSide side_of(const std::string& player_id) const;
    std::string player_id_of(PlayerSide side) const;
    void broadcast_state();
    void send_to(const std::string& player_id, const std::string& msg);
    void send_error(const std::string& player_id, const std::string& error);
};

} // namespace two_spies::game
