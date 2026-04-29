# Two Spies — Data Models

> Complete reference for all data structures shared between the frontend (TypeScript) and backend (C++).

---

## TypeScript Types (`stitch-frontend/src/types/Messages.ts`)

### Primitive Types

```typescript
/** Player identifier / team colour — 'RED' or 'BLUE' */
type PlayerSide = 'RED' | 'BLUE';
```

---

### Enums

```typescript
/** All client → server message types */
enum ClientMessageType {
  SET_PLAYER_NAME = 'SET_PLAYER_NAME',
  CREATE_MATCH    = 'CREATE_MATCH',
  JOIN_MATCH      = 'JOIN_MATCH',
  PLAYER_ACTION   = 'PLAYER_ACTION',
  END_TURN        = 'END_TURN',
  ABORT_MATCH     = 'ABORT_MATCH',
  LEAVE_MATCH     = 'LEAVE_MATCH',
}

/** All server → client message types */
enum ServerMessageType {
  MATCH_CREATED       = 'MATCH_CREATED',
  MATCH_START         = 'MATCH_START',
  MATCH_STATE         = 'MATCH_STATE',
  TURN_CHANGE         = 'TURN_CHANGE',
  GAME_OVER           = 'GAME_OVER',
  ERROR               = 'ERROR',
  WAITING_FOR_OPPONENT = 'WAITING_FOR_OPPONENT',
}

/** Action kinds a player can perform */
enum ActionKind {
  MOVE    = 'MOVE',
  STRIKE  = 'STRIKE',
  ABILITY = 'ABILITY',
  WAIT    = 'WAIT',
  CONTROL = 'CONTROL',
}

/** All ability identifiers */
enum AbilityId {
  DEEP_COVER    = 'DEEP_COVER',     // 20 Intel — invisibility for 1 full turn cycle
  LOCATE        = 'LOCATE',         // 10 Intel — reveal opponent location
  STRIKE_REPORT = 'STRIKE_REPORT',  // 10 Intel — permanent: learn opponent city on their miss
  ENCRYPTION    = 'ENCRYPTION',     // 25 Intel — permanent: hides opponent notification flags
  RAPID_RECON   = 'RAPID_RECON',    // 40 Intel — permanent: reveals opponent when entering their city
  PREP_MISSION  = 'PREP_MISSION',   // 40 Intel — per-use: grants +1 action next turn
}
```

---

### Map Structures

```typescript
/** A city node on the game map */
interface CityDef {
  id:   string;   // unique identifier (e.g., "nyc", "london")
  name: string;   // display name (e.g., "New York City")
  x:    number;   // normalized 0.0–1.0 horizontal position
  y:    number;   // normalized 0.0–1.0 vertical position
}

/** A directed edge between two cities (graph is undirected — edges apply both ways) */
interface EdgeDef {
  from: string;   // city id
  to:   string;   // city id
}

/** Complete map definition — sent once via MATCH_START */
interface MapDef {
  cities: CityDef[];
  edges:  EdgeDef[];
}
```

---

### Game State

