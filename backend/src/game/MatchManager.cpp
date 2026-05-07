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

    // Check if player is already in a match
    auto it = player_to_session_.find(player_id);
    if (it != player_to_session_.end()) {
        auto old_session_id = it->second;
        auto mit = matches_.find(old_session_id);
        if (mit != matches_.end() && !mit->second->is_game_over()) {
            return "";  // already in an ACTIVE match
        }
        
        // Match is either missing or over — clean up before creating new one
        player_to_session_.erase(it);
        if (mit != matches_.end()) {
            mit->second->remove_player(player_id);
            if (mit->second->is_empty()) {
                matches_.erase(mit);
            }
        }
    }

    auto session_id = generate_session_id();
    auto code = generate_room_code();

    auto match = std::make_shared<Match>(session_id, code, default_map_, send_fn);
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

    // Check if player is already in a match
    auto pit = player_to_session_.find(player_id);
    if (pit != player_to_session_.end()) {
        auto old_session_id = pit->second;
        auto mit = matches_.find(old_session_id);
        
        // If it's the SAME room they are trying to join, trigger reconnect
        auto cit = code_to_session_.find(code);
        if (cit != code_to_session_.end() && cit->second == old_session_id) {
            std::cout << "[MatchManager] Player " << player_id << " re-joining match " << old_session_id << "\n";
            if (mit != matches_.end()) {
                mit->second->reconnect_player(player_id);
            }
            return old_session_id;
        }

        if (mit != matches_.end() && !mit->second->is_game_over()) {
            std::cout << "[MatchManager] Player " << player_id << " already in active match " << old_session_id << "\n";
            return old_session_id; // Already in another ACTIVE match
        }

        // Match is over or different — clean up before joining new one
        player_to_session_.erase(pit);
        if (mit != matches_.end()) {
            mit->second->remove_player(player_id);
            if (mit->second->is_empty()) {
                matches_.erase(mit);
            }
        }
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
    if (it != player_to_session_.end()) {
        auto mit = matches_.find(it->second);
        if (mit != matches_.end()) {
            mit->second->handle_player_disconnect(player_id);
        }
    }
}

void MatchManager::abort_match(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    
    auto it = player_to_session_.find(player_id);
    if (it == player_to_session_.end()) return;

    auto session_id = it->second;
    auto mit = matches_.find(session_id);
    if (mit != matches_.end()) {
        auto match = mit->second;
        
        // Relinquish the room code so others can't join
        std::string code = match->code();
        if (!code.empty()) {
            code_to_session_.erase(code);
        }

        // Mark game as over and notify players
        match->handle_abort(player_id);

        // Unlink both players from the mapping — the match is now dead
        auto alpha = match->alpha_player_id();
        auto beta = match->beta_player_id();
        if (!alpha.empty()) player_to_session_.erase(alpha);
        if (!beta.empty()) player_to_session_.erase(beta);

        // If it was just a host waiting, or not yet started, remove from matches_
        if (match->is_empty() || !match->is_started()) {
            matches_.erase(mit);
        }
    } else {
        // Fallback: just clear this player's mapping
        player_to_session_.erase(it);
    }
}

void MatchManager::leave_match(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    auto it = player_to_session_.find(player_id);
    if (it == player_to_session_.end()) return;

    auto session_id = it->second;
    auto mit = matches_.find(session_id);
    if (mit != matches_.end()) {
        auto& match = mit->second;
        if (match->is_game_over()) {
            // Graceful leave from a finished game — just unlink, no forfeit clock
            player_to_session_.erase(it);
            std::cout << "[MatchManager] Player " << player_id << " left finished match " << session_id << "\n";
        } else {
            // Mid-game leave — treat as disconnect so timeout logic applies
            match->handle_player_disconnect(player_id);
            std::cout << "[MatchManager] Player " << player_id << " left mid-game match " << session_id << " (disconnect logic applied)\n";
        }
    } else {
        player_to_session_.erase(it);
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
    static std::mt19937 rng{std::random_device{}()};
    std::uniform_int_distribution<int> dist(100000, 999999);
    
    // Ensure uniqueness
    std::string session_id;
    do {
        session_id = std::to_string(dist(rng));
    } while (matches_.count(session_id) > 0);
    
    return session_id;
}

std::string MatchManager::generate_room_code() {
    static std::mt19937 rng{std::random_device{}()};
    std::uniform_int_distribution<int> dist4(1000, 9999);
    std::uniform_int_distribution<int> dist6(100000, 999999);

    // Try 4-digit codes first
    for (int i = 0; i < 50; ++i) {
        std::string code = std::to_string(dist4(rng));
        if (code_to_session_.count(code) == 0) {
            return code;
        }
    }

    // Fallback to 6-digit if 4-digit space is crowded
    std::string code;
    do {
        code = std::to_string(dist6(rng));
    } while (code_to_session_.count(code) > 0);

    return code;
}

void MatchManager::check_all_timeouts() {
    std::vector<std::shared_ptr<Match>> matches_to_check;
    {
        std::lock_guard lock(mutex_);
        for (auto& [session_id, match] : matches_) {
            if (match && match->is_started() && !match->is_game_over()) {
                matches_to_check.push_back(match);
            }
        }
    }

    for (auto& match : matches_to_check) {
        match->check_for_timeout();
    }

    // Proactive GC
    purge_expired_matches();
}

void MatchManager::purge_expired_matches() {
    std::lock_guard lock(mutex_);
    const std::chrono::seconds TTL(60); // Clean up matches finished > 60s ago

    std::vector<std::string> sessions_to_remove;
    for (auto& [session_id, match] : matches_) {
        if (match->is_expired(TTL)) {
            sessions_to_remove.push_back(session_id);
        }
    }

    for (const auto& session_id : sessions_to_remove) {
        auto it = matches_.find(session_id);
        if (it != matches_.end()) {
            std::cout << "[MatchManager] PURGING expired match " << session_id << "\n";

            // Unlink room code
            for (auto code_it = code_to_session_.begin(); code_it != code_to_session_.end(); ) {
                if (code_it->second == session_id) {
                    code_it = code_to_session_.erase(code_it);
                } else {
                    ++code_it;
                }
            }

            // Unlink players
            for (auto player_it = player_to_session_.begin(); player_it != player_to_session_.end(); ) {
                if (player_it->second == session_id) {
                    player_it = player_to_session_.erase(player_it);
                } else {
                    ++player_it;
                }
            }

            matches_.erase(it);
        }
    }
}

} // namespace two_spies::game
