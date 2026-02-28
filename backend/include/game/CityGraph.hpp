#pragma once
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>

namespace two_spies::game {

struct CityDef {
    std::string id;
    std::string name;
    double x = 0.0;           // normalised 0–1
    double y = 0.0;
    bool   is_bonus  = false;  // bonus Intel city
    bool   is_pickup = false;  // pickup city
};

struct EdgeDef {
    std::string from;
    std::string to;
};

struct MapDef {
    std::vector<CityDef> cities;
    std::vector<EdgeDef> edges;
};

/// Precomputed city adjacency graph for O(1) lookups.
class CityGraph {
public:
    explicit CityGraph(const MapDef& map);

    /// Returns true if the city exists.
    bool has_city(const std::string& id) const;

    /// Returns true if from→to is a valid edge (undirected).
    bool are_adjacent(const std::string& from, const std::string& to) const;

    /// Returns the set of cities adjacent to the given city.
    const std::unordered_set<std::string>& adjacent(const std::string& city_id) const;

    /// Lookup a city definition by id.
    const CityDef* get_city(const std::string& id) const;

    /// Returns the underlying map definition.
    const MapDef& map_def() const { return map_; }

    /// Returns all city IDs.
    std::vector<std::string> all_city_ids() const;

private:
    MapDef map_;
    std::unordered_map<std::string, CityDef> cities_;
    std::unordered_map<std::string, std::unordered_set<std::string>> adjacency_;
    static const std::unordered_set<std::string> empty_set_;
};

} // namespace two_spies::game
