import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    content = f.read()

content = content.replace('if (!r6.ok) std::cerr << "ACTION 6 FAILED: " << r6.error << std::endl;', 'if (!r6.ok) std::cerr << "ACTION 6 FAILED: " << r6.error << std::endl;\n    std::cerr << "ACTION 6 RESULT OK: " << r6.ok << std::endl;')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(content)
