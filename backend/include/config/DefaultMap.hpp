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
  // Normalized coordinates (0.0 - 1.0) matching plain-map.png
  map.cities = {{"nyc", "New York City", 0.300, 0.320},
                {"havana", "Havana", 0.280, 0.490},
                {"rio", "Rio de Janeiro", 0.395, 0.650},
                {"london", "London", 0.500, 0.280},
                {"algiers", "Algiers", 0.500, 0.400},
                {"moscow", "Moscow", 0.600, 0.250},
                {"dar_es_salaam", "Dar es Salaam", 0.625, 0.620},
                {"tel-aviv", "Tel Aviv", 0.620, 0.380},
                {"dubai", "Dubai", 0.670, 0.440},
                {"bangalore", "Bangalore", 0.735, 0.495},
                {"singapore", "Singapore", 0.807, 0.555},
                {"beijing", "Beijing", 0.830, 0.390},
                {"tokyo", "Tokyo", 0.910, 0.400},
                {"sydney", "Sydney", 0.930, 0.770}};

  // ── Edges ────────────────────────────────────────────────────
  map.edges = {{"nyc", "havana"},
               {"havana", "rio"},
               {"nyc", "london"},
               {"london", "algiers"},
               {"algiers", "moscow"},
               {"moscow", "beijing"},
               {"beijing", "tokyo"},
               {"tokyo", "sydney"},
               {"sydney", "singapore"},
               {"singapore", "bangalore"},
               {"beijing", "dubai"},
               {"dubai", "tel-aviv"},
               {"tel-aviv", "dar_es_salaam"},
               {"tel-aviv", "london"},
               {"dar_es_salaam", "bangalore"},
               {"singapore", "tokyo"},
               {"dubai", "bangalore"},
               {"nyc", "rio"},
               {"rio", "dar_es_salaam"},
               {"london", "moscow"},
               {"nyc", "algiers"},
               {"rio", "algiers"},
               {"dar_es_salaam", "sydney"}};

  return map;
}

} // namespace two_spies::config
