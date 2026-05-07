# Two Spies

A browser-based multiplayer strategy game of espionage. Two players move secretly between connected cities, gather intelligence, and try to locate and eliminate the opponent's spy.

This game was originally created by: https://playspies.com/

This was a vibe coded project and contributions are welcome.

---

## 🛠 Technical Details

### Tech Stack
- **stitch-frontend:** React 18 + Phaser 3 + TypeScript + Tailwind CSS (`stitch-frontend/`)
- **Backend:** C++17 + Boost.Asio/Beast + OpenSSL
- **Protocol:** JSON (nlohmann/json) over WebSocket
- **Architecture:** Server-authoritative, turn-based, deterministic

### 🚀 Getting Started

To get the game running locally or set up your development environment, follow the **[Development & Getting Started Guide](docs/DEVELOPMENT.md)**.

#### Using Docker (Recommended)
The easiest way to run the entire stack is using Docker:

```bash
# Start in Development Mode
./scripts/docker-run.sh

# Start in Production Mode (Traefik + SSL)
./scripts/docker-run.sh --prod
```

- **Dev Frontend:** http://localhost:5173
- **Prod URL:** https://spies.atyourservice-ai.com

### 📁 Project Structure
- `stitch-frontend/`: React + Tailwind game client
- `backend/`: C++ WebSocket server
- `protocol/`: Shared JSON schemas
- `docs/`: Project documentation
- `tests/`: Canonical test location

### 📖 Documentation

- **[Game Design Doc](docs/game_design/game_design_doc.md)** — Rules, abilities, and mechanics.
- **[Architecture](docs/architecture.md)** — System design and component interactions.
- **[Development Guide](docs/DEVELOPMENT.md)** — Getting started, build instructions, and dev workflow.
- **[Protocol Index](docs/protocol/README.md)** — Message reference and integration guides.

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
