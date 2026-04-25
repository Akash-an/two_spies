# Two Spies — Software Requirements Specification

**Version:** 1.0  
**Date:** 2026-02-28  
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [stitch-frontend Requirements](#2-stitch-frontend-requirements)
3. [Backend Requirements](#3-backend-requirements)
4. [Game Architecture](#4-game-architecture)
5. [Development Environment](#5-development-environment)
6. [Testing Requirements](#6-testing-requirements)
7. [Deployment](#7-deployment)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Deliverables](#9-deliverables)
10. [Next Steps](#10-next-steps)

---

## 1. Overview

This document defines the technical requirements for porting the Two Spies board game to a fully browser-playable web application. The system consists of a 2D frontend rendered with React and Phaser, and a real-time multiplayer backend written in C++ communicating over WebSockets.

> **⚠️ TERMINOLOGY (Critical): "frontend" now ALWAYS refers to `stitch-frontend/` exclusively. The older `frontend/` directory is **DEPRECATED** and must NOT be used for any new development or implementation work.**

**Goals:**

- Deliver a dynamic 2D game UI rendered in the browser using React + TypeScript + stitch-frontend/src (Phaser for game scenes).
- Support turn-based multiplayer gameplay via persistent WebSocket connections.
- Implement an authoritative C++ backend responsible for game logic, session management, and state broadcast.

---

## 2. stitch-frontend Requirements

### 2.1 Game Engine & UI Framework

- **React 18** + **TypeScript** is the primary framework (located at `stitch-frontend/`).
- **Phaser 3** (TypeScript) is embedded for 2D game rendering and canvas control.
- Must handle rendering, animations, user input, and interactions.
- The Phaser canvas must be embeddable within React components.

### 2.2 Networking

- Use the browser's native **WebSocket API** for server communication.
- Connections must be persistent for the duration of a game session.
- Messages must be encoded in **JSON**.
- All networking logic centralized in `stitch-frontend/src/network/WebSocketClient.ts`

---

## 3. Backend Requirements

### 3.1 Language and Compiler

- Implemented in **C++17** or later.
- Must use modern language features including structured bindings, `std::optional`, and async programming primitives.

### 3.2 WebSocket Library

One of the following libraries must be used for WebSocket server support:

| Library | Notes |
|---|---|
| **Boost.Beast** *(preferred)* | HTTP and WebSocket support via Boost.Asio. Well-suited for async servers. Requires Boost.Asio and optionally OpenSSL for TLS. |
| **uWebSockets** | High-performance async WebSocket/HTTP library. Suitable for latency-sensitive scenarios. |

### 3.3 Networking Model

- Must handle the full WebSocket lifecycle: handshake, message dispatch, and disconnection.
- Must support concurrent hosting of multiple match sessions.
- Must broadcast game state change events to all participants in a session.

### 3.4 Message Protocol

A formal message schema must be defined for all client-to-server and server-to-client communication. Message types include:

- **Player actions:** move, attack, end turn
- **Game state updates:** board state, turn changes, game over
- **Lobby / matchmaking events:** join, leave, ready

### 3.5 Security

- Production deployments must use **TLS (WSS)** via OpenSSL integration (required for Boost.Beast).
- All incoming messages must be validated before processing.
- Sessions must be managed with authenticated tokens.

### 3.6 Build and Dependencies

- **Supported platforms:** Linux, Windows
- **Build system:** CMake 3.x or later
- **Required dependencies:**
  - Boost (Beast + Asio)
  - OpenSSL
- **Optional dependencies:** serialization libraries, session store

---

## 4. Game Architecture

### 4.1 Authoritative Backend

- The backend is the single source of truth for all game state.
- The stitch-frontend sends player actions; the backend validates them and computes state transitions.
- Clients must not be trusted to self-report game outcomes.

### 4.2 Turn-Based Session Model

- The server maintains isolated match rooms per active game session.
- All state transitions are computed server-side and broadcast to the relevant connected clients.

---

## 5. Development Environment

### 5.1 Local Setup

- The WebSocket server must be runnable locally on a configurable port.
- The stitch-frontend must support hot reload during development.
- The browser client must connect to a local WebSocket endpoint specified via environment configuration.

### 5.2 Tools and Libraries Summary

| Category | Tool / Library |
|---|---|
| Rendering | Phaser 3 |
| stitch-frontend Framework | Angular or React |
| Client Networking | Browser WebSocket API |
| Backend Server | Boost.Beast or uWebSockets |
| Build System | CMake 3.x |
| Secure WebSockets | OpenSSL |

---

## 6. Testing Requirements

### 6.1 Unit Tests

- Backend game logic correctness
- Message serialization and deserialization
- WebSocket connection handling and lifecycle

### 6.2 Integration Tests

- End-to-end validation between browser client and backend server
- Concurrent session stress tests to verify stability under load

---

## 7. Deployment

- **stitch-frontend:** Static assets (HTML, JS, CSS) served via CDN or static hosting (e.g., Netlify, Vercel).
- **Backend:** C++ WebSocket server deployed on a cloud VM or container service (e.g., AWS, DigitalOcean).
- All traffic must use **HTTPS** and **WSS** in production.

---

## 8. Non-Functional Requirements

### 8.1 Performance

- Network round-trip latency must be minimized to ensure a responsive gameplay experience.
- The backend must handle multiple concurrent matches efficiently without degradation.

### 8.2 Scalability

- The system must support multiple simultaneous game sessions from launch.
- Backend architecture should accommodate horizontal scaling if session volume grows.

### 8.3 Security

- The server must reject and log malformed or unexpected messages.
- All client sessions must be authenticated via token validation before action processing.

---

## 9. Deliverables

- stitch-frontend game client built with Phaser (TypeScript)
- C++ WebSocket server implementing the rules engine and match handling
- Formal protocol specification defining all message schemas
- CI/CD pipeline for automated testing and deployment

---

## 10. Next Steps

1. Define and document all message formats as a JSON schema.
2. Prototype the WebSocket handshake and basic message exchange.
3. Build a Phaser test scene with placeholder interactions.
4. Implement server-side turn logic.
5. Expand to the full game ruleset and polished UI.
