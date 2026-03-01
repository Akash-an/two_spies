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
    // Striker LOSES cover on a failed strike
    assert(!gs.player(PlayerSide::RED).has_cover);
    // Opponent is notified a strike was attempted
    assert(gs.player(PlayerSide::BLUE).opponent_used_strike);
    std::cout << "OK\n";
}

// A failed strike must NOT reveal the striker's current city to the opponent.
static void test_strike_miss_no_location_reveal() {
    std::cout << "  test_strike_miss_no_location_reveal... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    // RED is in london, strikes an empty city
    gs.strike(PlayerSide::RED, "berlin");  // MISS

    // BLUE must NOT have learned where RED is
    assert(gs.player(PlayerSide::BLUE).known_opponent_city.empty());
    std::cout << "OK\n";
}

// A successful strike (hit) must end the game and must NOT set opponent_used_strike.
static void test_strike_hit_no_spurious_notification() {
    std::cout << "  test_strike_hit_no_spurious_notification... ";
    GameState gs(test_map());
    gs.set_starting_cities("london", "moscow");

    // RED strikes moscow where BLUE actually is — HIT
    auto r = gs.strike(PlayerSide::RED, "moscow");
    assert(r.ok);
    assert(r.game_over);
    assert(r.winner == PlayerSide::RED);
    // A hit ends the game immediately; the notification flag is irrelevant but
    // must not be set (the opponent has already lost — no banner needed).
    assert(!gs.player(PlayerSide::BLUE).opponent_used_strike);
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

// Verifies the full turn-alternation contract:
//  - Only the current-turn player may act.
//  - After end_turn the OTHER player becomes active and the previous player is locked out.
//  - Actions from the wrong side are always rejected with a clear error.
static void test_turn_alternation() {
    std::cout << "  test_turn_alternation... ";
    GameState gs(test_map());
    // london–paris are adjacent; london–moscow are NOT adjacent
    gs.set_starting_cities("london", "moscow");

    // ── Turn 1: RED's turn ───────────────────────────────────────
    assert(gs.current_turn() == PlayerSide::RED);

    // BLUE must NOT be able to act while it is RED's turn
    {
        auto r = gs.move(PlayerSide::BLUE, "warsaw");
        assert(!r.ok);
        assert(r.error == "Not your turn.");
    }
    {
        auto r = gs.strike(PlayerSide::BLUE, "london");
        assert(!r.ok);
        assert(r.error == "Not your turn.");
    }
    {
        auto r = gs.end_turn(PlayerSide::BLUE);
        assert(!r.ok);
        assert(r.error == "Not your turn.");
    }

    // RED CAN act
    {
        auto r = gs.move(PlayerSide::RED, "paris");
        assert(r.ok);
    }

    // RED ends their turn
    {
        auto r = gs.end_turn(PlayerSide::RED);
        assert(r.ok);
    }

    // ── Turn 2: BLUE's turn ──────────────────────────────────────
    assert(gs.current_turn() == PlayerSide::BLUE);
    assert(gs.turn_number() == 2);

    // RED must NOT be able to act while it is BLUE's turn
    {
        auto r = gs.move(PlayerSide::RED, "zurich");
        assert(!r.ok);
        assert(r.error == "Not your turn.");
    }
    {
        auto r = gs.end_turn(PlayerSide::RED);
        assert(!r.ok);
        assert(r.error == "Not your turn.");
    }

    // BLUE CAN act
    {
        auto r = gs.move(PlayerSide::BLUE, "warsaw");
        assert(r.ok);
        assert(gs.player(PlayerSide::BLUE).current_city == "warsaw");
    }

    // BLUE ends their turn
    {
        auto r = gs.end_turn(PlayerSide::BLUE);
        assert(r.ok);
    }

    // ── Turn 3: back to RED ───────────────────────────────────────
    assert(gs.current_turn() == PlayerSide::RED);
    assert(gs.turn_number() == 3);
    // RED's actions should have been reset to 2
    assert(gs.player(PlayerSide::RED).actions_remaining == 2);

    std::cout << "OK\n";
}

static void test_starting_cities_not_adjacent() {
    std::cout << "  test_starting_cities_not_adjacent... ";
    GameState gs(test_map());

    // london and paris ARE adjacent — must be rejected
    bool threw = false;
    try {
        gs.set_starting_cities("london", "paris");
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    assert(threw);

    // london and moscow are NOT adjacent — must succeed
    gs.set_starting_cities("london", "moscow");
    assert(gs.player(PlayerSide::RED).current_city == "london");
    assert(gs.player(PlayerSide::BLUE).current_city == "moscow");

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
    test_strike_miss_no_location_reveal();
    test_strike_hit_no_spurious_notification();
    test_end_turn();
    test_no_actions_remaining();
    test_city_graph_adjacency();
    test_turn_alternation();
    test_starting_cities_not_adjacent();
    std::cout << "All tests passed!\n";
    return 0;
}
