#include "game/CityGraph.hpp"
#include <stdexcept>

namespace two_spies::game {

const std::unordered_set<std::string> CityGraph::empty_set_;

CityGraph::CityGraph(const MapDef& map) : map_(map) {
    for (const auto& city : map_.cities) {
        cities_[city.id] = city;
        adjacency_[city.id]; // ensure entry exists even if no edges
    }
    for (const auto& edge : map_.edges) {
        adjacency_[edge.from].insert(edge.to);
        adjacency_[edge.to].insert(edge.from);
    }
}

bool CityGraph::has_city(const std::string& id) const {
    return cities_.count(id) > 0;
}

bool CityGraph::are_adjacent(const std::string& from, const std::string& to) const {
    auto it = adjacency_.find(from);
    if (it == adjacency_.end()) return false;
    return it->second.count(to) > 0;
}

const std::unordered_set<std::string>& CityGraph::adjacent(const std::string& city_id) const {
    auto it = adjacency_.find(city_id);
    if (it == adjacency_.end()) return empty_set_;
    return it->second;
}

const CityDef* CityGraph::get_city(const std::string& id) const {
    auto it = cities_.find(id);
    if (it == cities_.end()) return nullptr;
    return &it->second;
}

std::vector<std::string> CityGraph::all_city_ids() const {
    std::vector<std::string> ids;
    ids.reserve(cities_.size());
    for (const auto& [id, _] : cities_) {
        ids.push_back(id);
    }
    return ids;
}

} // namespace two_spies::game
