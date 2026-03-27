---
name: internal-context-snapshot-save
description: Save page snapshots to global storage to avoid re-fetching the same page across different projects.
visibility: internal
---

# Context: Snapshot Save

This internal skill handles writing page snapshots to the global storage directory.

## Storage Location
- **Directory**: `$HOME/.cursor/browser-profiles/snapshots/`
- **File Format**: `[hash(url)].json`

## Operations

### `save`
Saves a snapshot to disk.
- **Input**: `{url, title, text, links, page_type, confidence}`
- **Logic**:
  1. Hash the `url` (e.g., SHA-256 or MD5).
  2. Write JSON object to `$HOME/.cursor/browser-profiles/snapshots/[hash].json`.
  3. Update `$HOME/.cursor/browser-profiles/snapshots/metadata.json` index:
     ```json
     {
       "hash123": { "url": "https://...", "fetched_at": "timestamp", "title": "..." }
     }
     ```

### `get`
Retrieves a snapshot if it exists.
- **Input**: `url`
- **Output**: Snapshot object or `null` if not found.