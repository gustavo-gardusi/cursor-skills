---
name: context-add
description: >-
  Follow destination pages with a session-based browser launch, monitor page transitions,
  and only append to .cursor/research-context.json when expected content is visible.
  Handle blockers (login/SSO/permissions/thread visibility), summarize each page state
  as current vs expected, and keep user in control with clear next actions.
---

# Context: add

**Cursor skill:** **`@context-add`** — Invoked with **`@context-add`** in Cursor. Only **`@context-add`** may write or merge into **`.cursor/research-context.json`**. Planning and repo edits are **other skills** (see **Hand off** at the end).

**Goal:** Reach and verify destination pages one URL at a time.
- Keep each provided URL in scope until expected content appears.
- Detect blockers such as login/SSO/app mismatch/thread not opened.
- Report each state as:
  - **Current:** what the page shows now.
  - **Expected:** what this URL should show when destination is ready.
  - **Action:** what user needs to do next (login, open thread/view, retry, or skip).

Use `--links --links-limit 15` to keep link context available, but do not enqueue more URLs from links automatically.

**Execution model:** each invocation starts its own browser session with the shared
profile (`$HOME/.chrome-debug-profile`), opens each provided URL in its own tab, and
closes the browser when the flow is complete. The same profile is reused across agents and projects.

**Single store for "done" pages:** **`.cursor/research-context.json`** holds **only pages that reached expected content** (or explicit terminal blockers such as hard 404 / permanent access blocks).

**Output:**
- **`.cursor/research-context.json`** — Visited pages and their result; only entries that are done. Shape: `{ results: [ ... ], lastFetched }`.
- **`.cursor/research-context.txt`** — Generated from JSON with `node {{base:scripts/context}}/write-readable.js`.

---

## Destination tracking flow

*`@context-add`*

1. **Collect input URLs** — One or many URLs from the user.
2. **Open and observe** — Start a dedicated browser session (or attach intentionally if needed) and run fetch in observer mode.
   - Use one tab per URL and keep the session open while the user fixes blockers.
   - `node {{base:scripts/url}}/fetch.js --observe --observe-ms 0 --observe-interval 2000 --links --links-limit 15 --visited-file .cursor/research-visited.txt URL`
   - `--observe-ms 0` keeps the observer alive for the conversation; replace with a short ms value when needed.
   - `--observe-close-on-destination` closes each destination tab; add `--browser-channel chromium` (or `BROWSER_CHANNEL=chromium`) to use a non-Chrome icon/browser.
3. **Classify each snapshot** from the URL:
   - **Login / SSO / permission blocker**: keep current state as blocker, do not append. Say:
     - *Current:* "SSO page / auth prompt"
     - *Expected:* "target destination page"
     - *Action:* "Login in this tab, then reply **retry**."
   - **Not yet destination** (e.g. Slack channel instead of full thread): keep current state as blocker and ask for exact view.
   - **Destination reached** (destination-specific expected content): mark as done.
4. **Append done pages** — For destination pages, run one final non-observe pass with `--out` so the final JSON has the expected result shape, then pass that JSON to **`append-result.js`**.
   - Final pass example (more data):
   - `node {{base:scripts/url}}/fetch.js --links --links-limit 50 --out /tmp/fetch-out.json <destination url>`
5. **Report and continue** — On each update, send a compact status update in the format:
   - `tab #N: current = A, expected = B, do = C`.

To close tabs automatically after a destination is recognized, append `--observe-close-on-destination` (the skill uses this by default for session-launched flows).

## Destination expectations by URL type

- **GitHub PR (`/pull/`)**
  - **Expected:** PR title, conversation, status, and comment context.
  - **Blockers to expect:** login/SSO, permission popup, or PR landing on a list or summary page instead of target PR.
  - **Recommended action:** keep browser on the PR URL, complete login if needed, and then reply **ready**.
- **GitHub Actions run (`/actions/runs/` or `/job/`)**
  - **Expected:** status summary and job list, ideally from the specific run/job linked by the ticket.
  - **Blockers to expect:** private repo login, org SSO, or stale cookie page.
  - **Recommended action:** complete authentication and confirm you are on the exact run/job page before reply **ready**.
- **Jira issue (`/browse/`)**
  - **Expected:** issue key/title, summary, status, description, comment stream, and linked PR/dependency fields.
  - **Blockers to expect:** Jira login, MFA, or board view instead of issue card.
  - **Recommended action:** open the issue URL directly and wait for the issue body/details pane to render, then reply **ready**.
