import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    text = f.read()

# test_intel_multiple_turns_accumulation
text = text.replace('''
    // Turn 1
    gs.move(PlayerSide::RED, "paris");
    gs.move(PlayerSide::RED, "amsterdam");
    gs.end_turn(PlayerSide::RED);

    gs.move(PlayerSide::BLUE, "kiev");
    gs.move(PlayerSide::BLUE, "bucharest");
    gs.end_turn(PlayerSide::BLUE);''', '''
    // Turn 1
    gs.move(PlayerSide::RED, "nyc");
    gs.move(PlayerSide::RED, "buenos_aires");
    gs.end_turn(PlayerSide::RED);

    gs.move(PlayerSide::BLUE, "tokyo");
    gs.move(PlayerSide::BLUE, "london");
    gs.end_turn(PlayerSide::BLUE);''')

# test_intel_no_bonus_on_timeout
text = text.replace('''
    gs.move(PlayerSide::RED, "paris");
    gs.move(PlayerSide::RED, "amsterdam");
    // Explicit end turn triggers intel gathering normally
    gs.end_turn(PlayerSide::RED);

    gs.move(PlayerSide::BLUE, "kiev");
    gs.move(PlayerSide::BLUE, "bucharest");
    // Timeout triggers forced end turn — should not give +2 intel
    gs.force_timeout_end_turn(PlayerSide::BLUE);''', '''
    gs.move(PlayerSide::RED, "nyc");
    gs.move(PlayerSide::RED, "buenos_aires");
    // Explicit end turn triggers intel gathering normally
    gs.end_turn(PlayerSide::RED);

    gs.move(PlayerSide::BLUE, "tokyo");
    gs.move(PlayerSide::BLUE, "london");
    // Timeout triggers forced end turn — should not give +2 intel
    gs.force_timeout_end_turn(PlayerSide::BLUE);''')

# Fix any stray assertions for current_city in test_intel_multiple_turns_accumulation
text = text.replace('assert(red.current_city == "amsterdam");', 'assert(red.current_city == "buenos_aires");')
text = text.replace('assert(blue.current_city == "bucharest");', 'assert(blue.current_city == "london");')
text = text.replace('assert(red.current_city == "paris");', 'assert(red.current_city == "nyc");') # from test_intel_with_new_city_movement if missed

# test_strike_hit needs checking too
text = text.replace('assert(blue.current_city == "bucharest");', 'assert(blue.current_city == "london");')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(text)
