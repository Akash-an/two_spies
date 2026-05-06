#include "protocol/Messages.hpp"
#include "game/Match.hpp"
#include <iostream>
#include <cstdio>

namespace two_spies::protocol {

// ─── Parse client message ────────────────────────────────────────────

std::optional<IncomingMessage> parse_client_message(const std::string& raw) {
    try {
        auto j = json::parse(raw);
        IncomingMessage msg;

        auto type_str = j.at("type").get<std::string>();

        if      (type_str == "AUTHENTICATE")   msg.type = ClientMsgType::AUTHENTICATE;
        else if (type_str == "CREATE_MATCH")   msg.type = ClientMsgType::CREATE_MATCH;
        else if (type_str == "JOIN_MATCH")     msg.type = ClientMsgType::JOIN_MATCH;
        else if (type_str == "RECONNECT_MATCH") msg.type = ClientMsgType::RECONNECT_MATCH;
        else if (type_str == "PLAYER_ACTION")  msg.type = ClientMsgType::PLAYER_ACTION;
        else if (type_str == "END_TURN")       msg.type = ClientMsgType::END_TURN;
        else if (type_str == "SET_PLAYER_NAME") msg.type = ClientMsgType::SET_PLAYER_NAME;
        else if (type_str == "ABORT_MATCH")     msg.type = ClientMsgType::ABORT_MATCH;
        else if (type_str == "LEAVE_MATCH")     msg.type = ClientMsgType::LEAVE_MATCH;
        else {
            std::cerr << "[Protocol] Unknown message type: " << type_str << "\n";
            return std::nullopt;
        }

        if (j.contains("sessionId") && j["sessionId"].is_string())
            msg.session_id = j["sessionId"].get<std::string>();

        if (j.contains("playerId") && j["playerId"].is_string())
            msg.player_id = j["playerId"].get<std::string>();

        msg.payload = j.value("payload", json::object());

        return msg;
    }
    catch (const std::exception& e) {
        std::cerr << "[Protocol] Failed to parse message: " << e.what() << "\n";
        return std::nullopt;
    }
}

// ─── Build server messages ───────────────────────────────────────────

std::string make_server_message(ServerMsgType type,
                                const std::string& session_id,
                                const json& payload) {
    json j;
    j["type"] = to_string(type);
    j["sessionId"] = session_id;
    j["payload"] = payload;
    return j.dump();
}

std::string make_error(const std::string& session_id,
                       const std::string& message) {
    return make_server_message(
        ServerMsgType::ERROR,
        session_id,
        {{"message", message}}
    );
}

// ─── Serialize per-player filtered state ─────────────────────────────

json serialize_map(const game::MapDef& map) {
    json cities_arr = json::array();
    for (const auto& c : map.cities) {
        json cj;
        cj["id"] = c.id;
        cj["name"] = c.name;
        cj["x"] = c.x;
        cj["y"] = c.y;
        // All cities are now uniform - no special bonuses
        cities_arr.push_back(cj);
    }

    json edges_arr = json::array();
    for (const auto& e : map.edges) {
        edges_arr.push_back({{"from", e.from}, {"to", e.to}});
    }

    return {{"cities", cities_arr}, {"edges", edges_arr}};
}

json serialize_match_state(const std::string& session_id,
                           const game::GameState& state,
                           game::PlayerSide for_player,
                           long long time_elapsed_ms,
                           long long turn_duration_ms) {
    const auto& p = state.player(for_player);
    const auto& opp = state.player(game::opposite(for_player));

    // Build abilities array
    json abilities_arr = json::array();
    for (auto a : p.abilities) {
        abilities_arr.push_back(game::to_string(a));
    }

    // Player-filtered state: only own position, own Intel, etc.
    json player_state;
    player_state["side"] = game::to_string(for_player);
    player_state["name"] = p.name;
    player_state["currentCity"] = p.current_city;
    player_state["intel"] = p.intel;
    player_state["actionsRemaining"] = p.actions_remaining;
    
    // Determine the local player's perceived cover status
    if (!p.has_cover && !p.cover_blown_stealthily) {
        player_state["coverStatus"] = "EXPOSED";
    } else if (opp.encryption_unlocked) {
        player_state["coverStatus"] = "UNKNOWN";
    } else {
        player_state["coverStatus"] = "ACTIVE";
    }

    player_state["abilities"] = abilities_arr;

    // Only include opponent's known city if revealed
    if (!p.known_opponent_city.empty()) {
        player_state["knownOpponentCity"] = p.known_opponent_city;
    } else {
        player_state["knownOpponentCity"] = nullptr;
    }
    
    player_state["strikeReportUnlocked"] = p.strike_report_unlocked;
    player_state["encryptionUnlocked"] = p.encryption_unlocked;
    player_state["rapidReconUnlocked"] = p.rapid_recon_unlocked;
    player_state["prepMissionActive"] = p.prep_mission_active;
    
    // Include opponent action notifications
    player_state["opponentUsedStrike"] = p.opponent_used_strike;
    player_state["opponentUsedLocate"] = p.opponent_used_locate;
    player_state["opponentUsedDeepCover"] = p.opponent_used_deep_cover;
    player_state["opponentUsedControl"] = p.opponent_used_control;
    player_state["opponentClaimedIntel"] = p.opponent_claimed_intel;
    player_state["opponentUsedEncryption"] = p.opponent_used_encryption;
    player_state["opponentUsedPrepMission"] = p.opponent_used_prep_mission;

    player_state["opponentUnlockedStrikeReport"] = p.opponent_unlocked_strike_report;
    player_state["opponentStrikeReportActive"] = opp.strike_report_revealed;
    player_state["opponentEncryptionActive"] = opp.encryption_unlocked;
    player_state["opponentRapidReconActive"] = opp.rapid_recon_revealed;
    
    // Include player action feedback
    player_state["locateBlockedByDeepCover"] = p.locate_blocked_by_deep_cover;
    
    // DEBUG: Print to stderr what we're serializing
    if (p.locate_blocked_by_deep_cover) {
        std::cerr << "[SERIALIZE] Player " << (p.side == game::PlayerSide::ALPHA ? "ALPHA" : "BETA") 
                  << ": locateBlockedByDeepCover=" << p.locate_blocked_by_deep_cover << "\n";
    }
    
    // Include starting cities for both players - these are now shared information
    player_state["startingCity"] = p.starting_city;
    player_state["opponentStartingCity"] = opp.starting_city;

    json result;
    result["sessionId"] = session_id;
    result["turnNumber"] = state.turn_number();
    result["currentTurn"] = game::to_string(state.current_turn());
    result["player"] = player_state;
    result["opponentName"] = opp.name;  // safe: just a display name, no strategic info
    result["gameOver"] = state.is_game_over();
    result["opponentMovedFromStart"] = opp.has_moved_from_start;
    
    // Shrinking map feature
    if (!state.scheduled_disappear_city().empty()) {
        result["scheduledDisappearCity"] = state.scheduled_disappear_city();
    } else {
        result["scheduledDisappearCity"] = nullptr;
    }
    
    json disappeared_arr = json::array();
    for (const auto& city : state.disappeared_cities()) {
        disappeared_arr.push_back(city);
    }
    result["disappearedCities"] = disappeared_arr;
    result["isPlayerStranded"] = state.is_player_stranded(for_player);
    
    // Intel pop-ups: visible to both players
    json intel_popups_arr = json::array();
    for (const auto& popup : state.intel_popups()) {
        json popup_obj;
        popup_obj["city"] = popup.city_id;
        popup_obj["amount"] = popup.amount;
        intel_popups_arr.push_back(popup_obj);
    }
    result["intelPopups"] = intel_popups_arr;
    
    // Action pop-ups: visible to both players
    json action_popups_arr = json::array();
    for (const auto& popup : state.action_popups()) {
        json popup_obj;
        popup_obj["city"] = popup.city_id;
        action_popups_arr.push_back(popup_obj);
    }
    result["actionPopups"] = action_popups_arr;
    
    // Player feedback: did they claim Intel this turn?
    player_state["claimedIntel"] = p.claimed_intel_this_turn;
    
    // Controlled cities: visible to both players
    json controlled_cities_obj = json::object();
    for (const auto& [city_id, controller] : state.city_controllers()) {
        controlled_cities_obj[city_id] = game::to_string(controller);
    }
    result["controlledCities"] = controlled_cities_obj;
    
    // Timer information (15 seconds per turn, in milliseconds)
    result["turnStartTime"] = 0;  // server timestamp will be set client-side
    result["turnDuration"] = turn_duration_ms;
    result["timeElapsedMs"] = time_elapsed_ms;  // time since turn started

    if (state.is_game_over()) {
        result["winner"] = game::to_string(state.winner());
    } else {
        result["winner"] = nullptr;
    }

    return result;
}

} // namespace two_spies::protocol
