import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    content = f.read()

content = content.replace('gs.move(PlayerSide::BLUE, "vienna");     // action 6 — disappearance happens', 'auto r6 = gs.move(PlayerSide::BLUE, "vienna");\n    if (!r6.ok) std::cerr << "ACTION 6 FAILED: " << r6.error << std::endl;')
content = content.replace('gs.move(PlayerSide::RED, "berlin");      // action 5', 'auto r5 = gs.move(PlayerSide::RED, "berlin");\n    if (!r5.ok) std::cerr << "ACTION 5 FAILED: " << r5.error << std::endl;')
content = content.replace('gs.move(PlayerSide::BLUE, "prague");     // action 4 — scheduling', 'auto r4 = gs.move(PlayerSide::BLUE, "prague");\n    if (!r4.ok) std::cerr << "ACTION 4 FAILED: " << r4.error << std::endl;')
content = content.replace('gs.move(PlayerSide::RED, "amsterdam"); // action 3', 'auto r3 = gs.move(PlayerSide::RED, "amsterdam");\n    if (!r3.ok) std::cerr << "ACTION 3 FAILED: " << r3.error << std::endl;')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(content)
