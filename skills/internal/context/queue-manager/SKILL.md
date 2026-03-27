---
name: queue-manager
description: Manage the exploration queue state. Add, pop, and enforce limits on the per-repo .cursor/research-queue.json file.
visibility: internal
---

# Context: Queue Manager

This internal skill handles reads and writes to the per-repo `.cursor/research-queue.json` file. It enforces queue limits (up to 15 items, ~500KB total text metadata) and ensures no duplicates are queued.

## Supported Operations

### `add`
Adds new items to the queue.
- **Input**: List of objects: `[{url, title, type, reason, score}]`
- **Logic**:
  1. Load existing `.cursor/research-queue.json` (create if missing).
  2. For each item:
     - Check if `url` already exists in queue (skip if yes).
     - Ensure URL is not in the global visited set (call `@context-visited-check`).
     - Add to queue list.
  3. Sort entire queue descending by `score`.
  4. Truncate queue to maximum 15 items.
  5. Save back to `.cursor/research-queue.json`.

### `pop`
Retrieves and removes the highest priority item from the queue.
- **Output**: Returns the top item object `{url, title, type, reason, score}` and removes it from the file.

### `peek`
Returns the top items without modifying the queue.
- **Input**: `count` (default 3)
- **Output**: List of top `count` items.

### `reorder`
Re-evaluates all items in the queue against a new goal.
- **Input**: `new_goal`
- **Logic**: Calls `@page-path-evaluator` logic to rescore existing queue items based on the new goal, then sorts and saves.

### `clear`
Empties the queue file entirely.