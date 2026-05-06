#pragma once

#include "game/Match.hpp"
#include <string>
#include <unordered_map>
#include <memory>
#include <mutex>
#include <functional>

namespace two_spies::game {

/**
 * MatchManager — creates and tracks active matches.
 *
 * Thread-safe: all public methods lock internally.
 */
class MatchManager {
public:
    using SendFn = Match::SendFn;

    explicit MatchManager(const MapDef& default_map);

    /// Create a new match room.  Returns the 4-digit room code.
    /// Sends MATCH_CREATED + WAITING_FOR_OPPONENT to the host.
    std::string create_match(const std::string& player_id, SendFn send_fn,
                             const std::string& player_name = "");

    /// Join an existing match by 4-digit room code.
    /// Returns the session ID on success, or empty string + sends ERROR if invalid code.
    std::string join_match_by_code(const std::string& player_id, const std::string& code,
                                   SendFn send_fn, const std::string& player_name = "");

    /// Get a match by session ID.
    std::shared_ptr<Match> get_match(const std::string& session_id);

    /// Remove a player from their match (disconnect).
    void remove_player(const std::string& player_id);

    /// Explicitly abort the match for a player and relinquish resources (code, etc.).
    void abort_match(const std::string& player_id);

    /// Returns the session ID for a given player, or empty.
    std::string session_for_player(const std::string& player_id) const;

    /// Broadcast state for all active matches (triggers timeout checks).
    /// Called periodically by the WebSocket server.
    void check_all_timeouts();

private:
    MapDef default_map_;
    mutable std::mutex mutex_;

    std::unordered_map<std::string, std::shared_ptr<Match>> matches_;        // session_id → Match
    std::unordered_map<std::string, std::string>            code_to_session_; // room code → session_id
    std::unordered_map<std::string, std::string>            player_to_session_;

    unsigned int next_seed_ = 42;

    std::string generate_session_id();
    std::string generate_room_code();  // 4-digit numeric code
};

} // namespace two_spies::game
