#pragma once

#include "game/GameState.hpp"
#include "game/Player.hpp"
#include <nlohmann/json.hpp>
#include <string>
#include <optional>

namespace two_spies::protocol {

using json = nlohmann::json;

// ─── Message type enums — must match frontend Messages.ts ────────

/// Client → Server message types.
enum class ClientMsgType {
    CREATE_MATCH,       // Host creates a room (no payload)
    JOIN_MATCH,         // Joiner enters a code: payload.code
    PLAYER_ACTION,
    END_TURN,
    SET_PLAYER_NAME,
    ABORT_MATCH,
    LEAVE_MATCH,
};

/// Server → Client message types.
enum class ServerMsgType {
    MATCH_CREATED,           // Room created, includes code
    MATCH_START,
    MATCH_STATE,
    TURN_CHANGE,
    GAME_OVER,
    ERROR,
    WAITING_FOR_OPPONENT,
};

inline const char* to_string(ServerMsgType t) {
    switch (t) {
        case ServerMsgType::MATCH_CREATED:        return "MATCH_CREATED";
        case ServerMsgType::MATCH_START:          return "MATCH_START";
        case ServerMsgType::MATCH_STATE:          return "MATCH_STATE";
        case ServerMsgType::TURN_CHANGE:          return "TURN_CHANGE";
        case ServerMsgType::GAME_OVER:            return "GAME_OVER";
        case ServerMsgType::ERROR:                return "ERROR";
        case ServerMsgType::WAITING_FOR_OPPONENT: return "WAITING_FOR_OPPONENT";
    }
    return "UNKNOWN";
}

// ─── Incoming message (parsed) ───────────────────────────────────

struct IncomingMessage {
    ClientMsgType type;
    std::string   session_id;
    std::string   player_id;
    json          payload;
};

// ─── Parse / Serialize ───────────────────────────────────────────

/// Parse raw JSON string → IncomingMessage.  Returns nullopt on error.
std::optional<IncomingMessage> parse_client_message(const std::string& raw);

/// Build a server JSON message string.
std::string make_server_message(ServerMsgType type,
                                const std::string& session_id,
                                const json& payload);

/// Build an error message string.
std::string make_error(const std::string& session_id,
                       const std::string& message);

// ─── State serialization ─────────────────────────────────────────

/// Serialize the per-player filtered MatchState as JSON payload.
/// Includes turn timer information for client-side display.
json serialize_match_state(const std::string& session_id,
                           const game::GameState& state,
                           game::PlayerSide for_player,
                           long long time_elapsed_ms = 0,
                           long long turn_duration_ms = 30000);

/// Serialize map definition.
json serialize_map(const game::MapDef& map);

} // namespace two_spies::protocol
