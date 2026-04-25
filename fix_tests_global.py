import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    text = f.read()

# test_city_scheduling_at_action_4
text = text.replace('''
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
    gs.move(PlayerSide::BLUE, "prague");     // action 4 — scheduling occurs''', '''
    // Perform 3 moves (actions 1-3)
    gs.move(PlayerSide::RED, "paris");       // action 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "cairo");      // action 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "buenos_aires"); // action 3
    gs.end_turn(PlayerSide::RED);

    // At action 3, still nothing scheduled
    assert(gs.scheduled_disappear_city().empty());
    assert(gs.disappeared_cities().empty());

    // Perform 4th action
    gs.move(PlayerSide::BLUE, "paris");     // action 4 — scheduling occurs''')

# test_city_disappears_at_action_6
text = text.replace('''
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
    gs.move(PlayerSide::BLUE, "vienna");     // action 6 — disappearance!''', '''
    // Perform exactly 6 actions with moves to trigger city disappearance
    gs.move(PlayerSide::RED, "paris");       // action 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "cairo");      // action 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "buenos_aires"); // action 3
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "paris");     // action 4 — scheduling
    gs.end_turn(PlayerSide::BLUE);

    std::string scheduled_city = gs.scheduled_disappear_city();
    assert(!scheduled_city.empty());
    assert(gs.disappeared_cities().empty());

    // Actions 5 and 6
    gs.move(PlayerSide::RED, "nyc");         // action 5
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "london");     // action 6 — disappearance!''')

# test_stranded_player_detection
text = text.replace('''
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
    gs.move(PlayerSide::BLUE, "vienna");    // action 6 — disappearance''', '''
    // Get RED to a city and have it disappear while RED is there
    // We'll manually place RED in a city and trigger disappearance
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "cairo");
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "buenos_aires");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "paris");    // action 4 — scheduling
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "nyc");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "london");    // action 6 — disappearance''')

# test_movement_blocked_to_disappeared_city
text = text.replace('''
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
    gs.move(PlayerSide::BLUE, "vienna");    // action 6 — disappearance''', '''
    // Trigger disappearance by performing enough moves
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "cairo");
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "buenos_aires");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "paris");    // action 4
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "nyc");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "london");    // action 6 — disappearance''')

# test_stranded_player_only_can_move
text = text.replace('''
    // For now, we do a simpler verification: the methods exist and return reasonable values
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);''', '''
    // For now, we do a simpler verification: the methods exist and return reasonable values
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);''')

# test_action_count_increments
text = text.replace('''
    // Perform 4 actions total
    gs.move(PlayerSide::RED, "paris");       // 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");     // 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "amsterdam");      // 3
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "prague");     // 4 — should trigger scheduling''', '''
    // Perform 4 actions total
    gs.move(PlayerSide::RED, "paris");       // 1
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "cairo");      // 2
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "buenos_aires"); // 3
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "paris");      // 4 — should trigger scheduling''')

# test_intel_spawning_at_thresholds
text = text.replace('''
    // Move to hit threshold (Action 3)
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "warsaw");
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "berlin"); // Action 3
    gs.end_turn(PlayerSide::RED);''', '''
    // Move to hit threshold (Action 3)
    gs.move(PlayerSide::RED, "paris");
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "cairo");
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "buenos_aires"); // Action 3
    gs.end_turn(PlayerSide::RED);''')

# test_intel_spawning_at_thresholds (continue)
text = text.replace('''
    // The next threshold is between 2-5 actions (from action 3). So at most action 8.
    gs.move(PlayerSide::BLUE, "prague"); // Action 4
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "amsterdam"); // Action 5
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "vienna"); // Action 6
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "paris"); // Action 7
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "budapest"); // Action 8
    gs.end_turn(PlayerSide::BLUE);''', '''
    // The next threshold is between 2-5 actions (from action 3). So at most action 8.
    gs.move(PlayerSide::BLUE, "paris"); // Action 4
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "nyc"); // Action 5
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "london"); // Action 6
    gs.end_turn(PlayerSide::BLUE);
    gs.move(PlayerSide::RED, "london"); // Action 7
    gs.end_turn(PlayerSide::RED);
    gs.move(PlayerSide::BLUE, "tokyo"); // Action 8
    gs.end_turn(PlayerSide::BLUE);''')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(text)
