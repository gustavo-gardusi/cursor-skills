---
name: context-add
description: >-
  Fetch pages from URLs (read-only; no interaction). Store results in
  .cursor/research-context.json and a readable .cursor/research-context.txt.
  Validate each result; prompt with Got/Expected/Waiting for/Recommendation and
  retry or skip. Recommend user actions: login in tab, Slack in browser (not
  app), unwrap thread / nested thread (depth 3), only relevant sublinks. Recorder
  of pages for PRs, Jira, Slack; when done, recommend next links (depth limit 3).
  Only this skill may change the context files. Does not modify the repo.
---

# Context: add

**Goal:** Fetch from a **flat list of URLs** using **fetch.js** with **Chrome already open**. The script **only loads each URL and extracts content** (title, text, links). It does **not** click, type, or interact with the page. Store results in **`.cursor/research-context.json`** (for reuse between skills) and **`.cursor/research-context.txt`** (readable, with spacing between pages for review). Always use **`--links --links-limit 15`** so each result includes **`links.best`**. After fetch, **evaluate** each result against expected content for that URL type; if something is missing, **prompt the user** with **Got / Expected / Waiting for / Recommendation** and **retry** or **skip**. Act as a **recorder of pages**: when you finish with one “entity” (e.g. a PR, a Jira task), say what was collected and **recommend which links to open next** and what to do to get there (e.g. “Open the Files changed tab”, “Go to the Actions run”, “Add the Slack thread URL”). Only this skill may change the context files. Does not modify the repo.

**Prerequisite:** Chrome must be running with the shared profile and remote debugging. If not, run **@browser-open** first.

**Output:**
- **`.cursor/research-context.json`** — Canonical store: `{ results: [ { url, title, text, ok?, links?: { best } } ], lastFetched }`. Other skills (context-plan, context-show) read this.
- **`.cursor/research-context.txt`** — Human-readable: one block per page with URL, title, text, and LINKS, separated by spacing for easier review. Generate after each fetch with `node {{base:scripts/context}}/write-readable.js` (or equivalent from repo path).

---

## Read-only restriction

**fetch.js only loads pages.** It navigates to each URL, waits for load, then extracts title, body text, and links. It does **not** click buttons, fill forms, or trigger navigation. Use this for **getting** page content only. If a site requires interaction to show content (e.g. “Open in browser”), the **user** does that in Chrome; then you run fetch on the resulting URL.

---

## Using the browser (already open)

fetch.js attaches to the existing Chrome via **`--connect-chrome`** (default localhost:9222). It does **not** launch or close Chrome. The same profile used by **@browser-open** is shared across all projects; only **`.cursor/`** (context, visited, failed, plan) is repo-specific.

---

## Interactivity: what to recommend (user does the clicks)

The script is **read-only**; the **user** must perform clicks and navigation. Before or after fetch, **recommend specific actions** so the right content is visible in Chrome. Keep a **depth limit of 3** and only **relevant sublinks**.

### Login

If a result shows a login page, or fetch fails with auth/redirect, recommend: *"Log in to [GitHub / Jira / Slack] in **this Chrome tab** (the one the script uses). When you're logged in and the target page is visible, say **ready** and I'll fetch again."*

### Slack: use the browser, not the app

Slack must be open in **Chrome** (browser), not the Slack desktop app. Recommend: *"Open Slack in the **browser** (e.g. app.slack.com or your workspace URL). The fetch script attaches to Chrome and can only capture pages in that browser."* If the user shares a slack.com URL but has the app open, ask them to open the same link in Chrome.

### Unwrap thread; nested thread (depth limit 3)

- **Thread:** For a thread permalink, recommend: *"Click **View thread** or the **replies** count so the full thread (parent + replies) is visible. Wait for it to load, then say **ready**."*
- **Nested thread:** If the discussion has a **reply that itself has replies** (nested thread), and it's relevant, recommend: *"Click into that nested thread so its replies are visible. I'll capture up to **depth 3** (channel → thread → nested thread). When visible, say **ready**."*
- **Depth limit:** Recommend following at most **3 levels** from the start (e.g. channel → thread → nested thread; or PR → Files changed → Actions job). Beyond that, say *"Collected everything needed from this branch"* and suggest moving to another entity (e.g. Jira, different PR) instead of deeper links.

### Only relevant sublinks

When recommending "next links", pick only **relevant** ones from the page or from **links.best**: e.g. Jira ticket from PR description, failed Actions run, Slack thread mentioned in the ticket. Prefer **3–5** most relevant; do not list every link. Skip noisy or duplicate links.

---

## Script: fetch.js

