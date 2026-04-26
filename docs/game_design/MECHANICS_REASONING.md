# Game Mechanics & Design Reasoning

This document contains the detailed reasoning, strategic logic, and implementation principles for the core mechanics of Two Spies.

---

## 1. Shrinking Map Mechanic

To add strategic pressure and prevent indefinitely long matches, the game board progressively shrinks throughout the match.

### Strategic Impact
* **Urgency:** Disappearing cities force players to keep moving and avoid getting trapped in corners.
* **Encouragement of Movement:** Prevents "camping" in one location indefinitely.
* **Timing Strategy:** Players must reason about the cumulative action count to predict which cities will vanish next.
* **Dynamic Gameplay:** Random city selection keeps the map state unpredictable and engaging.

### Stranded Player Logic
If a player is in a city when it disappears, they become **stranded**. This state restricts them to only the **MOVE** action. This ensures that environmental hazards have a direct impact on player agency without being an instant game-over, creating a "get out now" tension.

---

## 2. Intel & Resource Economy

Intel serves as both a currency and a measure of player progress.

### Income Breakdown
* **Base Income (+4):** Ensures all players eventually gain access to basic abilities.
* **Exploration Bonus (+4):** Rewards active play and map traversal. This creates a trade-off between staying hidden in a safe area and venturing out to gain a resource advantage.
* **Timeout Clause:** The bonus is withheld on timeouts to discourage stall tactics and reward active decision-making within the time limit.

---

## 3. Stealth & Cover Strategy

The cover system is the heart of the game's hidden information layer.

### Visibility Trade-offs
* **MOVE/WAIT:** These actions prioritize secrecy. By resetting cover, they allow the player to disappear back into the "fog".
* **STRIKE/CONTROL:** These actions prioritize impact. They reveal the player's location as a cost for attempting to win or gain resources.
* **LOCATE:** A high-cost ability that forces the opponent out of cover. It's a "scanned" mechanic that provides a temporary tactical advantage.

---

## 4. Deep Cover Philosophy

**Deep Cover** is designed as a powerful defensive "ult" that allows for high-risk plays:
* **Infiltration:** Entering opponent-controlled cities without being blown.
* **Evasion:** Intentionally baiting a Locate attempt only to block it and reveal the attacker.
* **Protection Timing:** Deep Cover persists through the opponent's next turn, providing a guaranteed window of safety against detection.

---

## 5. Strategy and Player Goals

Players must balance competing priorities each turn:

| Strategic Element | Purpose |
|---|---|
| **Collect Intel** | Unlock strategic abilities. |
| **Control Cities** | Force opponent out of cover if they enter your territory. |
| **Move under cover** | Maintain positional secrecy. |
| **Guess position** | Prepare for a decisive strike. |

---

## 6. Implementation Principles

* **Server Authoritative:** All validation and state transitions happen on the backend.
* **Filtered State:** Each client only receives information the rules allow them to see.
* **External Config:** Map data and Intel costs should be configurable.
* **Deterministic Logic:** No RNG is used in strikes or movement. Success is purely a function of positioning and resource management.