- **Slack channel (`/archives/...`)**
  - **Expected:** channel message list with recent messages visible.
  - **Blockers to expect:** Slack desktop app capture, workspace sign-in, or channel not loaded.
  - **Recommended action:** keep thread in a browser tab and load the channel in browser; then reply **ready**.
- **Slack thread permalink (`/archives/.../p...`)**
  - **Expected:** parent message + replies visible in one thread context.
  - **Blockers to expect:** only channel view, collapsed thread, or missing context.
  - **Recommended action:** click **View thread** / replies until visible, then reply **ready**.

---

## Read-only restriction

**fetch.js only loads pages.** It navigates to each URL, waits for load, then extracts title, body text, and links. It does **not** click buttons, fill forms, or trigger navigation. Use this for **getting** page content only. If a site requires interaction to show content (e.g. “Open in browser”), the **user** does that in a browser tab; then you run fetch on the resulting URL.

---

## Using the browser (inside context-add)

`fetch.js` starts a dedicated browser session by default (shared profile), opens each input URL in a dedicated tab, and emits updates as pages load and navigate. It does not click or navigate on your behalf.
When run without `--connect-chrome`, the session closes at the end of the command.
If you choose to pass `--connect-chrome`, the command attaches to an existing session and does not close it.

---

## Interactivity: what to recommend (user does the clicks)

The script is **read-only**; the **user** must perform clicks and navigation. Before or after fetch/observe, **recommend specific actions** so the right content is visible in the browser. Keep recommendations focused on **relevant next actions** (not broad link chasing).

### Login

If a result shows a login page, or fetch fails with auth/redirect, recommend: *"Log in to [GitHub / Jira / Slack] in **this browser tab** (the one the script uses). When you're logged in and the target page is visible, say **ready** and I'll fetch again."*

### Slack: use the browser, not the app

Slack must be open in a browser tab, not the Slack desktop app. Recommend: *"Open Slack in the **browser** (e.g. app.slack.com or your workspace URL). The fetch script attaches to the configured browser session and can only capture pages in that browser."* If the user shares a slack.com URL but has the app open, ask them to open the same link in the browser.

### Unwrap thread; nested thread

- **Thread:** For a thread permalink, recommend: *"Click **View thread** or the **replies** count so the full thread (parent + replies) is visible. Wait for it to load, then say **ready**."*
- **Nested thread:** If the discussion has a **reply that itself has replies** (nested thread), and it's relevant, recommend: *"Click into that nested thread so its replies are visible. When visible, say **ready**."*
- **Scope:** Capture the target thread and one adjacent context link unless the user asks for broader exploration.

### Only relevant sublinks

When recommending "next links", pick only **relevant** ones from the page or from **links.best**: e.g. Jira ticket from PR description, failed Actions run, Slack thread mentioned in the ticket. Prefer **3–5** most relevant; do not list every link. Skip noisy or duplicate links.

---

## Script: fetch.js

Script path: **`{{base:scripts/url}}`** (replaced at install with the actual repo path).

- **fetch.js** — Flat list of URLs. Starts (or attaches to) a browser session, **loads** each page (no interaction), extracts title, text, and **links**. **Retries** each URL on non-OK response (default 3 retries, 2s apart). **Always** use **`--links --links-limit 15`** so each result includes **`links.best`**.

**Always use:** **`--visited-file .cursor/research-visited.txt`**, **`--failed-file .cursor/research-failed.txt`**, and **`--links --links-limit 15`**.

---

## Agent response after fetch or validation

After each fetch run (and when validating results), respond with:

1. **Summary of what you can see** — Short description of what the captured page actually contains (title, main text cues, or “about:blank” / empty if the page did not load). This is the **Got**.
2. **What was expected** — For that URL type (see Expected content table), what we expect to see (e.g. “PR Conversation with description and comments”, “full Slack thread with replies”).
3. **Recommendation** — What needs to be done to get there: e.g. “Ensure the Conversation tab is selected and say **retry**”, “Click **View thread** so replies are visible, then say **retry**”, “Log in in this tab and say **ready**”.

Use this format even when the result is OK (brief Got + Expected match + “No action needed” or next-link recommendation). When the result does **not** match, use the same three parts and end with: *“Reply **retry** when ready, or **skip** to skip this URL.”*

---

## Expected content per URL type