```typescript
/** Intel popup — indicates an Intel marker appeared on a city */
interface IntelPopup {
  city:   string;  // city_id where the marker appeared
  amount: number;  // Intel reward (typically 10)
}

/** Action popup — indicates an Action marker appeared on a city */
interface ActionPopup {
  city:   string;  // city_id where the marker appeared
}

/** Per-player game state — filtered by the server (fog of war) */
interface PlayerState {
  side:             PlayerSide;
  name:             string;
  currentCity:      string;         // own current location (always visible)
  intel:            number;         // current Intel balance
  actionsRemaining: number;         // 0–2
  hasCover:         boolean;        // is the player hidden?

  // Opponent visibility (only set when revealed by game actions)
  knownOpponentCity?: string | null;  // null = unknown

  // Available abilities
  abilities: AbilityId[];

  // Ability state
  strikeReportUnlocked:     boolean;  // has STRIKE_REPORT been purchased?
  encryptionUnlocked:       boolean;  // has ENCRYPTION been purchased?
  rapidReconUnlocked:       boolean;  // has RAPID_RECON been purchased?
  prepMissionActive:        boolean;  // is PREP_MISSION queued for next turn?
  locateBlockedByDeepCover: boolean;  // own LOCATE was blocked this turn
  claimedIntel:             boolean;  // claimed an Intel marker this turn

  // Per-turn opponent action flags (cleared each turn)
  opponentUsedStrike:            boolean;
  opponentUsedLocate:            boolean;
  opponentUsedDeepCover:         boolean;
  opponentUsedControl:           boolean;
  opponentClaimedIntel:          boolean;
  opponentUnlockedStrikeReport:  boolean;
  opponentStrikeReportActive:    boolean;

  // Starting positions (for UI reference)
  startingCity:         string;
  opponentStartingCity: string;
}

/** Full match state — received in MATCH_STATE messages */
interface MatchState {
  sessionId:   string;
  turnNumber:  number;
  currentTurn: PlayerSide;

  // Own state (always fully populated)
  player: PlayerState;

  // Opponent info (name only; location in player.knownOpponentCity if revealed)
  opponentName: string;

  // Map (only included in first MATCH_STATE after MATCH_START)
  map?: MapDef;

  // Game over state
  gameOver: boolean;
  winner:   PlayerSide | null;

  // Opponent movement hint (for UI notification)
  opponentMovedFromStart: boolean;

  // Turn timer
  turnDuration:  number;       // total ms per turn (30000)
  timeElapsedMs: number;       // ms elapsed in current turn

  // Shrinking map
  scheduledDisappearCity?: string | null;  // city ID about to disappear
  disappearedCities:       string[];       // all permanently removed city IDs
  isPlayerStranded:        boolean;        // own city is scheduled to disappear

  // City control
  controlledCities: Record<string, PlayerSide>;  // city_id → side

  // Intel markers currently on the map
  intelPopups: IntelPopup[];

  // Action markers currently on the map
  actionPopups: ActionPopup[];
}
```

---

### Server Message Payloads

```typescript
/** Generic server message wrapper */
interface ServerMessage {
  type:       ServerMessageType;
  sessionId?: string;
  payload:    unknown;
}

interface MatchStartPayload {
  side: PlayerSide;
  map:  MapDef;
}

interface GameOverPayload {
  winner: PlayerSide;
  reason: string;
}

interface TurnChangePayload {
  previousTurn: PlayerSide;
  currentTurn:  PlayerSide;
  reason:       string;  // "actions_exhausted" | "end_turn_requested" | "timeout"
}

interface ErrorPayload {
  message: string;
}
```

---

### Client Action Payloads

```typescript
interface MovePayload {
  action:     ActionKind.MOVE;
  targetCity: string;
}

interface StrikePayload {
  action:     ActionKind.STRIKE;
  targetCity: string;
}

interface AbilityPayload {
  action:     ActionKind.ABILITY;
  abilityId:  AbilityId;
  targetCity?: string;  // required for some abilities (not currently used)
}

interface WaitPayload {
  action: ActionKind.WAIT;
}

interface ControlPayload {
  action: ActionKind.CONTROL;
}

/** Union of all valid action payloads */
type ActionPayload =
  | MovePayload
  | StrikePayload
  | AbilityPayload
  | WaitPayload
  | ControlPayload;
```

---

## C++ Structs (`backend/include/`)

### `Player.hpp` — PlayerData

```cpp
namespace two_spies::game {

enum class PlayerSide { RED, BLUE };

enum class AbilityId {
  DEEP_COVER,
  ENCRYPTION,
  LOCATE,
  STRIKE_REPORT,
  RAPID_RECON,
  PREP_MISSION,
};

struct PlayerData {
  PlayerSide side;
  std::string name;
  std::string current_city;
  std::string starting_city;

  int intel              = 2;     // starting Intel
  int actions_remaining  = 2;     // per turn
  bool has_cover         = false;

  // Revealed opponent location (empty string = unknown)
  std::string known_opponent_city;

  // Available abilities
  std::vector<AbilityId> abilities = { AbilityId::LOCATE,
                                       AbilityId::DEEP_COVER,
                                       AbilityId::STRIKE_REPORT };

  // Per-turn opponent flags (cleared at start of own turn)
  bool opponent_used_strike              = false;
  bool opponent_used_locate              = false;
  bool opponent_used_deep_cover          = false;
  bool opponent_used_control             = false;
  bool opponent_claimed_intel            = false;
  bool opponent_unlocked_strike_report   = false;

  // Own ability state
  bool locate_blocked_by_deep_cover = false;
  bool strike_report_unlocked       = false;
  bool strike_report_active         = false;  // passive — triggers on opponent miss
  bool encryption_unlocked          = false;  // permanent — hides opponent flags
  bool rapid_recon_unlocked         = false;  // permanent — reveals opponent on entry
  bool prep_mission_active          = false;  // queued for next turn

  // Deep Cover state
  bool deep_cover_active      = false;
  int  deep_cover_used_on_turn = -1;  // for expiry tracking

  // Movement tracking
  bool has_moved_from_start            = false;
  std::unordered_set<std::string> visited_cities;
  bool moved_to_new_city_this_turn     = false;

  // Intel marker
  bool claimed_intel_this_turn       = false;
  std::string intel_claimed_from_city;

  // Action marker
  bool claimed_action_this_turn       = false;
  std::string action_claimed_from_city;
};

} // namespace two_spies::game
```

