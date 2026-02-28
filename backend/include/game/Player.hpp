#pragma once
#include <string>
#include <vector>
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
    int intel = 2;
    int actions_remaining = 2;
    bool has_cover = false;
    std::string known_opponent_city;  // empty = unknown
    std::vector<AbilityId> abilities = { AbilityId::LOCATE, AbilityId::DEEP_COVER };
};

} // namespace two_spies::game
