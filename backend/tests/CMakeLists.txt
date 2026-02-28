cmake_minimum_required(VERSION 3.16)

# ---------- unit tests ----------
file(GLOB_RECURSE UNIT_SOURCES "unit/*.cpp")
if(UNIT_SOURCES)
    add_executable(unit_tests ${UNIT_SOURCES})
    target_link_libraries(unit_tests PRIVATE two_spies_lib)
    add_test(NAME UnitTests COMMAND unit_tests)
endif()

# ---------- integration tests ----------
file(GLOB_RECURSE INTEGRATION_SOURCES "integration/*.cpp")
if(INTEGRATION_SOURCES)
    add_executable(integration_tests ${INTEGRATION_SOURCES})
    target_link_libraries(integration_tests PRIVATE two_spies_lib)
    add_test(NAME IntegrationTests COMMAND integration_tests)
endif()
