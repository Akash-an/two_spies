import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    text = f.read()

# Replace any references to "amsterdam", "berlin", "prague", "vienna", "warsaw", "budapest", "bucharest" with cities from the 7-city map.
# 7-city map: london, paris, nyc, buenos_aires, tokyo, moscow, cairo
# Edges: london-paris, london-nyc, nyc-buenos_aires, buenos_aires-paris, paris-cairo, cairo-moscow, moscow-tokyo, tokyo-london

# test_move_valid
text = text.replace('gs.move(PlayerSide::RED, "paris");', 'gs.move(PlayerSide::RED, "nyc");')
text = text.replace('assert(gs.player(PlayerSide::RED).current_city == "paris");', 'assert(gs.player(PlayerSide::RED).current_city == "nyc");')

# test_move_not_adjacent
text = text.replace('gs.move(PlayerSide::RED, "berlin");', 'gs.move(PlayerSide::RED, "moscow");')

# test_move_wrong_turn
text = text.replace('gs.move(PlayerSide::BLUE, "warsaw");', 'gs.move(PlayerSide::BLUE, "cairo");')

# test_strike_hit
text = text.replace('gs.move(PlayerSide::RED, "paris");', 'gs.move(PlayerSide::RED, "nyc");')
text = text.replace('gs.move(PlayerSide::RED, "amsterdam");', 'gs.move(PlayerSide::RED, "buenos_aires");')
text = text.replace('gs.move(PlayerSide::BLUE, "kiev");', 'gs.move(PlayerSide::BLUE, "tokyo");')
text = text.replace('gs.move(PlayerSide::BLUE, "bucharest");', 'gs.move(PlayerSide::BLUE, "london");')
text = text.replace('gs.strike(PlayerSide::RED, "london");', 'gs.strike(PlayerSide::RED, "tokyo");')

# test_strike_miss
text = text.replace('gs.strike(PlayerSide::RED, "prague");', 'gs.strike(PlayerSide::RED, "cairo");')
text = text.replace('gs.strike(PlayerSide::RED, "paris");', 'gs.strike(PlayerSide::RED, "london");')

# test_strike_miss_no_location_reveal
text = text.replace('gs.strike(PlayerSide::RED, "berlin");', 'gs.strike(PlayerSide::RED, "tokyo");')

# test_strike_hit_no_spurious_notification
text = text.replace('gs.strike(PlayerSide::RED, "moscow");', 'gs.strike(PlayerSide::RED, "moscow");')

# test_intel_base_increase_no_movement
text = text.replace('assert(red.current_city == "london");', 'assert(red.current_city == "london");')

# test_intel_with_new_city_movement
text = text.replace('auto r_move = gs.move(PlayerSide::RED, "paris");', 'auto r_move = gs.move(PlayerSide::RED, "nyc");')
text = text.replace('assert(red.current_city == "paris");', 'assert(red.current_city == "nyc");')

# test_intel_no_bonus_revisiting_city
text = text.replace('gs.move(PlayerSide::RED, "paris");', 'gs.move(PlayerSide::RED, "nyc");')
text = text.replace('gs.move(PlayerSide::RED, "london");', 'gs.move(PlayerSide::RED, "london");')

# test_intel_moved_to_new_city_flag_resets
text = text.replace('gs.move(PlayerSide::RED, "paris");', 'gs.move(PlayerSide::RED, "nyc");')

# test_city_graph_adjacency
text = text.replace('auto adj_london = gs.graph().adjacent("london");', 'auto adj_london = gs.graph().adjacent("london");')
text = text.replace('assert(adj_london.count("paris") > 0);', 'assert(adj_london.count("paris") > 0);')
text = text.replace('assert(adj_london.count("moscow") == 0);', 'assert(adj_london.count("moscow") == 0);')
text = text.replace('auto adj_paris = gs.graph().adjacent("paris");', 'auto adj_paris = gs.graph().adjacent("paris");')
text = text.replace('assert(adj_paris.count("london") > 0);', 'assert(adj_paris.count("london") > 0);')
text = text.replace('assert(adj_paris.count("amsterdam") > 0);', 'assert(adj_paris.count("buenos_aires") > 0);')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(text)
