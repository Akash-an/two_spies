
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <random>
#include <iomanip>
#include <utility>

struct City {
    std::string id;
};

struct Edge {
    std::string from;
    std::string to;
};

struct Map {
    std::vector<City> cities;
    std::vector<Edge> edges;
};

bool are_adjacent(const Map& map, const std::string& c1, const std::string& c2) {
    for (const auto& edge : map.edges) {
        if ((edge.from == c1 && edge.to == c2) || (edge.from == c2 && edge.to == c1)) {
            return true;
        }
    }
    return false;
}

void simulate(int iterations) {
    Map map;
    map.cities = {{"nyc"}, {"havana"}, {"rio"}, {"london"}, {"algiers"}, {"moscow"}, {"dar_es_salaam"}, {"tel-aviv"}, {"dubai"}, {"bangalore"}, {"singapore"}, {"beijing"}, {"tokyo"}, {"sydney"}};
    map.edges = {{"nyc", "havana"}, {"havana", "rio"}, {"nyc", "london"}, {"london", "algiers"}, {"algiers", "moscow"}, {"moscow", "beijing"}, {"beijing", "tokyo"}, {"tokyo", "sydney"}, {"sydney", "singapore"}, {"singapore", "bangalore"}, {"beijing", "dubai"}, {"dubai", "tel-aviv"}, {"tel-aviv", "dar_es_salaam"}, {"tel-aviv", "london"}, {"dar_es_salaam", "bangalore"}, {"singapore", "tokyo"}, {"dubai", "bangalore"}, {"nyc", "rio"}, {"rio", "dar_es_salaam"}, {"london", "moscow"}, {"nyc", "algiers"}, {"rio", "algiers"}, {"dar_es_salaam", "sydney"}};

    std::unordered_map<std::string, int> red_counts;
    std::unordered_map<std::string, int> blue_counts;
    std::unordered_map<std::string, int> total_counts;

    std::vector<std::string> city_ids;
    for (const auto& c : map.cities) city_ids.push_back(c.id);

    std::random_device rd;
    std::mt19937 g(rd());

    for (int k = 0; k < iterations; ++k) {
        // --- NEW LOGIC ---
        std::vector<std::pair<std::string, std::string>> valid_pairs;
        for (std::size_t i = 0; i < city_ids.size(); ++i) {
            for (std::size_t j = i + 1; j < city_ids.size(); ++j) {
                if (!are_adjacent(map, city_ids[i], city_ids[j])) {
                    valid_pairs.push_back({city_ids[i], city_ids[j]});
                }
            }
        }

        std::string red_city, blue_city;
        if (!valid_pairs.empty()) {
            std::uniform_int_distribution<std::size_t> dist(0, valid_pairs.size() - 1);
            auto chosen_pair = valid_pairs[dist(g)];

            std::uniform_int_distribution<int> coin_flip(0, 1);
            if (coin_flip(g) == 0) {
                red_city = chosen_pair.first;
                blue_city = chosen_pair.second;
            } else {
                red_city = chosen_pair.second;
                blue_city = chosen_pair.first;
            }
        } else {
            std::shuffle(city_ids.begin(), city_ids.end(), g);
            red_city = city_ids[0];
            blue_city = city_ids[1];
        }
        // -----------------

        red_counts[red_city]++;
        blue_counts[blue_city]++;
        total_counts[red_city]++;
        total_counts[blue_city]++;
    }

    std::cout << std::left << std::setw(15) << "City" 
              << std::setw(10) << "Red %" 
              << std::setw(10) << "Blue %" 
              << std::setw(10) << "Total %" << std::endl;
    std::cout << std::string(45, '-') << std::endl;

    for (const auto& city : map.cities) {
        double red_p = (double)red_counts[city.id] / iterations * 100.0;
        double blue_p = (double)blue_counts[city.id] / iterations * 100.0;
        double total_p = (double)total_counts[city.id] / iterations * 100.0;
        
        std::cout << std::left << std::setw(15) << city.id 
                  << std::fixed << std::setprecision(2) 
                  << std::setw(10) << red_p 
                  << std::setw(10) << blue_p 
                  << std::setw(10) << total_p << std::endl;
    }
}

int main() {
    simulate(1000000);
    return 0;
}
