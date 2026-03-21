#include "network/Session.hpp"
#include "network/WebSocketServer.hpp"
#include "protocol/Messages.hpp"
#include <iostream>
#include <random>
#include <sstream>
#include <iomanip>

namespace two_spies::network {

Session::Session(tcp::socket&& socket, std::shared_ptr<WebSocketServer> server)
    : ws_(std::move(socket))
    , server_(std::move(server))
    , player_id_(generate_player_id())
{}

Session::~Session() {
    std::cout << "[Session " << player_id_ << "] Destroyed\n";
}

void Session::run() {
    // Set WebSocket options
    ws_.set_option(websocket::stream_base::timeout::suggested(beast::role_type::server));
    ws_.set_option(websocket::stream_base::decorator(
        [](websocket::response_type& res) {
            res.set(boost::beast::http::field::server, "two_spies/0.1");
        }));

    ws_.async_accept(
        beast::bind_front_handler(&Session::on_accept, shared_from_this()));
}

void Session::send(const std::string& message) {
    std::lock_guard lock(write_mutex_);
    write_queue_.push(message);
    if (!writing_) {
        writing_ = true;
        // Post the write to the strand
        net::post(
            ws_.get_executor(),
            beast::bind_front_handler(&Session::do_write, shared_from_this()));
    }
}

void Session::on_accept(beast::error_code ec) {
    if (ec) {
        std::cerr << "[Session] Accept error: " << ec.message() << "\n";
        return;
    }

    std::cout << "[Session " << player_id_ << "] WebSocket connected\n";

    // Register this session with the server
    server_->register_session(player_id_, shared_from_this());

    // Start reading
    do_read();
}

void Session::do_read() {
    ws_.async_read(
        buffer_,
        beast::bind_front_handler(&Session::on_read, shared_from_this()));
}

void Session::on_read(beast::error_code ec, std::size_t /*bytes_transferred*/) {
    if (ec) {
        if (ec == websocket::error::closed) {
            std::cout << "[Session " << player_id_ << "] Client closed connection\n";
        } else {
            std::cerr << "[Session " << player_id_ << "] Read error: " << ec.message() << "\n";
        }
        close();
        return;
    }

    auto raw = beast::buffers_to_string(buffer_.data());
    buffer_.consume(buffer_.size());

    on_message(raw);
    do_read();
}

void Session::on_message(const std::string& raw) {
    try {
    auto msg_opt = protocol::parse_client_message(raw);
    if (!msg_opt) {
        auto err = protocol::make_error("", "Malformed message");
        send(err);
        return;
    }

    auto& msg = *msg_opt;
    std::cout << "[Session " << player_id_ << "] <- " << raw << "\n";

    // IMPORTANT: Check for active match and do periodic broadcast/timeout check
    // This ensures timeout is detected even when players are idle
    auto current_session_id = server_->match_manager().session_for_player(player_id_);
    if (!current_session_id.empty()) {
        auto match = server_->match_manager().get_match(current_session_id);
        if (match) {
            match->periodic_broadcast();
        }
    }

    switch (msg.type) {
        case protocol::ClientMsgType::SET_PLAYER_NAME: {
            auto name = msg.payload.value("name", "");
            if (!name.empty()) {
                player_name_ = name;
                std::cout << "[Session " << player_id_ << "] Set name: " << name << "\n";
            }
            break;
        }

        case protocol::ClientMsgType::CREATE_MATCH: {
            auto send_fn = [weak_server = std::weak_ptr<WebSocketServer>(server_)]
                           (const std::string& pid, const std::string& json_msg) {
                if (auto srv = weak_server.lock()) {
                    srv->send_to_player(pid, json_msg);
                }
            };
            auto code = server_->match_manager().create_match(player_id_, send_fn, player_name_);
            std::cout << "[Session " << player_id_ << "] Created match with code " << code << "\n";
            break;
        }

        case protocol::ClientMsgType::JOIN_MATCH: {
            auto code = msg.payload.value("code", "");
            if (code.empty()) {
                send(protocol::make_error("", "Missing room code"));
                return;
            }
            auto send_fn = [weak_server = std::weak_ptr<WebSocketServer>(server_)]
                           (const std::string& pid, const std::string& json_msg) {
                if (auto srv = weak_server.lock()) {
                    srv->send_to_player(pid, json_msg);
                }
            };
            auto session_id = server_->match_manager().join_match_by_code(
                player_id_, code, send_fn, player_name_);
            if (!session_id.empty()) {
                std::cout << "[Session " << player_id_ << "] Joined match " << session_id
                          << " with code " << code << "\n";
            }
            break;
        }

        case protocol::ClientMsgType::PLAYER_ACTION: {
            auto session_id = server_->match_manager().session_for_player(player_id_);
            if (session_id.empty()) {
                send(protocol::make_error("", "Not in a match"));
                return;
            }
            auto match = server_->match_manager().get_match(session_id);
            if (!match) {
                send(protocol::make_error("", "Match not found"));
                return;
            }

            auto action     = msg.payload.value("action", "");
            auto target_city = msg.payload.value("targetCity", "");
            auto ability_id  = msg.payload.value("abilityId", "");
            match->handle_action(player_id_, action, target_city, ability_id);
            break;
        }

        case protocol::ClientMsgType::END_TURN: {
            auto session_id = server_->match_manager().session_for_player(player_id_);
            if (session_id.empty()) {
                send(protocol::make_error("", "Not in a match"));
                return;
            }
            auto match = server_->match_manager().get_match(session_id);
            if (!match) {
                send(protocol::make_error("", "Match not found"));
                return;
            }
            match->handle_end_turn(player_id_);
            break;
        }
    }
    } catch (const std::exception& e) {
        std::cerr << "[Session " << player_id_ << "] Unhandled exception in on_message: "
                  << e.what() << "\n";
        send(protocol::make_error("", std::string("Internal server error: ") + e.what()));
    }
}

void Session::do_write() {
    std::string msg;
    {
        std::lock_guard lock(write_mutex_);
        if (write_queue_.empty()) {
            writing_ = false;
            return;
        }
        msg = std::move(write_queue_.front());
        write_queue_.pop();
    }

    ws_.text(true);
    ws_.async_write(
        net::buffer(msg),
        beast::bind_front_handler(&Session::on_write, shared_from_this()));
}

void Session::on_write(beast::error_code ec, std::size_t /*bytes_transferred*/) {
    if (ec) {
        std::cerr << "[Session " << player_id_ << "] Write error: " << ec.message() << "\n";
        close();
        return;
    }
    do_write();  // process next message in queue
}

void Session::close() {
    server_->unregister_session(player_id_);
}

std::string Session::generate_player_id() {
    static std::mt19937 rng{std::random_device{}()};
    std::uniform_int_distribution<uint64_t> dist;
    std::ostringstream oss;
    oss << "player-" << std::hex << std::setfill('0') << std::setw(8) << dist(rng);
    return oss.str();
}

} // namespace two_spies::network
