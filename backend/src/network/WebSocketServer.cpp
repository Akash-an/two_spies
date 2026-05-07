#include "network/WebSocketServer.hpp"
#include "network/Session.hpp"
#include <iostream>

namespace two_spies::network {

WebSocketServer::WebSocketServer(net::io_context& ioc, unsigned short port,
                                 std::shared_ptr<game::MatchManager> match_mgr,
                                 std::size_t max_connections)
    : ioc_(ioc)
    , acceptor_(ioc, tcp::endpoint(tcp::v4(), port))
    , match_mgr_(std::move(match_mgr))
    , max_connections_(max_connections)
    , timeout_timer_(std::make_unique<net::deadline_timer>(ioc))
{
    beast::error_code ec;
    acceptor_.set_option(net::socket_base::reuse_address(true), ec);
}

void WebSocketServer::run() {
    std::cout << "[Server] Listening on port "
              << acceptor_.local_endpoint().port() << "\n";
    do_accept();
    start_timeout_checker();  // Start periodic timeout checks
}

void WebSocketServer::send_to_player(const std::string& player_id, const std::string& message) {
    std::lock_guard lock(sessions_mutex_);
    auto it = sessions_.find(player_id);
    if (it != sessions_.end()) {
        if (auto session = it->second.lock()) {
            session->send(message);
        } else {
            sessions_.erase(it);
        }
    }
}

void WebSocketServer::register_session(const std::string& player_id, std::shared_ptr<Session> session) {
    std::lock_guard lock(sessions_mutex_);
    sessions_[player_id] = session;
    std::cout << "[Server] Session registered: " << player_id << "\n";
}

void WebSocketServer::update_session_id(const std::string& old_id, const std::string& new_id) {
    std::lock_guard lock(sessions_mutex_);
    auto it = sessions_.find(old_id);
    if (it != sessions_.end()) {
        auto session = it->second;
        sessions_.erase(it);
        sessions_[new_id] = session;
        std::cout << "[Server] Session identity updated: " << old_id << " -> " << new_id << "\n";
    }
}

void WebSocketServer::unregister_session(const std::string& player_id) {
    {
        std::lock_guard lock(sessions_mutex_);
        sessions_.erase(player_id);
    }
    std::cout << "[Server] Session unregistered: " << player_id << "\n";

    // Call remove_player WITHOUT holding sessions_mutex_.
    // Reason: check_all_timeouts holds MatchManager::mutex_ then calls
    // broadcast_state → send_to_player → sessions_mutex_, so acquiring
    // sessions_mutex_ → MatchManager::mutex_ here would create a
    // lock-order inversion deadlock.
    match_mgr_->remove_player(player_id);
}

std::size_t WebSocketServer::active_session_count() const {
    // sessions_mutex_ must already be held by the caller, or call under lock.
    std::size_t count = 0;
    for (const auto& [id, wp] : sessions_) {
        if (!wp.expired()) ++count;
    }
    return count;
}

void WebSocketServer::do_accept() {
    acceptor_.async_accept(
        net::make_strand(ioc_),
        [self = shared_from_this()](beast::error_code ec, tcp::socket socket) {
            if (ec) {
                std::cerr << "[Server] Accept error: " << ec.message() << "\n";
            } else {
                // Enforce connection cap
                if (self->max_connections_ > 0) {
                    std::lock_guard lock(self->sessions_mutex_);
                    if (self->active_session_count() >= self->max_connections_) {
                        std::cout << "[Server] Connection rejected — server full ("
                                  << self->max_connections_ << " max)\n";
                        // Close the raw socket immediately
                        beast::error_code close_ec;
                        socket.close(close_ec);
                        self->do_accept();
                        return;
                    }
                }
                std::make_shared<Session>(std::move(socket), self)->run();
            }
            self->do_accept();
        });
}

void WebSocketServer::start_timeout_checker() {
    if (!timeout_timer_) {
        return;
    }
    
    // Set timer to fire every 1 second
    timeout_timer_->expires_from_now(boost::posix_time::seconds(1));
    timeout_timer_->async_wait([this](const boost::system::error_code& ec) {
        on_timeout_check(ec);
    });
}

void WebSocketServer::on_timeout_check(const boost::system::error_code& ec) {
    if (ec == net::error::operation_aborted) {
        return;  // Timer was cancelled
    }
    
    if (ec) {
        std::cerr << "[Server] Timeout timer error: " << ec.message() << "\n";
        return;
    }
    
    // Check for timeouts in all active matches
    match_mgr_->check_all_timeouts();
    
    // Reschedule the timer
    start_timeout_checker();
}

} // namespace two_spies::network
