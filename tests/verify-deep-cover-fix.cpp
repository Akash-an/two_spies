/**
 * Standalone verification of Deep Cover bug fix
 * Bug: Deep Cover was expiring at end of player's turn instead of beginning of next turn
 * Fix: Deep Cover now persists through opponent's turn
 */

#include "game/GameState.hpp"
#include "backend/tests/test_map.hpp"
#include <iostream>
#include <cassert>

using namespace two_spies::game;

int main() {
    std::cout << "\n=== Deep Cover Persistence Bug Fix Verification ===\n\n";
    
    GameState gs(two_spies::tests::test_map());
    gs.set_starting_cities("london", "moscow");
    
    auto& red = gs.player_mut(PlayerSide::RED);
    auto& blue = gs.player_mut(PlayerSide::BLUE);
    
    red.intel = 30;
    blue.intel = 10;
    
    std::cout << "Turn 1 (RED):\n";
    std::cout << "  RED uses Deep Cover...\n";
    auto r_dc = gs.use_ability(PlayerSide::RED, AbilityId::DEEP_COVER);
    assert(r_dc.ok);
    assert(red.deep_cover_active);
    std::cout << "  ✓ Deep Cover active: " << (red.deep_cover_active ? "YES" : "NO") << "\n";
    
    std::cout << "  RED ends turn...\n";
    gs.end_turn(PlayerSide::RED);
    std::cout << "  ✓ Deep Cover persists after RED ends turn: " << (red.deep_cover_active ? "YES" : "NO") << "\n";
    assert(red.deep_cover_active);  // BUG FIX: Should still be active!
    
    std::cout << "\nTurn 2 (BLUE):\n";
    std::cout << "  BLUE attempts Locate on RED...\n";
    auto r_loc = gs.use_ability(PlayerSide::BLUE, AbilityId::LOCATE);
    assert(r_loc.ok);
    std::cout << "  ✓ Deep Cover still active during opponent's turn: " << (red.deep_cover_active ? "YES" : "NO") << "\n";
    assert(red.deep_cover_active);  // Should still be active
    std::cout << "  ✓ Locate failed to reveal RED (known_opponent_city empty): " 
              << (blue.known_opponent_city.empty() ? "YES" : "NO") << "\n";
    assert(blue.known_opponent_city.empty());  // Locate should fail
    
    std::cout << "  BLUE ends turn...\n";
    gs.end_turn(PlayerSide::BLUE);
    std::cout << "  ✓ Deep Cover cleared at beginning of RED's next turn: " 
              << (!red.deep_cover_active ? "YES" : "NO") << "\n";
    assert(!red.deep_cover_active);  // NOW it's cleared
    
    std::cout << "\nTurn 3 (RED - Deep Cover cleared):\n";
    std::cout << "  RED ends turn...\n";
    gs.end_turn(PlayerSide::RED);
    
    std::cout << "\nTurn 4 (BLUE - Locate should now work):\n";
    std::cout << "  BLUE attempts Locate on RED (no Deep Cover this time)...\n";
    blue.intel = 10;  // Restore Intel
    auto r_loc2 = gs.use_ability(PlayerSide::BLUE, AbilityId::LOCATE);
    assert(r_loc2.ok);
    std::cout << "  ✓ Locate succeeded and revealed RED: " 
              << (!blue.known_opponent_city.empty() ? "YES" : "NO") << "\n";
    assert(blue.known_opponent_city == "london");  // Should now be revealed
    std::cout << "  ✓ RED's location: " << blue.known_opponent_city << "\n";
    
    std::cout << "\n=== ✓ BUG FIX VERIFIED ===\n";
    std::cout << "Deep Cover now correctly persists through opponent's turn\n";
    std::cout << "and clears at the beginning of player's next turn.\n\n";
    
    return 0;
}
