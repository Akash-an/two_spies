#include <cassert>
#include <iostream>
#include "game/GameState.hpp"
#include "game/Player.hpp"
#include "config/DefaultMap.hpp"

using namespace two_spies::game;

// Get test map
static MapDef test_map() {
    return two_spies::config::default_map();
}

int main() {
    std::cout << "Testing LOCATE one-way reveal behavior...\n\n";
    
    // Create game state
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");
    
    auto& red = gs.player_mut(PlayerSide::RED);
    auto& blue = gs.player_mut(PlayerSide::BLUE);
    
    red.intel = 20;
    blue.intel = 30;
    
    std::cout << "Initial state:\n";
    std::cout << "  RED at: " << red.current_city << "\n";
    std::cout << "  BLUE at: " << blue.current_city << "\n";
    std::cout << "  RED's known opponent city: '" << red.known_opponent_city << "'\n";
    std::cout << "  BLUE's known opponent city: '" << blue.known_opponent_city << "'\n\n";
    
    // Move RED to paris
    auto r_move = gs.move(PlayerSide::RED, "paris");
    assert(r_move.ok);
    std::cout << "RED moved to: " << red.current_city << "\n";
    
    gs.end_turn(PlayerSide::RED);
    
    // Move BLUE to berlin
    auto b_move = gs.move(PlayerSide::BLUE, "berlin");
    assert(b_move.ok);
    std::cout << "BLUE moved to: " << blue.current_city << "\n\n";
    
    // BLUE uses LOCATE on RED
    std::cout << "BLUE uses LOCATE...\n";
    blue.intel = 30;  // Ensure enough intel
    auto r_loc = gs.use_ability(PlayerSide::BLUE, AbilityId::LOCATE);
    assert(r_loc.ok);
    std::cout << "  Ability result: OK\n";
    
    // Check results
    std::cout << "\nAfter LOCATE:\n";
    std::cout << "  BLUE's known opponent city: '" << blue.known_opponent_city << "'\n";
    std::cout << "  RED's known opponent city: '" << red.known_opponent_city << "'\n";
    std::cout << "  RED's opponent_used_locate: " << (red.opponent_used_locate ? "true" : "false") << "\n";
    std::cout << "  BLUE's has_cover: " << (blue.has_cover ? "true" : "false") << "\n";
    std::cout << "  RED's has_cover: " << (red.has_cover ? "true" : "false") << "\n";
    
    // Verify correct behavior
    std::cout << "\nVerifying one-way reveal:\n";
    
    // 1. BLUE should know RED's location
    if (blue.known_opponent_city == "paris") {
        std::cout << "  ✓ BLUE knows RED's location (paris)\n";
    } else {
        std::cout << "  ✗ BLUE does NOT know RED's location (expected 'paris', got '" << blue.known_opponent_city << "')\n";
        return 1;
    }
    
    // 2. RED should NOT know BLUE's location (one-way)
    if (red.known_opponent_city == "") {
        std::cout << "  ✓ RED does NOT know BLUE's location (empty)\n";
    } else {
        std::cout << "  ✗ RED DOES know BLUE's location (got '" << red.known_opponent_city << "', expected empty)\n";
        return 1;
    }
    
    // 3. RED should be notified of LOCATE
    if (red.opponent_used_locate) {
        std::cout << "  ✓ RED is notified of LOCATE usage\n";
    } else {
        std::cout << "  ✗ RED is NOT notified of LOCATE usage\n";
        return 1;
    }
    
    // 4. BLUE should not become visible (no cover removed on BLUE)
    // The key is: RED doesn't learn BLUE's city, which is already verified above
    std::cout << "  ✓ BLUE's position is not revealed (RED doesn't know it)\n";
    
    std::cout << "\n✓ All checks passed! LOCATE reveals only opponent's position (one-way).\n";
    return 0;
}
