#include "game/Match.hpp"
#include "protocol/Messages.hpp"
#include <algorithm>
#include <random>
#include <iostream>
#include <utility>

namespace two_spies::game {

Match::Match(const std::string& session_id, const std::string& code, const MapDef& map, SendFn send_fn)
    : session_id_(session_id)
    , code_(code)
    , state_(std::make_unique<GameState>(map))
    , send_(std::move(send_fn))
{}

std::optional<PlayerSide> Match::add_player(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    if (alpha_player_id_.empty()) {
        alpha_player_id_ = player_id;
        return PlayerSide::ALPHA;
    }
    if (beta_player_id_.empty()) {
        beta_player_id_ = player_id;
        return PlayerSide::BETA;
    }
    return std::nullopt;  // match is full
}

bool Match::is_full() const {
    return !alpha_player_id_.empty() && !beta_player_id_.empty();
}

void Match::set_player_name(const std::string& player_id, const std::string& name) {
    std::lock_guard lock(mutex_);
    PlayerSide side = side_of(player_id);
    state_->player_mut(side).name = name;
}

void Match::reconnect_player(const std::string& player_id) {
    std::lock_guard lock(mutex_);

    // Clear the disconnected flag for this player
    PlayerSide side = side_of(player_id);
    if (side == PlayerSide::ALPHA) alpha_disconnected_ = false;
    else beta_disconnected_ = false;

    std::cout << "[Match " << session_id_ << "] Player " << player_id
              << " (" << to_string(side) << ") RECONNECTED\n";

    if (!started_) {
        std::cout << "[Match " << session_id_ << "] Player " << player_id
                  << " reconnected, but match not started yet. Sending room info.\n";

        // Only resend the room code to the host (ALPHA)
        if (side == PlayerSide::ALPHA) {
            auto created_msg = protocol::make_server_message(
                protocol::ServerMsgType::MATCH_CREATED,
                session_id_,
                {{"code", code_}}
            );
            send_to(player_id, created_msg);
        }

        // Both players get the waiting status
        auto waiting_msg = protocol::make_server_message(
            protocol::ServerMsgType::WAITING_FOR_OPPONENT,
            session_id_,
            {{}}
        );
        send_to(player_id, waiting_msg);
        return;
    }

    // Notify the opponent that this player has reconnected
    if (started_) {
        auto reconnect_msg = protocol::make_server_message(
            protocol::ServerMsgType::OPPONENT_RECONNECTED,
            session_id_,
            {{"side", to_string(side)}}
        );
        std::string opponent_id = player_id_of(opposite(side));
        std::cout << "[Match " << session_id_ << "] Sending OPPONENT_RECONNECTED to " << opponent_id << "\n";
        send_to(opponent_id, reconnect_msg);
    }

    // Re-send MATCH_START so client has map context
    auto start_msg = protocol::make_server_message(
        protocol::ServerMsgType::MATCH_START,
        session_id_,
        {{"side", to_string(side)},
         {"map", protocol::serialize_map(state_->graph().map_def())}}
    );
    send_to(player_id, start_msg);

    // Send the current match state to the reconnecting player
    long long elapsed = time_since_turn_start();
    long long effective_limit = first_turn_grace_
        ? (TURN_DURATION_MS + STARTUP_GRACE_MS)
        : TURN_DURATION_MS;

    auto payload = protocol::serialize_match_state(session_id_, *state_, side, elapsed, effective_limit);
    auto state_msg = protocol::make_server_message(protocol::ServerMsgType::MATCH_STATE, session_id_, payload);
    send_to(player_id, state_msg);

    // Also resync the opponent with fresh state
    PlayerSide opp_side = opposite(side);
    auto opp_payload = protocol::serialize_match_state(session_id_, *state_, opp_side, elapsed, effective_limit);
    auto opp_msg = protocol::make_server_message(protocol::ServerMsgType::MATCH_STATE, session_id_, opp_payload);
    send_to(player_id_of(opp_side), opp_msg);

    std::cout << "[Match " << session_id_ << "] Player " << player_id << " reconnected and sent current state.\n";
}

void Match::start(unsigned int seed) {
    std::lock_guard lock(mutex_);
    if (started_) return;
    started_ = true;

    // Pick random distinct starting cities that are NOT adjacent.
    auto city_ids = state_->graph().all_city_ids();
    std::mt19937 rng(seed);

    // 1. Generate all valid non-adjacent pairs
    std::vector<std::pair<std::string, std::string>> valid_pairs;
    for (std::size_t i = 0; i < city_ids.size(); ++i) {
        for (std::size_t j = i + 1; j < city_ids.size(); ++j) {
            if (!state_->graph().are_adjacent(city_ids[i], city_ids[j])) {
                valid_pairs.push_back({city_ids[i], city_ids[j]});
            }
        }
    }

    std::string alpha_city, beta_city;
    if (!valid_pairs.empty()) {
        // 2. Pick one pair uniformly
        std::uniform_int_distribution<std::size_t> dist(0, valid_pairs.size() - 1);
        auto chosen_pair = valid_pairs[dist(rng)];

        // 3. Randomly assign Alpha/Beta to the two cities in the pair
        std::uniform_int_distribution<int> coin_flip(0, 1);
        if (coin_flip(rng) == 0) {
            alpha_city = chosen_pair.first;
            beta_city = chosen_pair.second;
        } else {
            alpha_city = chosen_pair.second;
            beta_city = chosen_pair.first;
        }
    } else {
        // Extremely degenerate map — every pair of cities is adjacent.
        // Fall back to picking any two cities randomly.
        std::shuffle(city_ids.begin(), city_ids.end(), rng);
        alpha_city  = city_ids[0];
        beta_city = city_ids[1];
    }

    state_->set_starting_cities(alpha_city, beta_city);

    // Randomly pick starting turn
    std::uniform_int_distribution<int> turn_flip(0, 1);
    PlayerSide starting_side = (turn_flip(rng) == 0) ? PlayerSide::ALPHA : PlayerSide::BETA;
    state_->set_starting_turn(starting_side);

    // Initialize turn timer
    turn_start_time_ = std::chrono::steady_clock::now();

    std::cout << "[Match " << session_id_ << "] Started: ALPHA=" << alpha_city
              << " BETA=" << beta_city << " STARTING_SIDE=" << to_string(starting_side) << "\n";

    // Send MATCH_START to each player with their assigned side
    {
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::MATCH_START,
            session_id_,
            {{"side", "ALPHA"},
             {"map", protocol::serialize_map(state_->graph().map_def())}}
        );
        std::cout << "[Match " << session_id_ << "] Sending MATCH_START to ALPHA (" 
                  << alpha_player_id_ << "): " << msg << "\n";
        send_to(alpha_player_id_, msg);
    }
    {
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::MATCH_START,
            session_id_,
            {{"side", "BETA"},
             {"map", protocol::serialize_map(state_->graph().map_def())}}
        );
        std::cout << "[Match " << session_id_ << "] Sending MATCH_START to BETA (" 
                  << beta_player_id_ << "): " << msg << "\n";
        send_to(beta_player_id_, msg);
    }

    // Send initial filtered state to each player
    broadcast_state();
}

