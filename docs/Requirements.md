# Two Spies — Software Requirements Specification

**Version:** 1.0  
**Date:** 2026-02-28  
**Status:** Active

---

## 1. Overview

This document defines the technical requirements for the Two Spies web application. The system consists of a 2D frontend (React + Phaser) and a real-time multiplayer backend (C++) communicating over WebSockets.

**Goals:**
- Deliver a dynamic 2D game UI using React + TypeScript + Phaser.
- Support turn-based multiplayer gameplay via persistent WebSocket connections.
- Implement an authoritative C++ backend for game logic and session management.

---

## 2. stitch-frontend Requirements

- **Framework:** React 18 + TypeScript.
- **Engine:** Phaser 3 (TypeScript) for 2D game rendering.
- **Networking:** Native WebSocket API, JSON encoding.
- **Centralization:** All networking logic in `stitch-frontend/src/network/WebSocketClient.ts`.

---

## 3. Backend Requirements

- **Language:** C++17 or later.
- **Library:** Boost.Beast (Asio) for WebSocket support.
- **Networking Model:** Handle handshake, message dispatch, and disconnection. Support concurrent match sessions.
- **Security:** TLS (WSS) via OpenSSL for production. Validate all incoming messages.

---

## 4. Game Architecture

- **Authoritative Backend:** The server is the single source of truth. The frontend sends actions; the backend validates them and computes state transitions.
- **Session Model:** Isolated match rooms per active game session.

---

## 5. Development Environment

- **Local Setup:** WebSocket server runnable on a configurable port. Frontend support for hot reload.
- **Tools Summary:**
  - Rendering: Phaser 3
  - Frontend: React 18
  - Client Networking: Browser WebSocket API
  - Backend Server: Boost.Beast
  - Build System: CMake 3.x
  - Containerization: Docker & Docker Compose

---

## 6. Testing Requirements

- **Unit Tests:** Backend game logic, message serialization.
- **Integration Tests:** End-to-end validation between browser client and backend server.

---

## 7. Deployment

- **Frontend:** Static assets served via CDN or static hosting.
- **Backend:** C++ WebSocket server deployed via Docker containers.
- **Protocol:** HTTPS and WSS in production.

---

## 8. Non-Functional Requirements

- **Performance:** Low-latency networking for responsive gameplay.
- **Scalability:** Support multiple simultaneous sessions.
- **Security:** Reject malformed messages; enforce turn-based action validation.
