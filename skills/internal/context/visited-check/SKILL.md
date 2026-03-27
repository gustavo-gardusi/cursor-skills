---
name: internal-context-visited-check
description: Manage the global visited URLs list to prevent infinite exploration loops.
visibility: internal
---

# Context: Visited Check

This internal utility manages the global `$HOME/.cursor/research-visited.txt` file.

## Operations

### `check`
Determine if a URL has already been visited.
- **Input**: `url`
- **Logic**: Read the visited file (one URL per line). Return `true` if `url` exists.
- **Note**: URLs should be normalized before checking (e.g., remove `#hashes` unless it's a SPA router).

### `mark`
Mark a URL as visited.
- **Input**: `url`
- **Logic**: Append `url` to the file on a new line.

### `clear`
Reset the visited list.
- **Warning**: This affects ALL workspaces. Use with caution.