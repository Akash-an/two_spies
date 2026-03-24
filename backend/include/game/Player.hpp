#pragma once
#include <string>
#include <vector>
#include <unordered_set>
#include <cstdint>

namespace two_spies::game {

/// Player identifier / team colour.
enum class PlayerSide { RED, BLUE };

inline const char* to_string(PlayerSide s) {
    return s == PlayerSide::RED ? "RED" : "BLUE";
}

inline PlayerSide opposite(PlayerSide s) {
    return s == PlayerSide::RED ? PlayerSide::BLUE : PlayerSide::RED;
}

/// Available abilities (cost config defined separately).
enum class AbilityId {
    DEEP_COVER,
    ENCRYPTION,
    LOCATE,
    STRIKE_REPORT,
    RAPID_RECON,
    PREP_MISSION,
};

inline const char* to_string(AbilityId a) {
    switch (a) {
        case AbilityId::DEEP_COVER:    return "DEEP_COVER";
        case AbilityId::ENCRYPTION:    return "ENCRYPTION";
        case AbilityId::LOCATE:        return "LOCATE";
        case AbilityId::STRIKE_REPORT: return "STRIKE_REPORT";
        case AbilityId::RAPID_RECON:   return "RAPID_RECON";
        case AbilityId::PREP_MISSION:  return "PREP_MISSION";
    }
    return "UNKNOWN";
}

/// Internal state tracked per player.
struct PlayerData {
    PlayerSide side;
    std::string name;  // display name chosen by the player
    std::string current_city;
    std::string starting_city;  // remembers where this player started
    int intel = 2;
    int actions_remaining = 2;
    bool has_cover = false;
    std::string known_opponent_city;  // empty = unknown
    std::vector<AbilityId> abilities = { AbilityId::LOCATE, AbilityId::DEEP_COVER };
    
    // Opponent action notifications - cleared each turn
    bool opponent_used_strike = false;  // opponent attempted a strike this turn
    bool opponent_used_locate = false;  // opponent used locate ability this turn
    bool opponent_used_deep_cover = false;  // opponent used deep cover ability this turn

    // Player action feedback flags
    bool locate_blocked_by_deep_cover = false;  // this player's Locate was blocked by opponent's Deep Cover

    // Deep Cover ability state - cleared at the beginning of the player's next turn
    bool deep_cover_active = false;  // active until beginning of this player's next turn
    int deep_cover_used_on_turn = -1;  // tracks which turn Deep Cover was used for expiration logic

    // Tracks whether this player has ever moved away from their starting city
    bool has_moved_from_start = false;

    // Tracks which cities have been visited for exploration bonus calculation
    std::unordered_set<std::string> visited_cities;
    
    // Tracks if player moved to a new city this turn (for +4 Intel at end of turn)
    bool moved_to_new_city_this_turn = false;
};

} // namespace two_spies::game
