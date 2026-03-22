---
name: page-path-evaluator
description: Evaluate page snapshots, score relevance against exploration goals, and recommend next links.
visibility: internal
---

# Context: Page Path Evaluator

This internal skill evaluates a captured page snapshot against the expected URL patterns and current exploration goal.

## Inputs
Provide the following in your invocation:
1. **Snapshot**: `{url, title, text, links}`
2. **Goal**: The current exploration goal (e.g., "Find API design discussion")
3. **Visited Set**: List of already visited URLs
4. **Current Queue**: List of currently queued URLs

## Execution Steps

1. **Classify Page**:
   - Compare `url` against patterns in `skills/internal/context/url-patterns/SKILL.md`.
   - Identify `page_type`.

2. **Calculate Confidence**:
   - Check `text` for Forbidden Content for that type (if found, confidence is 0%).
   - Count how many Expected Content keywords appear in `text`.
   - Score = `(found / expected_total) * 100`.
   - Adjust score based on relevance to the specific **Goal** (e.g., if goal mentions "API design" and text contains it, +20%).

3. **Extract & Rank Links**:
   - For each link in the snapshot:
     - Ignore if in **Visited Set** or **Current Queue**.
     - Score relevance: Same-site (+10), Matches goal keywords in anchor text (+30), Matches expected priority extraction pattern for this type (+20).
   - Sort links descending by score.
   - Keep the top 3.

4. **Return Output**:
   Format the result as a structured JSON object:
   ```json
   {
     "type": "github_pr",
     "confidence": 85,
     "summary": "Found PR description with 12 comments discussing API design.",
     "next_links": [
       {"url": "...", "title": "Files changed", "reason": "Standard next step for PR"},
       {"url": "...", "title": "TIS-999", "reason": "Mentioned in description"}
     ]
   }
   ```