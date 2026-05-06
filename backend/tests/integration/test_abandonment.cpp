#include "game/Match.hpp"
#include "../test_map.hpp"
#include <cassert>
#include <iostream>
#include <string>
#include <chrono>
#include <thread>
#include <vector>

using namespace two_spies::game;

static MapDef test_map_for_match() {
    return two_spies::tests::test_map();
}

struct MessageCapture {
    struct Message {
        std::string player_id;
        std::string json_msg;
    };
    
    std::vector<Message> messages;
    
    void capture(const std::string& player_id, const std::string& json_msg) {
        messages.push_back({player_id, json_msg});
    }
    
    bool has_game_over_for_reason(const std::string& reason_part) const {
        for (const auto& msg : messages) {
            if (msg.json_msg.find("\"GAME_OVER\"") != std::string::npos && 
                msg.json_msg.find(reason_part) != std::string::npos) {
                return true;
            }
        }
        return false;
    }

    int count_turn_changes() const {
        int count = 0;
        for (const auto& msg : messages) {
            if (msg.json_msg.find("\"TURN_CHANGE\"") != std::string::npos) {
                count++;
            }
        }
        return count;
    }
};

void test_disconnect_timeout_triggers_forfeit() {
    std::cout << "  test_disconnect_timeout_triggers_forfeit... ";
    
    MessageCapture capture;
    Match match("abandon_1", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    
    match.add_player("alpha_p");
    match.add_player("beta_p");
    match.start(1);
    
    // Alpha disconnects
    match.handle_player_disconnect("alpha_p");
    
    std::cout << "(waiting 60s) " << std::flush;
    std::this_thread::sleep_for(std::chrono::milliseconds(60500));
    
    match.check_for_timeout();
    
    assert(match.is_game_over());
    assert(capture.has_game_over_for_reason("disconnected for more than 1 minute"));
    
    std::cout << "OK\n";
}

void test_consecutive_timeouts_trigger_forfeit() {
    std::cout << "  test_consecutive_timeouts_trigger_forfeit... ";
    
    MessageCapture capture;
    Match match("abandon_2", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    
    match.add_player("alpha_p");
    match.add_player("beta_p");
    match.start(2); 
    
    // We'll just keep timing out until someone hits 3.
    // Each timeout switches the turn.
    // 1. Alpha -> Beta
    // 2. Beta -> Alpha
    // 3. Alpha -> Beta
    // 4. Beta -> Alpha
    // 5. Alpha -> Game Over
    
    for (int i = 0; i < 5; ++i) {
        std::cout << "(timeout " << (i+1) << "/5) " << std::flush;
        std::this_thread::sleep_for(std::chrono::milliseconds(30500));
        match.check_for_timeout();
    }
    
    assert(match.is_game_over());
    assert(capture.has_game_over_for_reason("missed 3 turns in a row"));
    
    std::cout << "OK\n";
}

void test_timeout_detected_after_duration() {
    std::cout << "  test_timeout_detected_after_duration... ";
    MessageCapture capture;
    Match match("slow_1", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    match.add_player("p1");
    match.add_player("p2");
    match.start(42);
    
    std::cout << "(waiting 30s) " << std::flush;
    std::this_thread::sleep_for(std::chrono::milliseconds(30100));
    
    bool has_timeout = match.check_turn_timeout();
    assert(has_timeout);
    std::cout << "OK\n";
}

int main() {
    std::cout << "Running Match Abandonment Integration Tests...\n";
    std::cout << "Note: These tests are SLOW (take ~4 minutes total).\n";
    
    test_timeout_detected_after_duration();
    test_disconnect_timeout_triggers_forfeit();
    test_consecutive_timeouts_trigger_forfeit();
    
    std::cout << "\nAll abandonment tests passed!\n";
    return 0;
}
