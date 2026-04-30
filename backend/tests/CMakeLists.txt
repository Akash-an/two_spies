cmake_minimum_required(VERSION 3.16)

# Tests rely on assert() to validate game-rule expectations. Strip -DNDEBUG
# from any per-config flags so asserts stay live in Release/RelWithDebInfo
# builds too. Without this, the entire suite silently no-ops.
function(_two_spies_enable_asserts target)
    target_compile_options(${target} PRIVATE -UNDEBUG)
    set_property(TARGET ${target} PROPERTY CXX_STANDARD 17)
endfunction()

# ---------- unit tests ----------
file(GLOB_RECURSE UNIT_SOURCES "unit/*.cpp")
if(UNIT_SOURCES)
    add_executable(unit_tests ${UNIT_SOURCES})
    target_link_libraries(unit_tests PRIVATE two_spies_lib)
    _two_spies_enable_asserts(unit_tests)
    add_test(NAME UnitTests COMMAND unit_tests)
endif()

# ---------- integration tests ----------
file(GLOB_RECURSE INTEGRATION_SOURCES "integration/*.cpp")
if(INTEGRATION_SOURCES)
    add_executable(integration_tests ${INTEGRATION_SOURCES})
    target_link_libraries(integration_tests PRIVATE two_spies_lib)
    _two_spies_enable_asserts(integration_tests)
    add_test(NAME IntegrationTests COMMAND integration_tests)
endif()
