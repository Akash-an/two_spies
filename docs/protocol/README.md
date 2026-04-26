# Protocol Documentation Index

Quick guide to finding the right protocol documentation for your task.

---

## 🧭 Navigation

### 📋 **Specific Message Formats**
→ [**Interactions Reference**](./backend-stitch-frontend-interactions.md)
- Complete list of Client ↔ Server messages.
- Detailed payload structures and backend handler locations.

### 🎮 **Complete Game Flow**
→ [**Integration Guide**](./INTEGRATION_GUIDE.md)
- Walkthrough of a complete game session (Lobby → Start → Play → Win).
- Complex interactions like Deep Cover and Intel claiming.

### ⚡ **Quick Reference**
→ [**Quick Reference**](./QUICK_REFERENCE.md)
- One-page message flow charts and validation rules.
- Ability costs and integration checklists.

---

## 🛠 File Structure

| Path | Purpose |
|---|---|
| `backend-stitch-frontend-interactions.md` | Detailed message and payload reference. |
| `QUICK_REFERENCE.md` | Charts, validation rules, and quick lookup tables. |
| `INTEGRATION_GUIDE.md` | Step-by-step flows and code implementation patterns. |

---

## 🚀 Key Files Referenced

- **Frontend Types:** `stitch-frontend/src/types/Messages.ts`
- **Frontend Networking:** `stitch-frontend/src/network/WebSocketClient.ts`
- **Backend Protocol:** `backend/src/protocol/Messages.cpp`
- **Backend Game Logic:** `backend/src/game/GameState.cpp`
- **Match Manager:** `backend/src/game/Match.cpp`
