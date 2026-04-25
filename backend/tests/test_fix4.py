import re

with open('backend/tests/unit/test_game_state.cpp', 'r') as f:
    content = f.read()

content = content.replace('assert(gs.disappeared_cities().count(scheduled_city) > 0);', 'if (gs.disappeared_cities().count(scheduled_city) == 0) {\n        std::cerr << "FAILED! scheduled: " << scheduled_city << " disappeared size: " << gs.disappeared_cities().size();\n        for(auto c : gs.disappeared_cities()) std::cerr << " " << c;\n        std::cerr << std::endl;\n    }\n    assert(gs.disappeared_cities().count(scheduled_city) > 0);')

with open('backend/tests/unit/test_game_state.cpp', 'w') as f:
    f.write(content)
