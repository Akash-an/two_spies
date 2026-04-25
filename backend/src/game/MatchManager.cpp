#include "game/MatchManager.hpp"
#include "protocol/Messages.hpp"
#include <chrono>
#include <iostream>
#include <sstream>
#include <random>
#include <iomanip>

namespace two_spies::game {

MatchManager::MatchManager(const MapDef& default_map)
    : default_map_(default_map)
{}

// ─── Create a new match room ─────────────────────────────────────────

std::string MatchManager::create_match(const std::string& player_id, SendFn send_fn,
                                        const std::string& player_name) {
    std::lock_guard lock(mutex_);

    // Prevent double-join
    auto it = player_to_session_.find(player_id);
    if (it != player_to_session_.end()) {
        return "";  // already in a match
    }

    auto session_id = generate_session_id();
    auto code = generate_room_code();

    auto match = std::make_shared<Match>(session_id, default_map_, send_fn);
    match->add_player(player_id);
    match->set_player_name(player_id, player_name);

    matches_[session_id] = match;
    code_to_session_[code] = session_id;
    player_to_session_[player_id] = session_id;

    std::cout << "[MatchManager] " << player_id << " created match "
              << session_id << " (code: " << code << ")\n";

    // Send MATCH_CREATED with the room code so the host can share it
    if (send_fn) {
        auto created_msg = protocol::make_server_message(
            protocol::ServerMsgType::MATCH_CREATED,
            session_id,
            {{"code", code}}
        );
        send_fn(player_id, created_msg);

        auto wait_msg = protocol::make_server_message(
            protocol::ServerMsgType::WAITING_FOR_OPPONENT,
            session_id,
            {{"message", "Share the code with your opponent."}}
        );
        send_fn(player_id, wait_msg);
    }

    return code;
}

// ─── Join an existing match by code ──────────────────────────────────

std::string MatchManager::join_match_by_code(const std::string& player_id, const std::string& code,
                                              SendFn send_fn, const std::string& player_name) {
    std::lock_guard lock(mutex_);

    // Prevent double-join
    auto pit = player_to_session_.find(player_id);
    if (pit != player_to_session_.end()) {
        return pit->second;
    }

    // Look up the room code
    auto cit = code_to_session_.find(code);
    if (cit == code_to_session_.end()) {
        if (send_fn) {
            auto err = protocol::make_error("", "Invalid room code: " + code);
            send_fn(player_id, err);
        }
        return "";
    }

    auto session_id = cit->second;
    auto mit = matches_.find(session_id);
    if (mit == matches_.end() || mit->second->is_full()) {
        if (send_fn) {
            auto err = protocol::make_error("", "Room is full or no longer available.");
            send_fn(player_id, err);
        }
        return "";
    }

    auto match = mit->second;
    auto side = match->add_player(player_id);
    if (!side.has_value()) {
        if (send_fn) {
            auto err = protocol::make_error("", "Could not join room.");
            send_fn(player_id, err);
        }
        return "";
    }

    match->set_player_name(player_id, player_name);
    player_to_session_[player_id] = session_id;

    // Code consumed — remove it so it can't be reused
    code_to_session_.erase(cit);

    std::cout << "[MatchManager] " << player_id << " joined match "
              << session_id << " as " << to_string(*side) << " (code: " << code << ")\n";

    // Match is now full — start it
    match->start(next_seed_++);
    return session_id;
}

// ─── Queries ─────────────────────────────────────────────────────────

std::shared_ptr<Match> MatchManager::get_match(const std::string& session_id) {
    std::lock_guard lock(mutex_);
    auto it = matches_.find(session_id);
    if (it == matches_.end()) return nullptr;
    return it->second;
}

void MatchManager::remove_player(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    auto it = player_to_session_.find(player_id);
    if (it == player_to_session_.end()) return;

    auto session_id = it->second;
    player_to_session_.erase(it);

    auto match_it = matches_.find(session_id);
    if (match_it != matches_.end()) {
        match_it->second->remove_player(player_id);
    }
}

std::string MatchManager::session_for_player(const std::string& player_id) const {
    std::lock_guard lock(mutex_);
    auto it = player_to_session_.find(player_id);
    if (it == player_to_session_.end()) return "";
    return it->second;
}

// ─── Helpers ─────────────────────────────────────────────────────────

std::string MatchManager::generate_session_id() {
    auto now = std::chrono::steady_clock::now().time_since_epoch();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now).count();
    std::ostringstream oss;
    oss << "match-" << ms << "-" << matches_.size();
    return oss.str();
}

std::string MatchManager::generate_room_code() {
    static std::mt19937 rng{std::random_device{}()};
    std::uniform_int_distribution<int> dist(1000, 9999);

    // Ensure uniqueness among active codes
    std::string code;
    do {
        code = std::to_string(dist(rng));
    } while (code_to_session_.count(code) > 0);

    return code;
}

void MatchManager::broadcast_all_matches() {
    std::lock_guard lock(mutex_);
    for (auto& [session_id, match] : matches_) {
        if (match && match->is_started() && !match->is_game_over()) {
            match->periodic_broadcast();
        }
    }
}

} // namespace two_spies::game
