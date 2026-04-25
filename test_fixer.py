import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    text = f.read()

# Fix test_no_actions_remaining
text = text.replace('gs.move(PlayerSide::RED, "zurich");', 'gs.move(PlayerSide::RED, "buenos_aires");')
text = text.replace('gs.move(PlayerSide::RED, "rome");', 'gs.move(PlayerSide::RED, "paris");')

# Let's fix test_intel_multiple_turns_accumulation for blue moving
text = text.replace('gs.move(PlayerSide::BLUE, "cairo");', 'auto r_cairo = gs.move(PlayerSide::BLUE, "cairo"); assert(r_cairo.ok);')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(text)
