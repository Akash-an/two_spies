#include "game/GameState.hpp"
#include <cassert>
#include <iostream>
#include <string>
#include <unordered_set>
#include <vector>

using namespace two_spies::game;

static MapDef test_map() {
    MapDef map;
    map.cities = {
        {"city1", "City 1", 0, 0},
        {"city2", "City 2", 1, 1},
        {"city3", "City 3", 2, 2}
    };
    map.edges = {
        {"city1", "city2"},
        {"city2", "city3"}
    };
    return map;
}

void test_powerup_no_stacking() {
    std::cout << "  test_powerup_no_stacking... ";
    
    // We'll run many simulations to increase the chance of collisions if they were allowed
    for (int sim = 0; sim < 100; ++sim) {
        GameState gs(test_map());
        gs.set_starting_cities("city1", "city3");
        
        // Perform many actions to trigger multiple spawns
        for (int i = 0; i < 50; ++i) {
            // Move back and forth to keep the game going
            if (gs.current_turn() == PlayerSide::ALPHA) {
                if (gs.player(PlayerSide::ALPHA).current_city == "city1")
                    gs.move(PlayerSide::ALPHA, "city2");
                else
                    gs.move(PlayerSide::ALPHA, "city1");
                
                if (gs.player(PlayerSide::ALPHA).actions_remaining == 0)
                    gs.end_turn(PlayerSide::ALPHA);
            } else {
                if (gs.player(PlayerSide::BETA).current_city == "city3")
                    gs.move(PlayerSide::BETA, "city2");
                else
                    gs.move(PlayerSide::BETA, "city3");
                
                if (gs.player(PlayerSide::BETA).actions_remaining == 0)
                    gs.end_turn(PlayerSide::BETA);
            }
            
            // After each action, check for collisions
            const auto& intel = gs.intel_popups();
            const auto& actions = gs.action_popups();
            
            std::unordered_set<std::string> occupied_cities;
            
            for (const auto& p : intel) {
                // Check if this city already has an Intel popup (self-collision)
                assert(occupied_cities.find(p.city_id) == occupied_cities.end());
                occupied_cities.insert(p.city_id);
            }
            
            for (const auto& p : actions) {
                // Check if this city already has an Intel or Action popup (cross-collision)
                assert(occupied_cities.find(p.city_id) == occupied_cities.end());
                occupied_cities.insert(p.city_id);
            }
        }
    }
    
    std::cout << "OK\n";
}

// test_powerup_spawn.cpp - just the test function
