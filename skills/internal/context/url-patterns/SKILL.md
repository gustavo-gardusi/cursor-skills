---
name: internal-context-url-patterns
description: Central registry of URL detection patterns, expected keywords, and extraction rules. Use this skill as a read-only library for classification.
visibility: internal
---

# Context: URL Patterns

This file contains the regex patterns and keywords used to classify URLs and evaluate page content. Use it as a configuration dictionary.

## Supported Types

### `github_pr`
- **URL Pattern**: `^https://github\.com/[^/]+/[^/]+/pull/\d+`
- **Expected Content**: `Conversation`, `Description`, `pull`, `merge`, `commits`, `Files changed`, `review`
- **Forbidden Content**: `Sign in to GitHub` (indicates login blocker)
- **Link Extraction Priority**: Links to `/pull/\d+/files`, `/actions/runs/`

### `github_actions`
- **URL Pattern**: `^https://github\.com/[^/]+/[^/]+/(actions/runs|job)/\d+`
- **Expected Content**: `Run`, `job`, `Summary`, `succeeded`, `failed`, `workflow`
- **Forbidden Content**: `Sign in to GitHub`

### `jira_task`
- **URL Pattern**: `^https://[^.]+\.atlassian\.net/browse/[A-Z]+-\d+`
- **Expected Content**: `Key details`, `Description`, `Assignee`, `Acceptance criteria`
- **Forbidden Content**: `Log in to continue`
- **Link Extraction Priority**: Confluence links, Slack links, GitHub links

### `slack_thread`
- **URL Pattern**: `^https://[^.]+\.slack\.com/archives/[A-Z0-9]+/p\d+`
- **Expected Content**: `replies`, `reply`, multiple message bodies (indicates thread is open)
- **Forbidden Content**: `Sign in to Slack`
- **Link Extraction Priority**: Jira links, GitHub links, inner thread links

### `slack_channel`
- **URL Pattern**: `^https://app\.slack\.com/client/[^/]+/[A-Z0-9]+`
- **Expected Content**: `Messages`, message list, `Slack`
- **Forbidden Content**: `Sign in to Slack`
- **Link Extraction Priority**: Thread permalinks (`/p\d+`)

## Evaluation Rules

1. **Classification**: Match URL against patterns first. If no match, type is `unknown`.
2. **Confidence Score**: `(Matched Expected Keywords / Total Expected Keywords) * 100`
3. **Blocker Check**: If any Forbidden Content is found, confidence is `0%` and status is `blocked`.