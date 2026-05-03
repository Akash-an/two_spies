# Two Spies — Game Design Document (GDD)

*Two Spies* is a turn-based 1v1 strategy game of espionage. Two rival spies move secretly between cities, gather intelligence, and try to locate and eliminate each other.

For detailed design philosophy and mechanic breakdowns, see **[Mechanics Reasoning](MECHANICS_REASONING.md)**.

---

## 1. Objective
**Eliminate the opponent's spy by striking the city they are in.**
Victory is achieved via an accurate **STRIKE** on the city the opponent currently occupies. There is no "end-turn-in-same-city = loss" rule; same-city situations instead trigger cover effects (see Cover, below).

> Canonical reference: the in-game **Field Manual** ("SPY TRAINING 101"). Where this GDD and the Field Manual disagree, the Field Manual wins.

---

## 2. Core Mechanics

### Turn Structure
- **Actions:** 2 per turn (Move, Strike, Ability, or Wait). Prep Mission can grant 3 actions.
- **Auto-end:** Turns end after all actions or manual "End Turn".

### Movement & Stealth
- **Movement:** Travel to an adjacent city. Grants **Cover** when entering a *safe* city (neutral or your own controlled city). Entering a **target-controlled** city blows your cover (unless Deep Cover is active).
- **Wait:** Stay in place. Grants **Cover** when in a safe city. **You cannot WAIT in a target-controlled city** (action is rejected).
- **Visibility / Cover-blowing triggers:**
  - Taking **Control** of a city.
  - **Starting a turn in the same city as your target** — the player whose turn is starting has their cover blown.
  - Being **Locate**-ed.
  - Claiming an Intel or Action pickup (start-of-turn).
  - A missed **Strike** — *only* if the defender has unlocked **Strike Reports**. Otherwise a miss does **not** blow the striker's cover.
  - Entering a target-controlled city without active Deep Cover.

### Resources (Intel)
- **Starting Intel:** 2
- **Base Income:** +4 Intel per turn (awarded at end of turn).
- **Exploration Bonus:** +4 Intel for moving to a new city (city you haven't visited yet).
- **Controlled City Income:** +4 Intel per controlled city at end of turn.
- **Intel Markers:** +10 Intel for ending your turn in a city with an Intel pop-up.
  - *Warning:* Claiming an Intel marker reveals your current position to the opponent.
- **Action Markers:** Separate pickups that spawn every 5–8 actions on random cities. Ending your turn on one grants +1 action next turn but blows your cover.

---

## 3. Map & Board Pressure
- **Shrinking Map:** A city is marked at action 4 and disappears at action 6 of every cycle.
- **Stranded Status:** If in a city when it disappears, you can only **MOVE** until you leave that city.

---

## 4. Abilities

| Ability | Cost | Type | Effect |
|---|---|---|---|
| **Locate** | 10 | Per-use | Reveals opponent's current location. Blocked by Deep Cover. |
| **Strike** | 1 Action | — | Attempts elimination at **current** location. |
| **Deep Cover** | 20 | Per-use | Invisibility for current turn and opponent's next turn. Must be last action. Cannot use in opponent-controlled city. |
| **Control** | 1 Action | — | Take control of city. Reveals your position. Generates +4 Intel/turn. |
| **Strike Report** | 10 | Permanent | Reveals opponent's location if they miss a strike. |
| **Encryption** | 25 | Permanent | Hides all opponent notification flags. Opponent's abilities still work, but you are not notified. |
| **Rapid Recon** | 40 | Permanent | When entering a city where your opponent is, their cover is blown and you learn their position. Blocked by opponent's Deep Cover. |
| **Prep Mission** | 40 | Per-use | Must be last action. Cannot use in opponent-controlled city. Grants +1 action (total 3) on your next turn. |

---

## 5. Visual Reference

Authoritative visual reference for UI layout and game board design:

- **[Game Start](docs/old_mockups/game_start.jpg)**
- **[Game Turn](docs/old_mockups/game_turn.jpg)**
- **[Possible Actions](docs/old_mockups/possible_actions.jpg)**
- **[Game End](docs/old_mockups/game_end.jpg)**
