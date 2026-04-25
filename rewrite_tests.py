import re
import glob

files = [
    'backend/tests/unit/test_game_state.cpp',
    'backend/tests/unit/test_match_timeout.cpp',
    'backend/tests/unit/test-locate-one-way.cpp',
    'tests/verify-deep-cover-fix.cpp'
]

def process(fpath):
    with open(fpath, 'r') as f:
        text = f.read()
    
    # 1. Change test_map() back to config::default_map()
    text = text.replace('test_map()', 'config::default_map()')
    text = text.replace('two_spies::tests::test_map()', 'two_spies::config::default_map()')
    text = text.replace('#include "../test_map.hpp"', '#include "config/DefaultMap.hpp"')
    text = text.replace('#include "test_map.hpp"', '#include "config/DefaultMap.hpp"')
    
    # 2. Path replacements for RED (Starts london)
    # old: london -> paris -> amsterdam -> berlin
    # new: london -> paris -> cairo -> moscow
    text = text.replace('"amsterdam"', '"cairo"')
    text = text.replace('"berlin"', '"buenos_aires"') # wait, from cairo we can't go to buenos_aires.
    
    # Let's use custom regex for the moves
    
    with open(fpath, 'w') as f:
        f.write(text)

# We will just do it properly for all files
