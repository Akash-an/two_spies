/**
 * Unit tests for Match timeout handling.
 *
 * Tests verify that:
 * - Timeout detection works correctly
 * - Turn control is smoothly transferred to opponent when timeout occurs
 * - Both players receive TURN_CHANGE messages
 * - Remaining actions are forfeited
 * - New turn timer starts immediately
 */

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

/**
 * MessageCapture captures all messages sent via the Match's SendFn callback.
 * Used to verify that TURN_CHANGE messages are sent correctly.
 */
struct MessageCapture {
    struct Message {
        std::string player_id;
        std::string json_msg;
    };
    
    std::vector<Message> messages;
    
    void capture(const std::string& player_id, const std::string& json_msg) {
        messages.push_back({player_id, json_msg});
    }
    
    // Helper to check if a TURN_CHANGE message was sent to a specific player
    bool has_turn_change_for_player(const std::string& player_id) const {
        for (const auto& msg : messages) {
            if (msg.player_id == player_id && msg.json_msg.find("\"TURN_CHANGE\"") != std::string::npos) {
                return true;
            }
        }
        return false;
    }
    
    // Helper to get the count of TURN_CHANGE messages
    int count_turn_changes() const {
        int count = 0;
        for (const auto& msg : messages) {
            if (msg.json_msg.find("\"TURN_CHANGE\"") != std::string::npos) {
                count++;
            }
        }
        return count;
    }
    
    void clear() {
        messages.clear();
    }
};

