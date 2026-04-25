import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    content = f.read()

# Add asserts around moves to catch failing moves
content = re.sub(r'(gs\.move\([^)]+\));', r'assert(\1.ok);', content)

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(content)
