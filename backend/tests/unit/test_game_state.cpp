/**
 * Minimal GameState unit tests.
 *
 * We avoid pulling in a heavy test framework for now — just assert-based
 * tests that return exit code 0 on success or 1 on failure.
 */

#include "game/GameState.hpp"
#include "config/DefaultMap.hpp"
#include <cassert>
#include <iostream>
#include <string>

using namespace two_spies::game;

static MapDef test_map() {
    return two_spies::config::default_map();
}

static void test_starting_cities() {
    std::cout << "  test_starting_cities... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");
    assert(gs.player(PlayerSide::RED).current_city == "london");
    assert(gs.player(PlayerSide::BLUE).current_city == "moscow");
    assert(gs.turn_number() == 1);
    assert(gs.current_turn() == PlayerSide::RED);
    std::cout << "OK\n";
}

static void test_move_valid() {
    std::cout << "  test_move_valid... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    auto r = gs.move(PlayerSide::RED, "paris");
    assert(r.ok);
    assert(gs.player(PlayerSide::RED).current_city == "paris");
    assert(gs.player(PlayerSide::RED).actions_remaining == 1);
    assert(gs.player(PlayerSide::RED).has_cover == true);
    std::cout << "OK\n";
}

static void test_move_not_adjacent() {
    std::cout << "  test_move_not_adjacent... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    auto r = gs.move(PlayerSide::RED, "berlin");
    assert(!r.ok);
    assert(!r.error.empty());
    assert(gs.player(PlayerSide::RED).current_city == "london");
    std::cout << "OK\n";
}

static void test_move_wrong_turn() {
    std::cout << "  test_move_wrong_turn... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    auto r = gs.move(PlayerSide::BLUE, "warsaw");
    assert(!r.ok);
    assert(r.error == "Not your turn.");
    std::cout << "OK\n";
}

static void test_strike_hit() {
    std::cout << "  test_strike_hit... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    // RED strikes moscow where BLUE is — HIT
    auto r = gs.strike(PlayerSide::RED, "moscow");
    assert(r.ok);
    assert(r.game_over);
    assert(r.winner == PlayerSide::RED);
    assert(gs.is_game_over());
    std::cout << "OK\n";
}

static void test_strike_miss() {
    std::cout << "  test_strike_miss... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    // RED strikes berlin — MISS (BLUE is in moscow)
    auto r = gs.strike(PlayerSide::RED, "berlin");
    assert(r.ok);
    assert(!r.game_over);
    // Striker's position revealed to opponent
    assert(gs.player(PlayerSide::BLUE).known_opponent_city == "london");
    // Striker loses cover
    assert(!gs.player(PlayerSide::RED).has_cover);
    std::cout << "OK\n";
}

static void test_end_turn() {
    std::cout << "  test_end_turn... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    auto r = gs.end_turn(PlayerSide::RED);
    assert(r.ok);
    assert(gs.current_turn() == PlayerSide::BLUE);
    assert(gs.turn_number() == 2);
    assert(gs.player(PlayerSide::BLUE).actions_remaining == 2);
    // RED gets Intel: base 1 + bonus (london is bonus) = 2 + 2 = 4
    assert(gs.player(PlayerSide::RED).intel >= 3);
    std::cout << "OK\n";
}

static void test_no_actions_remaining() {
    std::cout << "  test_no_actions_remaining... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    gs.move(PlayerSide::RED, "paris");
    gs.move(PlayerSide::RED, "zurich");

    // Third action should fail
    auto r = gs.move(PlayerSide::RED, "rome");
    assert(!r.ok);
    assert(r.error == "No actions remaining — end your turn.");
    std::cout << "OK\n";
}

static void test_city_graph_adjacency() {
    std::cout << "  test_city_graph_adjacency... ";
    auto map = test_map();
    CityGraph graph(map);

    assert(graph.has_city("london"));
    assert(graph.has_city("moscow"));
    assert(!graph.has_city("atlantis"));

    assert(graph.are_adjacent("london", "paris"));
    assert(graph.are_adjacent("paris", "london")); // undirected
    assert(!graph.are_adjacent("london", "moscow"));

    auto adj = graph.adjacent("london");
    assert(adj.count("paris") > 0);
    assert(adj.count("amsterdam") > 0);
    assert(adj.count("moscow") == 0);
    std::cout << "OK\n";
}

int main() {
    std::cout << "Running GameState unit tests...\n";
    test_starting_cities();
    test_move_valid();
    test_move_not_adjacent();
    test_move_wrong_turn();
    test_strike_hit();
    test_strike_miss();
    test_end_turn();
    test_no_actions_remaining();
    test_city_graph_adjacency();
    std::cout << "All tests passed!\n";
    return 0;
}
