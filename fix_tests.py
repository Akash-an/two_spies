import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    text = f.read()

# Replace test_city_scheduling_at_action_4
text = text.replace('''
    // Perform 3 moves (actions 1-3)
    gs.move(PlayerSide::RED, "paris");       // action 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");     // action 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "berlin");      // action 3
    gs.end_turn(PlayerSide::RED);

    // At action 3, still nothing scheduled
    assert(gs.scheduled_disappear_city().empty());
    assert(gs.disappeared_cities().empty());

    // Perform 4th action
    gs.move(PlayerSide::BLUE, "vienna");     // action 4 — scheduling occurs''', '''
    // Perform 3 moves (actions 1-3)
    gs.move(PlayerSide::RED, "paris");       // action 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");     // action 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "amsterdam");      // action 3
    gs.end_turn(PlayerSide::RED);

    // At action 3, still nothing scheduled
    assert(gs.scheduled_disappear_city().empty());
    assert(gs.disappeared_cities().empty());

    // Perform 4th action
    gs.move(PlayerSide::BLUE, "prague");     // action 4 — scheduling occurs''')

# Replace test_city_disappears_at_action_6
text = text.replace('''
    // Perform exactly 6 actions with moves to trigger city disappearance
    gs.move(PlayerSide::RED, "paris");       // action 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");     // action 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "berlin");      // action 3
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "vienna");     // action 4 — scheduling
    gs.end_turn(PlayerSide::BLUE);

    std::string scheduled_city = gs.scheduled_disappear_city();
    assert(!scheduled_city.empty());
    assert(gs.disappeared_cities().empty());

    // Actions 5 and 6
    gs.move(PlayerSide::RED, "warsaw");      // action 5
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "prague");     // action 6 — disappearance!''', '''
    // Perform exactly 6 actions with moves to trigger city disappearance
    gs.move(PlayerSide::RED, "paris");       // action 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");     // action 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "amsterdam");      // action 3
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "prague");     // action 4 — scheduling
    gs.end_turn(PlayerSide::BLUE);

    std::string scheduled_city = gs.scheduled_disappear_city();
    assert(!scheduled_city.empty());
    assert(gs.disappeared_cities().empty());

    // Actions 5 and 6
    gs.move(PlayerSide::RED, "berlin");      // action 5
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "vienna");     // action 6 — disappearance!''')

# Replace test_movement_blocked_to_disappeared_city
text = text.replace('''
    // Trigger disappearance by performing enough moves
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "berlin");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "vienna");    // action 4
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "warsaw");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "prague");    // action 6 — disappearance''', '''
    // Trigger disappearance by performing enough moves
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "amsterdam");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "prague");    // action 4
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "berlin");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "vienna");    // action 6 — disappearance''')

# Replace test_action_count_increments
text = text.replace('''
    // Perform 4 actions total
    gs.move(PlayerSide::RED, "paris");       // 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");     // 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "berlin");      // 3
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "vienna");     // 4 — should trigger scheduling''', '''
    // Perform 4 actions total
    gs.move(PlayerSide::RED, "paris");       // 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");     // 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "amsterdam");      // 3
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "prague");     // 4 — should trigger scheduling''')

# Replace test_stranded_player_detection
text = text.replace('''
    // Get RED to a city and have it disappear while RED is there
    // We'll manually place RED in a city and trigger disappearance
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "berlin");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "vienna");    // action 4 — if berlin scheduled
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "warsaw");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "prague");    // action 6 — disappearance''', '''
    // Get RED to a city and have it disappear while RED is there
    // We'll manually place RED in a city and trigger disappearance
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "amsterdam");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "prague");    // action 4 — scheduling
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "berlin");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "vienna");    // action 6 — disappearance''')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(text)
# Fix test_locate_one_way_reveal_only
text = text.replace('''
    // Move both players to known positions
    auto r_move = gs.move(PlayerSide::RED, "paris");
    assert(r_move.ok);
    assert(red.current_city == "paris");
    
    gs.end_turn(PlayerSide::RED);
    
    auto b_move = gs.move(PlayerSide::BLUE, "berlin");
    assert(b_move.ok);
    assert(blue.current_city == "berlin");''', '''
    // Move both players to known positions
    auto r_move = gs.move(PlayerSide::RED, "paris");
    assert(r_move.ok);
    assert(red.current_city == "paris");
    
    gs.end_turn(PlayerSide::RED);
    
    auto b_move = gs.move(PlayerSide::BLUE, "warsaw");
    assert(b_move.ok);
    assert(blue.current_city == "warsaw");''')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(text)
