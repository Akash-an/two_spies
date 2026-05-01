# Concurrent Match Capacity Analysis — Two Spies Backend

This document provides a detailed analysis of the current backend architecture's capacity to handle concurrent matches and identifies potential scaling bottlenecks.

## 1. Architectural Hard Limits

### 1.1 Room Code Space
The `MatchManager` generates 4-digit numeric room codes (1000–9999) for players to share.
- **Limit**: **9,000** concurrent **waiting** rooms.
- **Behavior**: Once a second player joins a room, the code is "consumed" and removed from the active mapping, freeing it up for reuse. Therefore, this limit only applies to matches in the `WAITING_FOR_OPPONENT` state.

### 1.2 Session ID Uniqueness
Session IDs are generated using `match-<timestamp>-<match_count>`. 
- **Limit**: Effectively unlimited.
- **Collision Risk**: Extremely low. The use of a timestamp in milliseconds combined with the current size of the match map (protected by a mutex) ensures uniqueness within a single instance.

## 2. Resource-Based Estimates

### 2.1 Memory Usage
Each match consists of a `Match` object, a `GameState` (including the `CityGraph`), and two `WebSocket` sessions.
- **Match + GameState**: ~10–20 KB
- **WebSocket Session (Buffers/State)**: ~40–60 KB per player
- **Total per Match**: ~100–150 KB
- **Capacity**:
  - **1,000 Matches**: ~150 MB RAM
  - **10,000 Matches**: ~1.5 GB RAM
  - **50,000 Matches**: ~7.5 GB RAM (approaching limits of typical mid-tier cloud instances)

### 2.2 File Descriptors (Sockets)
This is the most likely **immediate bottleneck** for a production deployment.
- Each player uses 1 socket. 1 Match = 2 Sockets.
- **OS Default (`ulimit -n`)**: Often 1,024.
- **Default Limit**: **~512 matches**.
- **Tuned Limit**: With `ulimit -n 65535`, the server could theoretically support **~32,700 matches**.

## 3. Threading and Async Architecture

The backend leverages **Boost.Asio** and **Boost.Beast** for its asynchronous core, following the "Proactor" pattern.

### 3.1 Multi-Threaded I/O
The server runs a thread pool (default: 4 threads). Each thread runs an `io_context` loop, allowing it to handle thousands of concurrent I/O operations (reads, writes, timers) with minimal overhead.

### 3.2 Thread Safety & Strands
To prevent race conditions without excessive locking, the backend uses **Strands**.
- **Per-Connection Serialization**: A strand ensures that handlers for a specific WebSocket session are executed sequentially, even if multiple threads are available.
- **Mutexes**: 
  - `MatchManager` uses a global mutex for room creation/joining.
  - `Match` uses a per-match mutex to protect the `GameState`. Since each match only involves two players, contention here is negligible.

### 3.3 Asynchronous Writing
WebSocket writes are managed via a `write_queue_` in the `Session` class. This ensures that only one `async_write` is active at a time per connection, preventing "write already in progress" errors while maintaining high throughput.

## 4. Scalability Bottlenecks

| Bottleneck | Impact | Mitigation |
| :--- | :--- | :--- |
| **Global Match Mutex** | Contention on match creation/joining. | Shard the `MatchManager` or use more granular locking. |
| **Single Process** | Limited to one physical/virtual machine. | Implement Redis-based state for multi-instance scaling. |
| **Linear Timeout Check** | CPU usage spikes as matches reach 100k+. | Use a priority queue or timer-wheel for timeout management. |
| **Room Code Collisions** | `generate_room_code` retries as the space fills up. | Increase code length or use a more efficient pool. |

## 5. Conclusion & Recommendations

The current implementation is highly efficient for a medium-scale game.

- **Current Capacity**: **~500 matches** (unconfigured OS) to **~30,000 matches** (tuned OS).
- **Primary Recommendation**: If targeting >10,000 concurrent matches, ensure the production environment has `ulimit -n` set to at least `100,000`.
- **Future-Proofing**: To scale beyond a single machine, a session-affinity load balancer and a shared state store (like Redis) would be required.
