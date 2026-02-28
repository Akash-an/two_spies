#include "network/WebSocketServer.hpp"
#include "game/MatchManager.hpp"
#include "config/DefaultMap.hpp"
#include <boost/asio/io_context.hpp>
#include <boost/asio/signal_set.hpp>
#include <iostream>
#include <thread>
#include <vector>
#include <cstdlib>

int main(int argc, char* argv[])
{
    std::cout << std::unitbuf;  // flush stdout after every << so logs appear immediately when redirected to a file

    const unsigned short port    = (argc > 1) ? static_cast<unsigned short>(std::atoi(argv[1])) : 8080;
    const unsigned int   threads = (argc > 2) ? static_cast<unsigned int>(std::atoi(argv[2]))   : 4;

    std::cout << "[two_spies] Starting WebSocket server on port " << port
              << " (" << threads << " threads)\n";

    // Create io_context with the requested thread count
    net::io_context ioc{static_cast<int>(threads)};

    // Create the default map and match manager
    auto default_map = two_spies::config::default_map();
    auto match_mgr = std::make_shared<two_spies::game::MatchManager>(default_map);

    // Create and start the WebSocket server
    auto server = std::make_shared<two_spies::network::WebSocketServer>(ioc, port, match_mgr);
    server->run();

    // Capture SIGINT and SIGTERM to perform clean shutdown
    net::signal_set signals(ioc, SIGINT, SIGTERM);
    signals.async_wait(
        [&ioc](beast::error_code, int sig) {
            std::cout << "\n[two_spies] Caught signal " << sig << ", shutting down…\n";
            ioc.stop();
        });

    // Run the I/O service on the requested number of threads
    std::vector<std::thread> workers;
    workers.reserve(threads - 1);
    for (unsigned int i = 1; i < threads; ++i) {
        workers.emplace_back([&ioc] { ioc.run(); });
    }
    ioc.run();  // main thread also runs

    // Join worker threads
    for (auto& t : workers) {
        t.join();
    }

    std::cout << "[two_spies] Server stopped.\n";
    return 0;
}
