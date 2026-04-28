# Two Spies — Game Design Document (GDD)

*Two Spies* is a turn-based 1v1 strategy game of espionage. Two rival spies move secretly between cities, gather intelligence, and try to locate and eliminate each other.

For detailed design philosophy and mechanic breakdowns, see **[Mechanics Reasoning](MECHANICS_REASONING.md)**.

---

## 1. Objective
**Eliminate the opponent's spy by striking the city they are in.**
Victory is achieved via an accurate strike or if the opponent ends their turn in the same city as you without cover.

---

## 2. Core Mechanics

### Turn Structure
- **Actions:** 2 per turn (Move, Strike, Ability, or Wait).
- **Auto-end:** Turns end after 2 actions or manual "End Turn".

### Movement & Stealth
- **Movement:** Travel to an adjacent city. Grants **Cover** (hidden state).
- **Wait:** Stay in place. Grants **Cover**.
- **Visibility:** Striking, taking Control, or being "Locate"-ed reveals your position.

### Resources (Intel)
- **Starting Intel:** 2
- **Base Income:** +4 Intel per turn (awarded at end of turn).
- **Exploration Bonus:** +4 Intel for moving to a new city (city you haven't visited yet).
- **Intel Markers:** +10 Intel for ending your turn in a city with an Intel pop-up.
  - *Warning:* Claiming an Intel marker reveals your current position to the opponent.

---

## 3. Map & Board Pressure
- **Shrinking Map:** A city is marked at action 4 and disappears at action 6 of every cycle.
- **Stranded Status:** If in a city when it disappears, you can only **MOVE** until you leave that city.

---

## 4. Abilities

| Ability | Cost | Effect |
|---|---|---|
| **Locate** | 10 | Reveals opponent's current location. Blocked by Deep Cover. |
| **Strike** | 1 Action | Attempts elimination at **current** location. |
| **Deep Cover** | 30 | Invisibility for current turn and opponent's next turn. |
| **Control** | 1 Action | Take control of city. Reveals your position. |
| **Strike Report**| 20 | Permanent. Reveals opponent's location if they miss a strike. |

---

## 5. Visual Reference

Authoritative visual reference for UI layout and game board design:

- **[Game Start](docs/old_mockups/game_start.jpg)**
- **[Game Turn](docs/old_mockups/game_turn.jpg)**
- **[Possible Actions](docs/old_mockups/possible_actions.jpg)**
- **[Game End](docs/old_mockups/game_end.jpg)**
