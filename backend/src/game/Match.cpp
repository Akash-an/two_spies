#include "game/Match.hpp"
#include "protocol/Messages.hpp"
#include <algorithm>
#include <random>
#include <iostream>

namespace two_spies::game {

Match::Match(const std::string& session_id, const MapDef& map, SendFn send_fn)
    : session_id_(session_id)
    , state_(std::make_unique<GameState>(map))
    , send_(std::move(send_fn))
{}

std::optional<PlayerSide> Match::add_player(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    if (red_player_id_.empty()) {
        red_player_id_ = player_id;
        return PlayerSide::RED;
    }
    if (blue_player_id_.empty()) {
        blue_player_id_ = player_id;
        return PlayerSide::BLUE;
    }
    return std::nullopt;  // match is full
}

bool Match::is_full() const {
    return !red_player_id_.empty() && !blue_player_id_.empty();
}

void Match::set_player_name(const std::string& player_id, const std::string& name) {
    std::lock_guard lock(mutex_);
    PlayerSide side = side_of(player_id);
    state_->player_mut(side).name = name;
}

void Match::start(unsigned int seed) {
    std::lock_guard lock(mutex_);
    if (started_) return;
    started_ = true;

    // Pick random distinct starting cities that are NOT adjacent.
    // We shuffle all city IDs and scan for the first pair (i, j) that satisfies
    // the constraints.  This guarantees we never pass an invalid pair to
    // set_starting_cities(), which would throw and crash the server.
    auto city_ids = state_->graph().all_city_ids();
    std::mt19937 rng(seed);
    std::shuffle(city_ids.begin(), city_ids.end(), rng);

    std::string red_city, blue_city;
    bool found = false;
    for (std::size_t i = 0; i < city_ids.size() && !found; ++i) {
        for (std::size_t j = i + 1; j < city_ids.size() && !found; ++j) {
            if (!state_->graph().are_adjacent(city_ids[i], city_ids[j])) {
                red_city  = city_ids[i];
                blue_city = city_ids[j];
                found = true;
            }
        }
    }

    if (!found) {
        // Extremely degenerate map — every pair of cities is adjacent.
        // Fall back to allowing adjacent starts (the game will still run).
        red_city  = city_ids[0];
        blue_city = city_ids[1];
    }

    state_->set_starting_cities(red_city, blue_city);

    std::cout << "[Match " << session_id_ << "] Started: RED=" << red_city
              << " BLUE=" << blue_city << "\n";

    // Send MATCH_START to each player with their assigned side
    {
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::MATCH_START,
            session_id_,
            {{"side", "RED"}}
        );
        send_to(red_player_id_, msg);
    }
    {
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::MATCH_START,
            session_id_,
            {{"side", "BLUE"}}
        );
        send_to(blue_player_id_, msg);
    }

    // Send initial filtered state to each player
    broadcast_state();
}

void Match::handle_action(const std::string& player_id, const std::string& action,
                           const std::string& target_city, const std::string& ability_id) {
    std::lock_guard lock(mutex_);
    if (!started_ || state_->is_game_over()) {
        send_error(player_id, "Match not active.");
        return;
    }

    PlayerSide side = side_of(player_id);
    ActionResult result;

    if (action == "MOVE") {
        result = state_->move(side, target_city);
    } else if (action == "STRIKE") {
        result = state_->strike(side, target_city);
    } else if (action == "WAIT") {
        result = state_->wait(side);
    } else if (action == "ABILITY") {
        // Parse ability_id
        AbilityId aid = AbilityId::DEEP_COVER; // default
        if (ability_id == "DEEP_COVER")    aid = AbilityId::DEEP_COVER;
        else if (ability_id == "ENCRYPTION")    aid = AbilityId::ENCRYPTION;
        else if (ability_id == "LOCATE")        aid = AbilityId::LOCATE;
        else if (ability_id == "STRIKE_REPORT") aid = AbilityId::STRIKE_REPORT;
        else if (ability_id == "RAPID_RECON")   aid = AbilityId::RAPID_RECON;
        else if (ability_id == "PREP_MISSION")  aid = AbilityId::PREP_MISSION;
        else {
            send_error(player_id, "Unknown ability: " + ability_id);
            return;
        }
        result = state_->use_ability(side, aid, target_city);
    } else {
        send_error(player_id, "Unknown action: " + action);
        return;
    }

    if (!result.ok) {
        send_error(player_id, result.error);
        return;
    }

    if (result.game_over) {
        // Send GAME_OVER to both players
        auto go_msg = protocol::make_server_message(
            protocol::ServerMsgType::GAME_OVER,
            session_id_,
            {{"winner", to_string(result.winner)},
             {"reason", result.game_over_reason}}
        );
        send_to(red_player_id_, go_msg);
        send_to(blue_player_id_, go_msg);
    }

    broadcast_state();
}

void Match::handle_end_turn(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    if (!started_ || state_->is_game_over()) {
        send_error(player_id, "Match not active.");
        return;
    }

    PlayerSide side = side_of(player_id);
    auto result = state_->end_turn(side);

    if (!result.ok) {
        send_error(player_id, result.error);
        return;
    }

    broadcast_state();
}

void Match::remove_player(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    if (player_id == red_player_id_)  red_player_id_.clear();
    if (player_id == blue_player_id_) blue_player_id_.clear();
}

bool Match::is_game_over() const {
    return state_ && state_->is_game_over();
}

// ── Private helpers ──────────────────────────────────────────────────

PlayerSide Match::side_of(const std::string& player_id) const {
    if (player_id == red_player_id_) return PlayerSide::RED;
    return PlayerSide::BLUE;
}

std::string Match::player_id_of(PlayerSide side) const {
    return side == PlayerSide::RED ? red_player_id_ : blue_player_id_;
}

void Match::broadcast_state() {
    // Send per-player filtered state
    if (!red_player_id_.empty()) {
        auto payload = protocol::serialize_match_state(session_id_, *state_, PlayerSide::RED);
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::MATCH_STATE, session_id_, payload);
        send_to(red_player_id_, msg);
    }
    if (!blue_player_id_.empty()) {
        auto payload = protocol::serialize_match_state(session_id_, *state_, PlayerSide::BLUE);
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::MATCH_STATE, session_id_, payload);
        send_to(blue_player_id_, msg);
    }
}

void Match::send_to(const std::string& player_id, const std::string& msg) {
    if (!player_id.empty() && send_) {
        send_(player_id, msg);
    }
}

void Match::send_error(const std::string& player_id, const std::string& error) {
    auto msg = protocol::make_error(session_id_, error);
    send_to(player_id, msg);
}

} // namespace two_spies::game
