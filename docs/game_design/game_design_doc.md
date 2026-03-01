# Two Spies — Game Design Document (GDD)

**Overview**
*Two Spies* is a **turn-based 1v1 strategy game of espionage** set on a Cold War-era map of Europe. Two rival spies move secretly between connected cities, gather intelligence, leverage special abilities, and ultimately try to **locate and eliminate the opposing spy**.

---

## 1. Game Objective

> **Be the first player to correctly identify and strike the city where your opponent's spy is currently located.**

Players win a round by eliminating the opponent spy via an accurate strike. A full session is typically a best-of series (e.g., first to 3 wins).

---

## 2. Game World and Setup

### Map

* A graph of interconnected **cities** representing a stylized Cold War Europe.
* Each city is a **node**; connections (edges) define valid movement paths.
* Some cities are **bonus cities** — controlling these yields extra Intel per turn.
* Some cities are **pickup cities** — ending a turn here grants a bonus action or Intel.

### Starting Positions

* Each spy begins in a **random distinct city**.
* Spy positions remain hidden from the opponent until revealed by abilities or mistakes.

---

## 3. Turn Structure

### Actions per Turn

* Each turn consists of **two actions**.
* Actions can be spent on movement, abilities, strike, or wait.
* **Auto-end:** Turns automatically end after 2 actions are consumed.

### Movement

* A move travels to one **adjacent city** along a map edge.
* Moving typically places the player **under cover** (hidden from opponent deduction).

### Strike Action

* A player may use an action to attempt a **strike at their current location**.
* If the opponent is in the same city — the round ends, striker wins.
* If the opponent is not there — the attacking spy's **location is revealed** to the opponent.
* **Implementation note:** Strike no longer requires city selection; it always targets current location.

### Wait Action

* A player may use an action to **wait** — consuming an action point without doing anything.
* Useful for ending turn early while preserving position or resources.

---

## 4. Resources

### Intel

* Intel is the primary resource.
* Earned each turn automatically, with bonuses from **controlled cities**.
* Spent to unlock or activate strategic abilities.

---

## 5. Abilities

All abilities cost Intel and modify information visibility or mobility.

| Ability        | Effect                                                                 |
| -------------- | ---------------------------------------------------------------------- |
| Deep Cover     | Reduces visibility to opponent tracking temporarily.                   |
| Encryption     | Masks what Intel was spent on, limiting opponent deduction.            |
| Locate         | Reveals the opponent's current location with a prominent pulsing yellow marker. The marker disappears after the opponent takes any action. |
| Strike Report  | Provides enhanced information after a strike attempt.                  |
| Rapid Recon    | Grants additional movement options or reveals potential move paths.    |
| Prep Mission   | Grants an extra action or sets up a future positional advantage.       |

---

## 6. Victory Conditions

A player wins a round when:

* They successfully **strike the city** where the opponent's spy is located.

A player loses a round when:

* They are struck in their current city.
* They end their turn in the **same city as the opponent** without cover (immediate reveal/loss).

---

## 7. Stealth and Fog of War

* Player positions are **private** — opponents only learn location through deduction and abilities.
* Ending a turn in the same city as the opponent without cover results in an immediate loss.
* Cover status, city control, and intel spending create a hidden information layer the opponent must reason about.
* Actions and Intel spending can leak positional information — Encryption counters this.

---

## 8. Strategy and Player Goals

Players must balance competing priorities each turn:

| Strategic Element         | Purpose                               |
| ------------------------- | ------------------------------------- |
| Collect Intel             | Unlock strategic abilities            |
| Control bonus cities      | Increase per-turn Intel income        |
| End turns on pickup cities| Gain bonus actions or Intel           |
| Move under cover          | Maintain positional secrecy           |
| Use Encryption            | Prevent Intel spending from leaking   |
| Guess opponent's position | Prepare for a decisive strike         |

Successful play requires **deduction, movement planning, deception, and resource management**.

---

## 9. Game Modes

| Mode         | Description                              |
| ------------ | ---------------------------------------- |
| Quick Match  | Live 1v1 multiplayer (best of 5)         |
| Training Bot | Single-player practice against AI tutor  |
| Custom Maps  | User-created city graphs and layouts     |

---

## 10. Game Loop Summary

```
1. Initialization
   - Assign random distinct starting cities
   - Reset Intel to base value

2. Player Turn (repeat until win condition)
   - Player takes 2 actions: move, use ability, or strike
   - Server validates action and updates state
   - Server broadcasts filtered state to each player

3. Resource Collection (end of turn)
   - Intel += base rate + controlled city bonuses

4. Win Check
   - If strike hits opponent city → round over, striker wins
   - If both spies end turn in same city without cover → cover-blown loss
```

---

## 11. Implementation Notes

* Player positions must **never be sent to the wrong client**. The server must filter state per player before broadcasting.
* Map data (city nodes + edges) must be **external config**, not hardcoded in game logic.
* All action validation happens **server-side**. The client only sends intent.
* Intel costs and ability effects must be defined in a **centralized data structure** to allow balancing without logic changes.
* Cover state changes must be computed and enforced by the server each turn.

---

## 12. Visual Reference

The following screenshots from the original *Two Spies* game are stored in `docs/mockups/` and serve as the authoritative visual reference for UI layout, game board design, and UX decisions.

### Game Start
![Game Start](../mockups/game_start.jpg)
Shows the initial board state when a match begins — city graph layout, starting positions, and the initial UI chrome.

### Game Turn
![Game Turn](../mockups/game_turn.jpg)
Shows the in-progress turn view — the full board, player status, Intel counters, and action state during an active turn.

### Possible Actions
![Possible Actions](../mockups/possible_actions.jpg)
Shows the action selection strip — the UI element presented to the player when choosing between available actions (move, ability, strike).

### Game End
![Game End](../mockups/game_end.jpg)
Shows the end-of-round screen — the result state displayed when a strike lands or cover is blown.
