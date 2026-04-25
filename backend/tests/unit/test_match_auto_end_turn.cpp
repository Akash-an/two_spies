#include "game/Match.hpp"
#include "../test_map.hpp"
#include <cassert>
#include <iostream>
#include <string>

using namespace two_spies::game;

void test_match_auto_end_turn() {
    std::cout << "  test_match_auto_end_turn... ";
    
    // Setup match with test map
    Match match("sess_auto_end", two_spies::tests::test_map(), [](const std::string&, const std::string&){});
    
    match.add_player("red");
    match.add_player("blue");
    match.start(123);
    
    // RED turn starts with 2 actions
    assert(match.state().current_turn() == PlayerSide::RED);
    assert(match.state().player(PlayerSide::RED).actions_remaining == 2);
    
    // RED takes 1st action (WAIT)
    match.handle_action("red", "WAIT", "", "");
    assert(match.state().current_turn() == PlayerSide::RED);
    assert(match.state().player(PlayerSide::RED).actions_remaining == 1);
    
    // RED takes 2nd action (WAIT) -> should auto-end turn
    match.handle_action("red", "WAIT", "", "");
    
    // Turn should now be BLUE's
    assert(match.state().current_turn() == PlayerSide::BLUE);
    assert(match.state().player(PlayerSide::BLUE).actions_remaining == 2);
    assert(match.state().player(PlayerSide::RED).actions_remaining == 0);
    
    std::cout << "OK\n";
}

// Add to a static initializer or just call from a main if we had one.
// Since the glob will pick this up, we need a way to run it.
// I'll add it to the bottom of the file in a constructor-based registration if possible,
// but the current setup seems to just link all .cpp files and they likely have their own main or are called by a central one.
// Wait, if GLOB picks up multiple files with main(), it will fail.
// Let's check if there's a main() in other files.
