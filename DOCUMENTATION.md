# Websim Multiplayer & Persistence Guide

This document explains how the two main systems of Websim interact to create seamless multiplayer experiences.

## 1. Identity (Automatic User Data)
Every user in Websim is automatically assigned an identity. You don't need to build a login system.
- **Username & Avatar:** Accessible via `room.peers[clientId]`.
- **Automatic Attribution:** Every database record created via `room.collection()` automatically includes the creator's `username`.

## 2. Realtime State (The `room` object)
Realtime state is ephemeral (lasts as long as the session) and optimized for high-frequency updates (like player movement).

### A. Presence (`room.presence`)
- **Ownership:** Each client "owns" their own presence.
- **Usage:** Perfect for cursor positions, health bars, or "is typing" indicators.
- **Sync:** Automatically broadcast to all peers when you call `room.updatePresence()`.

### B. Room State (`room.roomState`)
- **Shared:** A single global object shared by everyone.
- **Usage:** World state, game scores, or current map settings.
- **Conflict Resolution:** Last-write-wins.

### C. Events (`room.send`)
- **One-off:** Not stored anywhere.
- **Usage:** Triggering sound effects, particle bursts, or "pinging" other players.

## 3. Persistent Database (`room.collection`)
When you need data to survive after everyone leaves the room, use collections.

- **Storage:** Data is persisted in a traditional database format.
- **Querying:** Supports basic filtering (`.filter()`) and automatic sorting (newest first).
- **Permissions:** Users can only `update` or `delete` records they personally created.
- **Reactivity:** Use `subscribe()` to get live updates whenever a record is added or changed.

## Comparison Table

| Feature | Realtime (Presence/RoomState) | Database (Collections) |
| :--- | :--- | :--- |
| **Persistence** | Lost when room is empty | Permanent |
| **Latency** | Extremely Low (~50ms) | Moderate (~500ms) |
| **Capacity** | Small state objects | Large amounts of data |
| **Best For** | Cursors, Movement, Live UI | Posts, Settings, User History |


