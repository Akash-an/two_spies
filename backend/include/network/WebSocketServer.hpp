#pragma once

#include "game/MatchManager.hpp"
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/strand.hpp>
#include <boost/asio/deadline_timer.hpp>
#include <memory>
#include <string>
#include <unordered_map>
#include <mutex>
#include <cstdint>

namespace beast     = boost::beast;
namespace websocket = beast::websocket;
namespace net       = boost::asio;
using tcp           = net::ip::tcp;

namespace two_spies::network {

class Session;  // forward declaration

/**
 * WebSocketServer — accepts incoming TCP connections, upgrades to WebSocket,
 * and dispatches messages through the MatchManager.
 */
class WebSocketServer : public std::enable_shared_from_this<WebSocketServer> {
public:
    /// max_connections: 0 = unlimited, otherwise hard cap on simultaneous WebSocket sessions.
    WebSocketServer(net::io_context& ioc, unsigned short port,
                    std::shared_ptr<game::MatchManager> match_mgr,
                    std::size_t max_connections = 0);

    /// Start accepting connections.
    void run();

    /// Send a JSON string to a specific player by their player_id.
    void send_to_player(const std::string& player_id, const std::string& message);

    /// Register a session for a player_id.
    void register_session(const std::string& player_id, std::shared_ptr<Session> session);

    /// Unregister a session.
    void unregister_session(const std::string& player_id);

    /// Access the match manager.
    game::MatchManager& match_manager() { return *match_mgr_; }

private:
    net::io_context& ioc_;
    tcp::acceptor acceptor_;
    std::shared_ptr<game::MatchManager> match_mgr_;

    std::size_t max_connections_;
    std::mutex sessions_mutex_;
    std::unordered_map<std::string, std::weak_ptr<Session>> sessions_;

    // Timeout polling
    std::unique_ptr<net::deadline_timer> timeout_timer_;

    /// Count live (non-expired) sessions.
    std::size_t active_session_count() const;

    void do_accept();

    /// Start the periodic timeout checker.
    void start_timeout_checker();
    
    /// Periodically check all matches for timeouts and broadcast state.
    void on_timeout_check(const boost::system::error_code& ec);
};

} // namespace two_spies::network