Script path: **`{{base:scripts/url}}`** (replaced at install with the actual repo path).

- **fetch.js** — Flat list of URLs. Attaches to Chrome, **loads** each page (no interaction), extracts title, text, and **links**. **Retries** each URL on non-OK response (default 3 retries, 2s apart). **Always** use **`--links --links-limit 15`** so each result includes **`links.best`**.

**Always use:** **`--visited-file .cursor/research-visited.txt`**, **`--failed-file .cursor/research-failed.txt`**, and **`--links --links-limit 15`**.

---

## Expected content per URL type

Use these labels to **evaluate** whether a fetched result contains what we expect. If the result’s **text** (and optionally title) does not contain enough of these, consider the page incomplete and prompt the user to adjust and retry.

| URL type | Expected in result (at least 1–2 of these) |
|----------|---------------------------------------------|
| **GitHub PR** | "Conversation", "Description", "pull", "merge", "commits", "Files changed", "review" |
| **GitHub Actions run** | "Run", "job", "Summary", "succeeded", "failed", "workflow" |
| **Jira task** | "Key details", "Description", "Assignee", "browse", "TIS-", "Acceptance" |
| **Slack channel** | "Messages", message list, user/display names, "Slack" in title |
| **Slack thread** | Multiple message/reply bodies, "reply" or "replies", or clearly more than one message in the text (full discussion). If you only see one message and channel chrome, the thread pane is not open. |

If the page is a **Slack** URL and the result has empty or very short text, or "Execution context was destroyed", the page may have navigated or not finished loading. Use **`--wait-after-load 5000`** and ask the user to open the right view first (see **Slack: thread vs channel** below).

---

## Slack: thread vs channel

**Thread URL** — Looks like `https://vtex.slack.com/archives/CHANNEL_ID/p1234567890123456` or a permalink that includes `/p` and a timestamp. For a **thread** we need the **full discussion** (the parent message plus all replies). Slack often opens this as the channel with one message highlighted; the **replies are in a side panel or thread view** that does not load automatically. Because fetch is **read-only** (it cannot click), the **user** must open the thread so the full discussion is visible.

- **Waiting for (thread):** The entire thread with **all replies** visible in the page (thread pane or expanded replies). Not just the channel with the parent message highlighted.
- **If you got:** Channel title, message list, and only the parent message (or "View thread" as a link but no reply content) → the thread is not open.
- **Recommendation (thread):** *"Click **View thread** or the **replies** count (e.g. ‘3 replies’) so the full thread with all replies is visible. The fetch script cannot click for you. Wait for the thread to load, then reply **retry**."*

**Validation prompt example (when result doesn’t match):**
```
**Slack thread** — [URL]

- **Got:** Channel title, message list, one message body. No reply content in the extracted text.
- **Expected:** Full thread with multiple messages/replies visible.
- **Waiting for:** The entire discussion (parent + replies) visible in the thread pane.
- **Recommendation:** Click **View thread** or the **replies** count so the full thread loads. Wait for replies to appear, then reply **retry**.

Reply **retry** when ready, or **skip** to skip this URL.
```

**Channel URL** — Looks like `https://app.slack.com/client/WORKSPACE_ID/CHANNEL_ID`. We expect the channel’s message list (recent messages). If the user wanted a specific thread, they should open that thread first and then we fetch (or they can pass the thread permalink and we wait for the thread view).

**Before first Slack fetch:** Tell the user what you’re waiting for. For a **thread** URL: *"I’m waiting for the **full thread** (parent + all replies) to be visible. If you’re on the channel with only the message highlighted, click **View thread** or the replies count and wait for the thread to load, then say **ready**."* For a **channel** URL: *"I’m waiting for the channel’s messages to be visible. When ready, say **ready**."* Then run fetch with **`--wait-after-load 5000`**.

---

## Recorder of pages: GitHub PR, Jira, next-link recommendations

Act like a **recorder of pages**. For each URL type you may need **several pages** (different tabs or links) to get full context. After capturing a page, **validate** it; when you have everything needed from that "entity", say so and **recommend which link(s) to open next** and **what to do** to get there. The user performs navigation; you only state what to open and when to say **ready** or **retry**.

### GitHub PR (multi-step)

- **Start:** PR **Conversation** tab — collect description, comments, review state, merge status. Validate that the result includes discussion/review content (see expected content table).
- **Optional next steps** (recommend as needed):
  - **Files changed** — *"Open the **Files changed** tab (same PR URL with Files changed selected). When that view is visible, share the URL or say **ready** and I'll fetch again."*
  - **GitHub Actions** — *"Open the **Actions** tab for this repo (or the check run from the PR). When you see the run (or job) you care about, share that URL."*
  - **Specific run or job log** — *"Open this run: [URL]. If you need a specific job or step output, open that job and share the URL so I can capture the log."*