void Match::handle_action(const std::string& player_id, const std::string& action,
                           const std::string& target_city, const std::string& ability_id) {
    std::lock_guard lock(mutex_);
    
    // Check for turn timeout before processing action.
    // If the active player is the one sending the action we still allow it
    // (the timeout check runs first, but we don't drop actions from the correct player).
    PlayerSide acting_side = side_of(player_id);
    bool timed_out = check_turn_timeout();
    if (timed_out && acting_side != state_->current_turn()) {
        // Wrong player's turn AND timed out — handle timeout and return.
        handle_turn_timeout();
        return;
    } else if (timed_out) {
        // Their turn timed out but they just sent an action — reset timer and continue
        // (generous: let the action through instead of silently dropping it).
        turn_start_time_ = std::chrono::steady_clock::now();
    }
    
    // If we're still in the startup grace period and the first player acts,
    // end the grace period and give them a fresh full turn.
    if (first_turn_grace_) {
        first_turn_grace_ = false;
        turn_start_time_ = std::chrono::steady_clock::now();
        std::cout << "[Match " << session_id_ << "] Grace period ended by first action from "
                  << to_string(acting_side) << "\n";
    }
    
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
    } else if (action == "CONTROL") {
        result = state_->control(side);
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
    
    // Determine if this action should be stealthy (suppress broadcast to opponent)
    bool skip_opponent = false;
    const auto& p = state_->player(side);
    if (p.encryption_unlocked) {
        // If encrypted, we hide specific actions from the opponent's network/timer
        // But we MUST broadcast the initial ENCRYPTION activation so they know we are hidden
        if (action == "ABILITY") {
            if (ability_id != "ENCRYPTION") {
                skip_opponent = true;
            }
        } else if (action == "STRIKE" && !result.game_over) {
            skip_opponent = true;
        }
    }

    if (!result.ok) {
        send_error(player_id, result.error);
        return;
    }

    // Diagnostic logging for action effect
    std::cout << "[Match " << session_id_ << "] Action " << action 
              << " for " << to_string(side) << " result: OK, has_cover=" 
              << (state_->player(side).has_cover ? "TRUE" : "FALSE") << "\n";

    // Reset timer on successful action
    turn_start_time_ = std::chrono::steady_clock::now();

    if (result.game_over) {
        // Send GAME_OVER to both players
        auto go_msg = protocol::make_server_message(
            protocol::ServerMsgType::GAME_OVER,
            session_id_,
            {{"winner", to_string(result.winner)},
             {"reason", result.game_over_reason}}
        );
        send_to(alpha_player_id_, go_msg);
        send_to(beta_player_id_, go_msg);
    } else {
        // Auto end turn if no actions remaining
        if (state_->player(side).actions_remaining <= 0) {
            std::cout << "[Match " << session_id_ << "] Auto-ending turn for " 
                      << to_string(side) << " (0 actions left)\n";
            state_->end_turn(side);
            // Reset timer for next player's turn
            turn_start_time_ = std::chrono::steady_clock::now();
            // Turn ending is NOT stealthy
            skip_opponent = false;
        }
    }

    broadcast_state(skip_opponent);
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

    // Reset timer for next player's turn
    turn_start_time_ = std::chrono::steady_clock::now();

    broadcast_state();
}