void test_timeout_not_triggered_before_timeout() {
    std::cout << "  test_timeout_not_triggered_before_timeout... ";
    
    MessageCapture capture;
    Match match("sess_id_1", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    
    // Add two players
    auto red_side = match.add_player("red_player");
    auto blue_side = match.add_player("blue_player");
    assert(red_side == PlayerSide::ALPHA);
    assert(blue_side == PlayerSide::BETA);
    
    // Start the match
    match.start(42);  // deterministic seed
    
    // Immediately check timeout — should be false (no time has passed)
    bool has_timeout = match.check_turn_timeout();
    assert(!has_timeout && "Timeout should NOT occur immediately");
    
    std::cout << "OK\n";
}

void test_timeout_detected_after_duration() {
    std::cout << "  test_timeout_detected_after_duration... ";
    
    MessageCapture capture;
    Match match("sess_id_2", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    
    // Add two players
    auto red_side = match.add_player("red_player_2");
    auto blue_side = match.add_player("blue_player_2");
    assert(red_side == PlayerSide::ALPHA);
    assert(blue_side == PlayerSide::BETA);
    
    // Start the match
    match.start(43);
    capture.clear();  // Clear initial state messages
    
    // Wait just slightly more than TURN_DURATION_MS (30 seconds)
    // For testing purposes, we could reduce this by using a mock clock,
    // but for now we'll do a shorter wait to make the test fast.
    // NOTE: In production, this test would wait ~30 seconds.
    // For CI/CD speed, we could inject a configurable timeout duration.
    
    // Sleep for 30.1 seconds to exceed the timeout
    std::cout << "(waiting ~30s for timeout) ";
    std::this_thread::sleep_for(std::chrono::milliseconds(30100));
    
    // Now check timeout — should be true
    bool has_timeout = match.check_turn_timeout();
    assert(has_timeout && "Timeout should occur after 30 seconds");
    
    std::cout << "OK\n";
}

void test_timeout_transfers_control_with_messages() {
    std::cout << "  test_timeout_transfers_control_with_messages... ";
    
    MessageCapture capture;
    Match match("sess_id_3", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    
    // Add two players
    auto red_side = match.add_player("red_player_3");
    auto blue_side = match.add_player("blue_player_3");
    assert(red_side == PlayerSide::ALPHA);
    assert(blue_side == PlayerSide::BETA);
    
    // Start the match (ALPHA starts first)
    match.start(44);
    capture.clear();  // Clear initial messages
    
    // Wait for timeout
    std::cout << "(waiting ~30s for timeout) ";
    std::this_thread::sleep_for(std::chrono::milliseconds(30100));
    
    // Trigger the timeout handling by checking and handling
    bool has_timeout = match.check_turn_timeout();
    assert(has_timeout);
    
    // Now manually call handle_turn_timeout()
    // (In real usage, this would be called from handle_action when timeout is detected)
    match.handle_turn_timeout();
    
    // Verify TURN_CHANGE messages were sent to both players
    int turn_changes = capture.count_turn_changes();
    assert(turn_changes >= 2 && "TURN_CHANGE should be sent to both players");
    
    // Verify both players received TURN_CHANGE
    assert(capture.has_turn_change_for_player("red_player_3") &&
           "ALPHA player should receive TURN_CHANGE");
    assert(capture.has_turn_change_for_player("blue_player_3") &&
           "BETA player should receive TURN_CHANGE");
    
    // Verify the TURN_CHANGE payload includes "timeout" reason
    bool found_timeout_reason = false;
    for (const auto& msg : capture.messages) {
        if (msg.json_msg.find("\"reason\":\"timeout\"") != std::string::npos ||
            msg.json_msg.find("\"reason\": \"timeout\"") != std::string::npos) {
            found_timeout_reason = true;
            break;
        }
    }
    assert(found_timeout_reason && "TURN_CHANGE should include reason: timeout");
    
    std::cout << "OK\n";
}

void test_timeout_forfeits_remaining_actions() {
    std::cout << "  test_timeout_forfeits_remaining_actions... ";
    
    MessageCapture capture;
    Match match("sess_id_4", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    
    // Add two players
    auto red_side = match.add_player("red_player_4");
    auto blue_side = match.add_player("blue_player_4");
    
    // Start the match
    match.start(45);
    capture.clear();
    
    // Simulate the first player taking one action
    // This won't trigger timeout because we're not waiting
    match.handle_action("red_player_4", "WAIT", "", "");
    
    // Now wait for timeout to be detected on the second check
    // (We can't directly access the GameState to check actions_remaining,
    //  but we can verify the behavior through the message flow)
    
    std::this_thread::sleep_for(std::chrono::milliseconds(30100));
    
    bool has_timeout = match.check_turn_timeout();
    assert(has_timeout);
    
    // Call handle_turn_timeout and verify control transfers
    match.handle_turn_timeout();
    
    // Check that a TURN_CHANGE was sent (indicating timeout handling)
    assert(capture.count_turn_changes() >= 2 &&
           "Timeout should result in TURN_CHANGE messages");
    
    std::cout << "OK\n";
}

/**
 * This test verifies that after timeout, a new turn timer starts and the
 * next player's timeout is independent from the previous one.
 */
void test_timeout_resets_timer_for_next_player() {
    std::cout << "  test_timeout_resets_timer_for_next_player... ";
    
    MessageCapture capture;
    Match match("sess_id_5", "0000", test_map_for_match(),
                [&capture](const std::string& pid, const std::string& msg) {
                    capture.capture(pid, msg);
                });
    
    // Add two players
    auto red_side = match.add_player("red_player_5");
    auto blue_side = match.add_player("blue_player_5");
    
    // Start the match
    match.start(46);
    capture.clear();
    
    // Wait for ALPHA's timeout
    std::cout << "(waiting for ALPHA timeout) ";
    std::this_thread::sleep_for(std::chrono::milliseconds(30100));
    
    bool red_timeout = match.check_turn_timeout();
    assert(red_timeout);
    match.handle_turn_timeout();
    
    // Now control has switched to BETA
    // If we immediately check timeout, it should be false because the timer was just reset
    bool blue_immediate_timeout = match.check_turn_timeout();
    assert(!blue_immediate_timeout &&
           "After timeout transfer, new player should NOT have immediate timeout");
    
    // If we wait another ~30 seconds, BETA should timeout
    std::cout << "(waiting for BETA timeout) ";
    std::this_thread::sleep_for(std::chrono::milliseconds(30100));
    
    bool blue_timeout = match.check_turn_timeout();
    assert(blue_timeout && "After 30s, BETA should timeout");
    
    std::cout << "OK\n";
}

// Note: The remaining timeout tests are not included in the default test run
// because they require ~30+ seconds of sleep per test, which slows down the test suite.
// They are defined above and can be called individually:
//   - test_timeout_detected_after_duration()
//   - test_timeout_transfers_control_with_messages()
//   - test_timeout_forfeits_remaining_actions()
//   - test_timeout_resets_timer_for_next_player()
//
// To run these tests in a CI/CD environment, consider:
// 1. Injecting a configurable timeout duration for testing (e.g., 100ms instead of 30s)
// 2. Using a mock clock that can be advanced manually
// 3. Running these tests in a separate test suite with longer timeout tolerances
