import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    content = f.read()

content = content.replace('two_spies::config::default_map()', 'two_spies::tests::test_map()')

# test_city_scheduling_at_action_4
content = content.replace('gs.move(PlayerSide::RED, "berlin");      // action 3', 'gs.move(PlayerSide::RED, "amsterdam"); // action 3')
content = content.replace('gs.move(PlayerSide::BLUE, "vienna");     // action 4 — scheduling occurs', 'gs.move(PlayerSide::BLUE, "prague"); // action 4')

# test_city_disappears_at_action_6
content = content.replace('gs.move(PlayerSide::BLUE, "vienna");     // action 4 — scheduling', 'gs.move(PlayerSide::BLUE, "prague"); // action 4')
content = content.replace('gs.move(PlayerSide::RED, "warsaw");      // action 5', 'gs.move(PlayerSide::RED, "berlin"); // action 5')
content = content.replace('gs.move(PlayerSide::BLUE, "prague");     // action 6 — disappearance happens', 'gs.move(PlayerSide::BLUE, "vienna"); // action 6')

# test_action_count_increments
content = content.replace('gs.move(PlayerSide::BLUE, "vienna");     // 4 — should trigger scheduling', 'gs.move(PlayerSide::BLUE, "prague"); // action 4')

# test_multiple_disappearance_cycles
content = content.replace('gs.move(PlayerSide::BLUE, "vienna");     // 4 — schedule triggersgs.end_turn(PlayerSide::BLUE);', 'gs.move(PlayerSide::BLUE, "prague");\n    gs.end_turn(PlayerSide::BLUE);')
content = content.replace('gs.move(PlayerSide::BLUE, "vienna");     // 4 — schedule triggers\n    gs.end_turn(PlayerSide::BLUE);', 'gs.move(PlayerSide::BLUE, "prague");\n    gs.end_turn(PlayerSide::BLUE);')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(content)