- **When finished with that PR:** *"Collected everything needed from this GitHub PR."* Then recommend **next links**: e.g. Jira link from the PR description, related Slack thread, or Actions run URL if not yet added. Tell the user what to do: *"To add the Jira ticket: open [Jira link] in the same browser and say **ready**"*, or *"To add the failed Actions run: open the run from the PR checks and share the URL."*

Use the same **Got / Expected / Waiting for / Recommendation** prompt if the PR page doesn't match (e.g. wrong tab, or 404). For PR Conversation: **Waiting for** = "PR Conversation tab with description and comments visible." **Recommendation** = "Ensure the **Conversation** tab is selected and the page has loaded, then reply **retry**."

### Jira task

- **Capture:** Key details, Description, Assignee, Acceptance criteria (see expected content table).
- **When finished:** *"Collected everything needed from this Jira page."* Then recommend **next links** when relevant: e.g. *"If this ticket mentions a Slack channel or thread, open it and add that URL so we can capture the discussion."* Or: *"To add the related PR: open the PR link from the ticket and say **ready**."*

### Recommendations after each page

After validating a result (and optionally writing the readable .txt), you may suggest **next links**:

- **From PR:** Links to **Files changed**, **Actions** run, **Jira** (from description), **Slack** (if mentioned). Say what to do: *"Open the **Files changed** tab and say **ready**"*, *"Open [Actions run URL] and add it to the list"*, *"Add the Jira ticket URL to capture requirements."*
- **From Jira:** Link to **Slack** channel/thread, **PR**, or **Confluence** if present in the ticket. *"Open the Slack channel linked in the description and share the URL when ready."*
- **From Slack:** If the thread references a PR or Jira, *"To add the PR/Jira mentioned here, share that URL next."*

Always tell the user **what to do** (which tab to open, which link to copy, or to say **ready** / **retry**). Keep **depth limit 3** and recommend only **relevant sublinks** (see **Interactivity**).

---

## Validation and retry loop (in the skill)

After each fetch run:

1. **For each result** in `results`, infer the URL type (GitHub PR, Actions, Jira, **Slack thread**, **Slack channel**, other) from the URL. Slack thread = URL contains `/archives/` and `/p` (or similar permalink); Slack channel = `app.slack.com/client/` or channel list.
2. **Check** that the result’s `text` (and title if useful) contains the **expected content** for that type. If the result has `ok: false` or `error`, treat it as failed.
3. **If a result does not match**, show an **interactive prompt** with **Got / Expected / Waiting for / Recommendation** (same structure for all URL types). Examples: **Slack thread** — Got: "Channel title, one message; no reply content." Recommendation: "Click **View thread** or the **replies** count, wait for replies, then reply **retry**." **GitHub PR** — Got: "Page loaded but no Conversation content." Recommendation: "Ensure the **Conversation** tab is selected and the page has loaded, then reply **retry**." **Jira** — Recommendation: "Ensure the task page (Key details, Description) is visible, then reply **retry**."
   - Then: *"Reply **retry** when ready, or **skip** to skip this URL."*
4. **Wait for the user** to reply **retry** or **skip**. If **retry**, run fetch again for that URL (use **`--wait-after-load 5000`** for Slack) and re-validate. Repeat until the result passes or the user says **skip**.
5. After all results pass or are skipped, **write the readable .txt** and summarize. Then apply **recorder of pages**: if you finished with a PR, say *"Collected everything needed from this GitHub PR"* and recommend next links (Files changed, Actions, Jira, Slack). If you finished with a Jira page, say so and recommend e.g. Slack or PR. Tell the user **what to do** to get to each recommended link.

**Slack-specific:** Before the first fetch for any Slack URL, tell the user what you’re waiting for (thread = full discussion; channel = messages). When they confirm the page is ready, run fetch with **`--wait-after-load 5000`**.

---

## Common usages (VTEX search team)

