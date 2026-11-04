# Security Specification: Chess Club Rating System

## 1. Data Invariants

### 1.1 Authentication & Authorization
- Any authenticated user (including anonymous sessions and club organizer accounts) can read players, matches, and snapshots.
- Any authenticated user or administrator (`jcharles794@gmail.com`) can create and update players, record matches, or create snapshots.
- Delete operations on players, match ledger records, and snapshots are permitted to authenticated directors/users to support error corrections and roster administration.
- Unauthenticated requests are rejected.

### 1.2 Structural & Size Invariants
- `playerId`: must be non-empty string between 1 and 64 characters matching the document path ID.
- `matchId`: must be non-empty string between 1 and 64 characters matching the document path ID.
- Player `name`: non-empty string, 1 to 100 characters.
- Player `currentRating`, `initialRating`, `peakRating`: numbers between 100 and 3500.
- Player `category`: one of `['Open', 'Junior', 'Veteran', 'Women']`.
- Player `gamesPlayed`, `wins`, `draws`, `losses`, `whiteWins`, `blackWins`, `attendanceCount`: non-negative integers >= 0.
- Match `result`: one of `['1-0', '0-1', '1/2-1/2']`.
- Match `timeControl`: one of `['Classical', 'Rapid', 'Blitz']`.
- Match `whiteRatingBefore`, `whiteRatingAfter`, `blackRatingBefore`, `blackRatingAfter`: numbers between 100 and 3500.
- Match `whiteDelta`, `blackDelta`: numbers between -100 and 100.

---

## 2. The Dirty Dozen: Edge Cases & Hostile Payloads

### Test Case 1: Unauthenticated Read
- **Description**: Anonymous unauthenticated visitor attempting to read players.
- **Request**: `get /players/p1` with `auth: null`.
- **Expected Result**: DENIED.

### Test Case 2: Unauthenticated Write
- **Description**: Unauthenticated actor attempting to create a match.
- **Request**: `create /matches/m1` with `auth: null`.
- **Expected Result**: DENIED.

### Test Case 3: Oversized Player Name
- **Description**: Attacker submitting a 2000-character name to trigger buffer/display issues.
- **Payload**:
```json
{
  "id": "p1",
  "name": "A".repeat(2000),
  "currentRating": 1400,
  "initialRating": 1400,
  "peakRating": 1400,
  "category": "Open",
  "gamesPlayed": 0,
  "wins": 0,
  "draws": 0,
  "losses": 0
}
```
- **Expected Result**: DENIED (`isValidString` length check).

### Test Case 4: Impossible Elo Rating (Negative or 99999)
- **Description**: Malicious injection of unrealistic Elo rating.
- **Payload**:
```json
{
  "id": "p1",
  "name": "Cheater",
  "currentRating": 99999,
  "initialRating": 1400,
  "peakRating": 99999,
  "category": "Open",
  "gamesPlayed": 0,
  "wins": 0,
  "draws": 0,
  "losses": 0
}
```
- **Expected Result**: DENIED (rating max 3500).

### Test Case 5: Negative Game Count or Stats
- **Description**: Submitting negative values for games played or wins.
- **Payload**:
```json
{
  "id": "p1",
  "name": "Valid Name",
  "currentRating": 1400,
  "initialRating": 1400,
  "peakRating": 1400,
  "category": "Open",
  "gamesPlayed": -5,
  "wins": -1,
  "draws": 0,
  "losses": 0
}
```
- **Expected Result**: DENIED (stats must be >= 0).

### Test Case 6: Invalid Player Category
- **Description**: Submitting unknown category division.
- **Payload**:
```json
{
  "id": "p1",
  "name": "Valid Name",
  "currentRating": 1400,
  "initialRating": 1400,
  "peakRating": 1400,
  "category": "SuperGrandmasterGodTier",
  "gamesPlayed": 0,
  "wins": 0,
  "draws": 0,
  "losses": 0
}
```
- **Expected Result**: DENIED (category not in enum list).

### Test Case 7: Invalid Match Result String
- **Description**: Submitting non-standard result like "3-0" or malicious string.
- **Payload**:
```json
{
  "id": "m1",
  "date": "2026-11-04",
  "whitePlayerId": "p1",
  "whitePlayerName": "Alice",
  "blackPlayerId": "p2",
  "blackPlayerName": "Bob",
  "result": "white_crushed_black",
  "timeControl": "Classical"
}
```
- **Expected Result**: DENIED (result not in ['1-0', '0-1', '1/2-1/2']).

### Test Case 8: ID Mismatch Attack
- **Description**: Document path `/players/alice` containing `id: "bob"`.
- **Payload**:
```json
{
  "id": "bob",
  "name": "Alice Cooper",
  "currentRating": 1400,
  "initialRating": 1400,
  "peakRating": 1400,
  "category": "Open",
  "gamesPlayed": 0,
  "wins": 0,
  "draws": 0,
  "losses": 0
}
```
- **Expected Result**: DENIED (`data.id == playerId`).

### Test Case 9: Extreme Elo Delta (+500 in one match)
- **Description**: Submitting extreme delta outside chess math bounds.
- **Payload**:
```json
{
  "id": "m1",
  "date": "2026-11-04",
  "whitePlayerId": "p1",
  "whitePlayerName": "Alice",
  "whiteRatingBefore": 1400,
  "whiteRatingAfter": 1900,
  "whiteDelta": 500,
  "blackPlayerId": "p2",
  "blackPlayerName": "Bob",
  "blackRatingBefore": 1400,
  "blackRatingAfter": 900,
  "blackDelta": -500,
  "result": "1-0",
  "timeControl": "Classical"
}
```
- **Expected Result**: DENIED (delta must be between -100 and +100).

### Test Case 10: Missing Required Fields in Match Record
- **Description**: Missing required player names or date.
- **Payload**:
```json
{
  "id": "m1",
  "result": "1-0"
}
```
- **Expected Result**: DENIED (`hasAll(['id', 'date', 'whitePlayerId', 'whitePlayerName', 'blackPlayerId', 'blackPlayerName', 'result', 'timeControl'])`).

### Test Case 11: Document ID with Path Traversal (`../secret`)
- **Description**: Attacker trying path traversal in document ID.
- **Request**: `create /players/..%2Fsecrets`
- **Expected Result**: DENIED (`isValidId(playerId)` enforces valid characters).

### Test Case 12: Snapshot with Empty Title or Invalid Counts
- **Description**: Corrupt snapshot payload with negative player count.
- **Payload**:
```json
{
  "id": "s1",
  "name": "",
  "createdAt": "2026-11-04",
  "playersCount": -1,
  "matchesCount": 0
}
```
- **Expected Result**: DENIED (`name.size() > 0` and `playersCount >= 0`).
