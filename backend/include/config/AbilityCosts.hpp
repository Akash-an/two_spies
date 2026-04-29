#pragma once

#include "game/Player.hpp"
#include <unordered_map>

namespace two_spies::config {

/**
 * AbilityCosts — centralized Intel cost configuration for all abilities.
 *
 * By storing costs in a single location, we can easily adjust balance without
 * changing game logic. The use_ability() method consults this config before
 * allowing ability usage.
 */

inline int get_ability_cost(game::AbilityId ability) {
    static const std::unordered_map<int, int> costs = {
        {static_cast<int>(game::AbilityId::DEEP_COVER), 20},    // Deep Cover costs 20 Intel
        {static_cast<int>(game::AbilityId::ENCRYPTION), 25},   // Encryption costs 25 Intel (permanent unlock)
        {static_cast<int>(game::AbilityId::LOCATE), 10},       // Locate costs 10 Intel
        {static_cast<int>(game::AbilityId::STRIKE_REPORT), 10}, // Strike Report costs 10 Intel (permanent unlock)
        {static_cast<int>(game::AbilityId::RAPID_RECON), 40},  // Rapid Recon costs 40 Intel (permanent unlock)
        {static_cast<int>(game::AbilityId::PREP_MISSION), 40}, // Prep Mission costs 40 Intel (per-use)
    };
    
    auto it = costs.find(static_cast<int>(ability));
    if (it != costs.end()) {
        return it->second;
    }
    return 0; // Default: no cost (should not happen with enum range)
}

} // namespace two_spies::config