| What to add | URL | Notes |
|-------------|-----|------|
| **PR** | `https://github.com/.../pull/NUMBER` | Start on **Conversation**; then recommend **Files changed**, **Actions** run, or job log as needed. When done: "Collected everything needed from this GitHub PR" + next-link recommendations. |
| **GitHub Actions run** | `https://github.com/.../actions/runs/RUN_ID` or `/job/JOB_ID` | Expect: run summary, job list. Often added after PR (recommend from PR checks). |
| **Jira task** | `https://vtex-dev.atlassian.net/browse/TIS-XXX` | Expect: Key details, Description. When done, recommend e.g. Slack channel or PR from the ticket. |
| **Slack channel** | Browser URL (e.g. `app.slack.com/client/.../CHANNEL_ID`) | User opens channel; use `--wait-after-load 5000`; expect message list. |
| **Slack thread** | Thread permalink (e.g. `vtex.slack.com/archives/CHANNEL_ID/p123...`) | User must **open the thread** (click View thread / replies) so full discussion is visible; use `--wait-after-load 5000`; expect multiple messages/replies. |

---

## Commands (from workspace root)

`mkdir -p .cursor`. Run with **`--connect-chrome`** (Chrome must already be open via **@browser-open**).

**Fetch (multiple URLs, with links; read-only):**
```bash
node {{base:scripts/url}}/fetch.js --connect-chrome --links --links-limit 15 --wait-after-load 3000 --delay-between-pages 1000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append] URL1 URL2
```

**For Slack URLs** use a longer wait:
```bash
node {{base:scripts/url}}/fetch.js --connect-chrome --links --links-limit 15 --wait-after-load 5000 --delay-between-pages 1000 --out .cursor/research-context.json --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --compact [--append] SLACK_URL
```

**After fetch, write readable .txt:**
```bash
node {{base:scripts/context}}/write-readable.js
```
(Or from repo: `node scripts/context/write-readable.js` with CURSOR_ROOT set to workspace root.)

---

## On invoke

1. Ensure Chrome is open with the shared profile (if not, direct the user to **@browser-open**).
2. **Normalize URLs and interactivity:** GitHub — use as-is. Jira — browser URL (atlassian.net). Slack — **browser URL only**; recommend **Slack in the browser** (not the desktop app). For **Slack thread** URLs: recommend unwrapping the thread (click **View thread** / replies); if there's a relevant **nested thread**, recommend opening it (depth limit 3). When suggesting next links, use **only relevant sublinks** and **depth limit 3** (see **Interactivity**). For thread: *"I'm waiting for the **full thread** (parent + all replies) to be visible. Click **View thread** or the replies count, wait for the thread to load, then say **ready**."* For channel: waiting for messages, then **ready**. If a page requires login, recommend logging in in that tab and saying **ready**.
3. Run **fetch.js** with **`--connect-chrome`**, **`--links --links-limit 15`**, **`--visited-file .cursor/research-visited.txt`**, **`--failed-file .cursor/research-failed.txt`**, **`--retries 3`**. Use **`--wait-after-load 5000`** for all Slack URLs.
4. **Validate** each result. For Slack, treat **thread** URLs as needing reply content (multiple messages); **channel** URLs as needing message list. When a result does not match, show **Got** / **Expected** / **Waiting for** / **Recommendation**, then ask for **retry** or **skip**. For Slack thread when only channel view was captured: recommend clicking **View thread** or the **replies** button and waiting for the full thread. If **retry**, run fetch again (Slack: `--wait-after-load 5000`) and re-validate. Repeat until pass or skip.
5. Run **write-readable.js** to generate **`.cursor/research-context.txt`** with spacing between pages. Summarize what was stored and list **links.best** per page. Apply **recorder of pages**: for each "entity" (PR, Jira task, etc.) you finished, say *"Collected everything needed from this [PR / Jira / …] page"* and **recommend which links to open next** and **what to do** (e.g. "Open the Files changed tab and say **ready**", "Open the Jira ticket and add the URL", "If the ticket mentions a Slack channel, open it and share the URL"). If any URLs are in `.cursor/research-failed.txt`, list them and suggest logging in and re-running. Suggest **@context-show** to confirm.

---

## Verification

- [ ] Context: **.cursor/research-context.json** and **.cursor/research-context.txt** present; each result has **links.best** when the page had links; no repo files changed.
- [ ] Fetch was **read-only** (no interaction with pages).
- [ ] Results were validated; user was prompted (Got/Expected/Waiting for/Recommendation) to retry or skip when content didn’t match.
- [ ] Interactivity: when needed, recommended **login** (in tab), **Slack in browser** (not app), **unwrap thread / nested thread** (depth 3), and only **relevant sublinks** (depth limit 3).
- [ ] Recorder of pages: when done with a PR or Jira (or other entity), stated what was collected and recommended **next links** with **what to do** (e.g. open Files changed, open Actions run, add Slack URL).
- [ ] Next: **context-show** for summary; **context-plan** reads context (read-only) and writes `.cursor/research-plan.md`.
