/**
 * Unit tests for Match timeout handling (Fast tests only).
 *
 * Slow tests (sleeping for 30s+) are moved to integration tests.
 */

#include "game/Match.hpp"
#include "../test_map.hpp"
#include <cassert>
#include <iostream>
#include <string>
#include <chrono>
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
};

void test_timeout_not_triggered_before_timeout() {
    std::cout << "  test_timeout_not_triggered_before_timeout... ";
    
    MessageCapture capture;
    Match match("sess_id_1", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    
    match.add_player("red_player");
    match.add_player("blue_player");
    match.start(42);
    
    bool has_timeout = match.check_turn_timeout();
    assert(!has_timeout && "Timeout should NOT occur immediately");
    
    std::cout << "OK\n";
}
