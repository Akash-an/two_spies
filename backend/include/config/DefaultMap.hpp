#pragma once

#include "game/CityGraph.hpp"

namespace two_spies::config {

/**
 * Default global Aegis Terminal map — mirrors the tactical display aesthetic.
 * Single source of truth for the server's map data. In a production system this
 * would be loaded from an external JSON file; for now it's compiled in.
 */
inline game::MapDef default_map() {
    game::MapDef map;

    // ── Cities ───────────────────────────────────────────────────
    // Normalized coordinates (0.0 - 1.0) matching global-map-bg.png
    map.cities = {
        {"nyc",          "New York City", 0.294, 0.273},
        {"havana",       "Havana",        0.271, 0.371},
        {"buenos_aires", "Buenos Aires",  0.338, 0.692},
        {"london",       "London",        0.499, 0.214},
        {"berlin",       "Berlin",        0.537, 0.208},
        {"moscow",       "Moscow",        0.604, 0.190},
        {"cairo",        "Cairo",         0.586, 0.333},
        {"tel-aviv",     "Tel Aviv",      0.596, 0.322},
        {"dubai",        "Dubai",         0.653, 0.360},
        {"bangalore",    "Bangalore",     0.715, 0.428},
        {"singapore",    "Singapore",     0.788, 0.492},
        {"beijing",      "Beijing",       0.823, 0.278},
        {"tokyo",        "Tokyo",         0.887, 0.302},
        {"sydney",       "Sydney",        0.920, 0.687}
    };

    // ── Edges ────────────────────────────────────────────────────
    map.edges = {
        {"nyc",          "havana"},
        {"havana",       "buenos_aires"},
        {"nyc",          "london"},
        {"london",       "berlin"},
        {"berlin",       "moscow"},
        {"moscow",       "beijing"},
        {"beijing",      "tokyo"},
        {"tokyo",        "sydney"},
        {"sydney",       "singapore"},
        {"singapore",    "bangalore"},
        {"bangalore",    "dubai"},
        {"dubai",        "tel-aviv"},
        {"tel-aviv",     "cairo"},
        {"cairo",        "london"},
        {"cairo",        "dubai"},
        {"singapore",    "tokyo"},
        {"beijing",      "bangalore"},
        {"nyc",          "buenos_aires"}
    };

    return map;
}

} // namespace two_spies::config