void Match::handle_abort(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    if (state_->is_game_over()) return;

    PlayerSide side = side_of(player_id);
    state_->abort(side);

    std::cout << "[Match " << session_id_ << "] Player " << player_id 
              << " (" << to_string(side) << ") aborted the match.\n";

    // Send GAME_OVER to both players
    auto go_msg = protocol::make_server_message(
        protocol::ServerMsgType::GAME_OVER,
        session_id_,
        {{"winner", to_string(state_->winner())},
         {"reason", state_->game_over_reason()}}
    );
    send_to(alpha_player_id_, go_msg);
    send_to(beta_player_id_, go_msg);

    broadcast_state();
}

void Match::remove_player(const std::string& player_id) {
    // Note: We no longer clear the ID here to allow for reconnection.
    // Instead, MatchManager calls handle_player_disconnect.
}

void Match::handle_player_disconnect(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    PlayerSide side = side_of(player_id);
    if (side == PlayerSide::ALPHA) alpha_disconnected_ = true;
    else beta_disconnected_ = true;

    std::cout << "[Match " << session_id_ << "] Player " << player_id 
              << " (" << to_string(side) << ") DISCONNECTED\n";

    if (started_) {
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::OPPONENT_DISCONNECTED,
            session_id_,
            {{"side", to_string(side)}}
        );
        std::string opponent_id = player_id_of(opposite(side));
        std::cout << "[Match " << session_id_ << "] Sending OPPONENT_DISCONNECTED to " << opponent_id << "\n";
        send_to(opponent_id, msg);
    }
}

void Match::handle_player_reconnect(const std::string& player_id) {
    // This method is intentionally NOT locking mutex_ because reconnect_player
    // already holds the lock and inlines the reconnect logic.
    // This public method remains for external calls (e.g. from AUTHENTICATE handler).
    std::lock_guard lock(mutex_);
    PlayerSide side = side_of(player_id);
    if (side == PlayerSide::ALPHA) alpha_disconnected_ = false;
    else beta_disconnected_ = false;

    std::cout << "[Match " << session_id_ << "] Player " << player_id
              << " (" << to_string(side) << ") RECONNECTED (external call)\n";

    if (started_) {
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::OPPONENT_RECONNECTED,
            session_id_,
            {{"side", to_string(side)}}
        );
        std::string opponent_id = player_id_of(opposite(side));
        std::cout << "[Match " << session_id_ << "] Sending OPPONENT_RECONNECTED to " << opponent_id << "\n";
        send_to(opponent_id, msg);
    }
}

