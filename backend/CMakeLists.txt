cmake_minimum_required(VERSION 3.16)
project(two_spies_server VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# --------------------------------------------------------------------------
# Dependencies
# --------------------------------------------------------------------------
find_package(Boost REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)
find_package(nlohmann_json REQUIRED)

# --------------------------------------------------------------------------
# Game logic library (shared between server and tests)
# --------------------------------------------------------------------------
file(GLOB_RECURSE GAME_SOURCES
    "src/game/*.cpp"
    "src/protocol/*.cpp"
)

add_library(two_spies_lib STATIC ${GAME_SOURCES})

target_include_directories(two_spies_lib PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(two_spies_lib PUBLIC
    Boost::boost
    OpenSSL::SSL
    OpenSSL::Crypto
    Threads::Threads
    nlohmann_json::nlohmann_json
)

# --------------------------------------------------------------------------
# Server executable
# --------------------------------------------------------------------------
file(GLOB_RECURSE NETWORK_SOURCES
    "src/network/*.cpp"
)

add_executable(two_spies_server
    src/main.cpp
    ${NETWORK_SOURCES}
)

target_include_directories(two_spies_server PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(two_spies_server PRIVATE
    two_spies_lib
)

# --------------------------------------------------------------------------
# Tests
# --------------------------------------------------------------------------
enable_testing()
add_subdirectory(tests)
