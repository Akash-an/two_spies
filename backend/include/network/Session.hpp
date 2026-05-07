#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/strand.hpp>
#include <memory>
#include <string>
#include <queue>
#include <mutex>

namespace beast     = boost::beast;
namespace websocket = beast::websocket;
namespace net       = boost::asio;
using tcp           = net::ip::tcp;

namespace two_spies::network {

class WebSocketServer;  // forward declaration

/**
 * Session — manages a single WebSocket connection.
 *
 * Each connected client gets one Session.  The session generates a unique
 * player_id, registers itself with the server, reads messages, parses them
 * through the protocol layer, and routes them to the MatchManager.
 *
 * No game logic lives here — only networking.
 */
class Session : public std::enable_shared_from_this<Session> {
public:
    Session(tcp::socket&& socket, std::shared_ptr<WebSocketServer> server);
    ~Session();

    /// Start the WebSocket handshake.
    void run();

    /// Enqueue a message to be sent to this client.
    void send(const std::string& message);

    const std::string& player_id() const { return player_id_; }
    void set_player_id(const std::string& id) { player_id_ = id; }
    const std::string& player_name() const { return player_name_; }
    void set_player_name(const std::string& name) { player_name_ = name; }

private:
    websocket::stream<beast::tcp_stream> ws_;
    std::shared_ptr<WebSocketServer> server_;
    std::string player_id_;
    std::string player_name_;  // display name set by the client
    beast::flat_buffer buffer_;

    // Write queue (serialised through strand)
    std::mutex write_mutex_;
    std::queue<std::string> write_queue_;
    bool writing_ = false;

    void on_accept(beast::error_code ec);
    void do_read();
    void on_read(beast::error_code ec, std::size_t bytes_transferred);
    void on_message(const std::string& raw);
    void do_write();
    void on_write(beast::error_code ec, std::size_t bytes_transferred);
    void close();

    static std::string generate_player_id();
};

} // namespace two_spies::network