void Match::check_for_timeout() {
    std::lock_guard lock(mutex_);
    if (started_ && !state_->is_game_over()) {
        if (check_turn_timeout()) {
            handle_turn_timeout();
        }
    }
}

bool Match::is_game_over() const {
    return state_ && state_->is_game_over();
}

bool Match::is_empty() const {
    std::lock_guard lock(mutex_);
    return alpha_player_id_.empty() && beta_player_id_.empty();
}

// ── Private helpers ──────────────────────────────────────────────────

PlayerSide Match::side_of(const std::string& player_id) const {
    if (player_id == alpha_player_id_) return PlayerSide::ALPHA;
    return PlayerSide::BETA;
}

std::string Match::player_id_of(PlayerSide side) const {
    return side == PlayerSide::ALPHA ? alpha_player_id_ : beta_player_id_;
}

void Match::broadcast_state(bool skip_opponent) {
    // Check for turn timeout before broadcasting state
    if (check_turn_timeout()) {
        handle_turn_timeout();
        return;
    }
    
    long long elapsed = time_since_turn_start();
    long long effective_limit = first_turn_grace_
        ? (TURN_DURATION_MS + STARTUP_GRACE_MS)
        : TURN_DURATION_MS;
    
    PlayerSide acting_side = state_->current_turn();
    
    if (!alpha_player_id_.empty()) {
        bool should_send = !skip_opponent || (acting_side == PlayerSide::ALPHA);
        if (should_send) {
            auto payload = protocol::serialize_match_state(session_id_, *state_, PlayerSide::ALPHA, elapsed, effective_limit);
            auto msg = protocol::make_server_message(protocol::ServerMsgType::MATCH_STATE, session_id_, payload);
            send_to(alpha_player_id_, msg);
        }
    }
    if (!beta_player_id_.empty()) {
        bool should_send = !skip_opponent || (acting_side == PlayerSide::BETA);
        if (should_send) {
            auto payload = protocol::serialize_match_state(session_id_, *state_, PlayerSide::BETA, elapsed, effective_limit);
            auto msg = protocol::make_server_message(protocol::ServerMsgType::MATCH_STATE, session_id_, payload);
            send_to(beta_player_id_, msg);
        }
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

long long Match::time_since_turn_start() const {
    auto now = std::chrono::steady_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        now - turn_start_time_
    );
    return elapsed.count();
}

void Match::handle_turn_timeout() {
    // This method is called when timeout is detected.
    // Assumes: lock is already held by caller.
    
    if (!started_ || state_->is_game_over()) {
        return;
    }

    PlayerSide expired_player = state_->current_turn();
    PlayerSide next_player = opposite(expired_player);
    
    // Grace period ends once any timeout fires (even if player never acted)
    first_turn_grace_ = false;
    
    // Forfeit remaining actions
    auto& player_data = state_->player_mut(expired_player);
    player_data.actions_remaining = 0;
    
    // Force end the turn (skip exploration bonus on timeout)
    state_->end_turn(expired_player, true);
    
    // Reset timer for next player's turn
    turn_start_time_ = std::chrono::steady_clock::now();
    
    std::cout << "[Match " << session_id_ << "] Turn timeout: " 
              << to_string(expired_player) << " forfeited remaining actions. "
              << "Control transferred to " << to_string(next_player) << ".\n";
    
    // Send TURN_CHANGE message to both players indicating timeout
    {
        auto msg = protocol::make_server_message(
            protocol::ServerMsgType::TURN_CHANGE,
            session_id_,
            {{"previousTurn", to_string(expired_player)},
             {"currentTurn", to_string(next_player)},
             {"reason", "timeout"}}
        );
        send_to(alpha_player_id_, msg);
        send_to(beta_player_id_, msg);
    }
    
    // Broadcast new state so clients see the updated board
    broadcast_state();
}

bool Match::check_turn_timeout() {
    if (!started_ || state_->is_game_over()) {
        return false;
    }

    long long elapsed = time_since_turn_start();
    
    // During the startup grace period, apply a longer effective duration
    // (TURN_DURATION_MS + STARTUP_GRACE_MS) so clients have time to load.
    long long effective_limit = first_turn_grace_
        ? (TURN_DURATION_MS + STARTUP_GRACE_MS)
        : TURN_DURATION_MS;
    return elapsed >= effective_limit;
}

} // namespace two_spies::game
