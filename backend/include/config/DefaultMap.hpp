#pragma once

#include "game/CityGraph.hpp"

namespace two_spies::config {

/**
 * Default Cold War Europe map — mirrors frontend/src/game/config/DefaultMap.ts.
 * Single source of truth for the server's map data. In a production system this
 * would be loaded from an external JSON file; for now it's compiled in.
 */
inline game::MapDef default_map() {
    game::MapDef map;

    // ── Cities ───────────────────────────────────────────────────
    map.cities = {
        // Northern Europe
        {"london",     "London",     0.22, 0.28, true,  false},
        {"paris",      "Paris",      0.30, 0.42, false, false},
        {"amsterdam",  "Amsterdam",  0.35, 0.26, false, false},
        {"berlin",     "Berlin",     0.48, 0.28, true,  false},
        {"copenhagen", "Copenhagen", 0.44, 0.17, false, false},

        // Central Europe
        {"zurich",     "Zurich",     0.38, 0.48, false, false},
        {"vienna",     "Vienna",     0.52, 0.44, false, true},
        {"prague",     "Prague",     0.50, 0.36, false, false},

        // Southern Europe
        {"rome",       "Rome",       0.44, 0.62, false, false},
        {"madrid",     "Madrid",     0.15, 0.62, true,  false},
        {"istanbul",   "Istanbul",   0.72, 0.58, false, true},

        // Eastern Europe
        {"warsaw",     "Warsaw",     0.58, 0.28, false, false},
        {"moscow",     "Moscow",     0.78, 0.20, true,  false},
        {"budapest",   "Budapest",   0.56, 0.48, false, false},
        {"bucharest",  "Bucharest",  0.64, 0.52, false, false},

        // Scandinavia
        {"stockholm",  "Stockholm",  0.50, 0.10, false, true},
    };

    // ── Edges ────────────────────────────────────────────────────
    map.edges = {
        // NW cluster
        {"london",    "paris"},
        {"london",    "amsterdam"},
        {"paris",     "amsterdam"},
        {"paris",     "zurich"},
        {"paris",     "madrid"},
        {"amsterdam", "berlin"},
        {"amsterdam", "copenhagen"},

        // Central
        {"berlin",    "copenhagen"},
        {"berlin",    "prague"},
        {"berlin",    "warsaw"},
        {"prague",    "vienna"},
        {"prague",    "zurich"},
        {"zurich",    "rome"},
        {"vienna",    "budapest"},
        {"vienna",    "zurich"},

        // South
        {"rome",      "madrid"},
        {"rome",      "budapest"},

        // East
        {"warsaw",    "moscow"},
        {"warsaw",    "prague"},
        {"budapest",  "bucharest"},
        {"bucharest", "istanbul"},
        {"budapest",  "istanbul"},
        {"moscow",    "warsaw"},

        // Scandinavia links
        {"copenhagen", "stockholm"},
        {"stockholm",  "moscow"},
    };

    return map;
}

} // namespace two_spies::config
