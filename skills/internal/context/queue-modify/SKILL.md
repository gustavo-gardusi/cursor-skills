---
name: queue-modify
description: Direct manipulation of the per-repo research queue. Add, remove, and reorder items.
visibility: internal
---

# Context: Queue Modify

This internal utility manages the `.cursor/research-queue.json` file in the current workspace.

## File Format
```json
{
  "items": [
    {
      "url": "https://...",
      "title": "...",
      "type": "github_pr",
      "score": 85,
      "reason": "..."
    }
  ],
  "metadata": {
    "last_updated": "timestamp"
  }
}
```

## Operations

1. **`push` / `add`**: Append links to the queue. Auto-deduplicates against existing items and global visited set.
2. **`pop`**: Remove and return the top item (highest score).
3. **`sort`**: Re-sort the `items` array descending by `score`.
4. **`truncate`**: Ensure the queue does not exceed 15 items. Discard lowest-scoring items if over limit.