Use these labels to **evaluate** whether a fetched result contains what we expect. If the result’s **text** (and optionally title) does not contain enough of these, consider the page incomplete and prompt the user to adjust and retry.

| URL type | Expected in result (at least 1–2 of these) |
|----------|---------------------------------------------|
| **GitHub PR** | "Conversation", "Description", "pull", "merge", "commits", "Files changed", "review" |
| **GitHub Actions run** | "Run", "job", "Summary", "succeeded", "failed", "workflow" |
| **Jira task** | "Key details", "Description", "Assignee", "browse", "TIS-", "Acceptance" |
| **Slack channel** | "Messages", message list, user/display names, "Slack" in title |
| **Slack thread** | Multiple message/reply bodies, "reply" or "replies", or clearly more than one message in the text (full discussion). If you only see one message and channel browser tab, the thread pane is not open. |

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

Always tell the user **what to do** (which tab to open, which link to copy, or to say **ready** / **retry**). Recommend only **relevant sublinks** (see **Interactivity**).

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

`mkdir -p .cursor`. The command below launches a browser session automatically and closes it on completion.

**Monitor destination readiness and append when done:**
```bash
node {{base:scripts/url}}/fetch.js --observe --observe-ms 0 --observe-interval 2000 --observe-max-ms 600000 --links --links-limit 15 --wait-after-load 3000 --visited-file .cursor/research-visited.txt --failed-file .cursor/research-failed.txt --retries 3 --observe-close-on-destination --compact URL
```
Use a different browser family when needed:
```bash
BROWSER_CHANNEL=chromium node {{base:scripts/url}}/fetch.js --observe --observe-ms 0 --observe-close-on-destination --compact URL
node {{base:scripts/url}}/fetch.js --browser-channel firefox --observe --observe-ms 0 --observe-close-on-destination --compact URL
```
For Slack URLs use **`--wait-after-load 5000`**.  
Use **`--observe`** when blockers are likely (login, permissions, wrong view).

**When result is done (success or 404/unfixable), merge into context:**
```bash
node {{base:scripts/context}}/append-result.js --file /tmp/fetch-out.json
# or: echo '{"results":[...]}' | node {{base:scripts/context}}/append-result.js
```

**After run, write readable .txt:**
```bash
node {{base:scripts/context}}/write-readable.js
```

---

## On invoke

*`@context-add`*

1. Start a fresh browser session via the fetch command above (it uses the shared profile automatically).
2. **Normalize URLs:** GitHub — use as-is. Jira — browser URL (atlassian.net). Slack — **browser URL only** (not the desktop app). For **Slack thread**: user must open the thread (View thread / replies) so full discussion is visible; say **ready** when ready.
3. For each URL, run fetch in observer mode for a conversational window (`--observe` + `--observe-ms`, usually `0`) and classify the current snapshot using destination expectations.
   - If blocked (SSO/login/app mismatch/thread not opened), report blocker and ask for user action.
   - If destination is reached, run a final fetch with `--out` and then apply **append-result.js**.
4. Use **`--wait-after-load 5000`** for Slack URLs. Validate against the Expected content table; treat missing content as "not there yet" (user opens thread / tab, then **ready**).
5. When all requested URLs are evaluated (or user stops), run **write-readable.js**, summarize what was stored, and suggest **`@context-show`** to confirm.

---

## Verification

*`@context-add`*

- [ ] Context: **.cursor/research-context.json** and **.cursor/research-context.txt** present; each result has **links.best** when the page had links; no repo files changed.
- [ ] Fetch was **read-only** (no interaction with pages).
- [ ] Results were validated; user was prompted (Got/Expected/Waiting for/Recommendation) to retry or skip when content didn’t match.
- [ ] Interactivity: when needed, recommended **login** (in tab), **Slack in browser** (not app), **unwrap thread / nested thread**, and only **relevant sublinks**.
- [ ] Recorder of pages: when done with a PR or Jira (or other entity), stated what was collected and recommended **next links** with **what to do** (e.g. open Files changed, open Actions run, add Slack URL).
- [ ] Next: see **Hand off** below.

### Hand off to other Cursor skills (not `@context-add`)

> **`@context-show`** — Read-only summary of `.cursor/research-context.json`. Run the **full** **`@context-show`** skill to confirm storage.  
> **`@context-plan`** — Read-only: reads context + repo; writes **only** `.cursor/research-plan.md`. Do **not** mix plan writing into **`@context-add`**.  
> **`@context-execute`** — Applies the plan to the repo; only after **`@context-plan`**.