---

### `GameState.hpp` — ActionResult + IntelPopup

```cpp
namespace two_spies::game {

/** Return value for all game actions */
struct ActionResult {
  bool        ok              = false;
  std::string error;           // human-readable if !ok
  bool        game_over       = false;
  PlayerSide  winner;
  std::string game_over_reason;
};

/** Represents an Intel marker placed on the map */
struct IntelPopup {
  std::string city_id;
  int         amount       = 10;
  int         turn_created = 0;
};

/** Represents an Action marker placed on the map */
struct ActionPopup {
  std::string city_id;
  int         turn_created = 0;
};

} // namespace two_spies::game
```

---

### `CityGraph.hpp` — City + MapDef

```cpp
namespace two_spies::game {

struct City {
  std::string id;
  std::string name;
  float x;   // normalized 0.0–1.0
  float y;
};

struct MapDef {
  std::vector<City>                          cities;
  std::vector<std::pair<std::string, std::string>> edges;  // {from, to}
};

class CityGraph {
public:
  explicit CityGraph(const MapDef& map);
  bool are_adjacent(const std::string& from, const std::string& to) const;
  std::vector<std::string> adjacent(const std::string& city_id) const;
  bool has_city(const std::string& city_id) const;
  const City& get_city(const std::string& city_id) const;
};

} // namespace two_spies::game
```

---

### `Match.hpp` — Match

```cpp
namespace two_spies::network {

using SendFn = std::function<void(const std::string& player_id, const std::string& message)>;

class Match {
public:
  static constexpr int TURN_DURATION_MS = 30000;

  explicit Match(const std::string& session_id, SendFn send_fn);

  void add_player(const std::string& player_id, const std::string& name);
  void start();
  void handle_action(const std::string& player_id, const protocol::IncomingMessage& msg);
  void handle_disconnect(const std::string& player_id);

private:
  std::string                 session_id_;
  std::string                 red_player_id_;
  std::string                 blue_player_id_;
  game::GameState             state_;
  SendFn                      send_fn_;
  mutable std::mutex          mutex_;

  // Turn timer
  std::shared_ptr<boost::asio::steady_timer> turn_timer_;
};

} // namespace two_spies::network
```

---

## Type Alignment Table

Every field in `MatchState` (TypeScript) maps to a field in `serialize_match_state()` in `backend/src/protocol/Messages.cpp`. When adding new state fields, both sides must be updated simultaneously.

| TypeScript field | C++ source | Notes |
|---|---|---|
| `player.currentCity` | `PlayerData::current_city` | Always own city |
| `player.intel` | `PlayerData::intel` | Own Intel only |
| `player.actionsRemaining` | `PlayerData::actions_remaining` | |
| `player.hasCover` | `PlayerData::has_cover` | |
| `player.knownOpponentCity` | `PlayerData::known_opponent_city` | Empty string → null in JSON |
| `player.strikeReportUnlocked` | `PlayerData::strike_report_unlocked` | |
| `player.opponentUsedStrike` | `PlayerData::opponent_used_strike` | |
| `disappearedCities` | `GameState::disappeared_cities_` | Same for both players |
| `controlledCities` | `GameState::controlled_cities_` | All cities, both sides |
| `isPlayerStranded` | computed: player city == scheduled disappear | |
| `intelPopups` | `GameState::intel_popups_` | Filtered per player |
| `actionPopups` | `GameState::action_popups_` | Filtered per player |
| `turnDuration` | `Match::TURN_DURATION_MS` | Constant 30000 |
| `timeElapsedMs` | Match timer elapsed | Computed per broadcast |
