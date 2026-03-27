---
name: context-browse
description: Orchestrate real-time browser exploration. Opens Firefox, listens for navigation events, and automatically recommends next steps. Can run autonomously by popping from the queue.
---

# Context: Browse (Autonomous Explorer)

**Cursor skill:** **`@context-browse`**

**Recommendation**: Use a model with strong reasoning capabilities for this skill, such as `gemini-3.1-pro`. Do not use fast/mini models; always prioritize the highest reasoning capability.

**Explicit Mode Switching**: Start in **Plan mode** to review the request. When you need to physically launch the browser window, switch to **Agent mode** to execute the background script and listen to the terminal.

**CRITICAL MANDATE:** When invoked, you MUST NOT use GitHub CLI tools (e.g. `gh pr view`, `gh pull`) or simple API `fetch` requests. You MUST physically launch a visible, interactive Firefox browser window using the `browser-navigator` internal skill.

This skill orchestrates a real-time, interactive browser session. It opens Firefox, listens to your navigation, and automatically evaluates pages to recommend your next steps. It can operate autonomously by picking the best next link from the research queue.

## How it works

1. **Autonomous Start**: 
   - If a URL is provided (`@context-browse <url>`), start with that URL.
   - If NO URL is provided, read `.cursor/research-queue.json`, pop the highest priority link, and start exploring that URL. If the queue is empty, ask the user what to explore.
2. **Launch**: Generate and execute the temporary Node.js script (using Playwright) as defined in `browser-navigator` to open a **visible** Firefox window (`headless: false`) using a shared global profile (`$HOME/.cursor/browser-profiles/Default`). *(Switch to Agent mode to run this)*
3. **Listen & Poll**: Run the command in the background (using `block_until_ms: 0` or similar). The script will listen to **all tabs** and print formatted text blocks to the terminal whenever a page loads. You must read the terminal output continuously to see these logs.
4. **Capture**: When you see `=== PAGE LOADED ===` in the terminal, extract the `[URL]`, `[TITLE]`, `[TEXT_PREVIEW]`, and `[LINKS]` from the script's output.
5. **Evaluate & Queue**: Score the page against the current exploration goal. Identify the best next links and feed them back to the queue by invoking the **`@context-add`** skill (or adding them directly to `.cursor/research-queue.json`).
6. **Recommend**: Post a summary in the chat with the top recommended links to explore next. Ask the user if they want to interact with the browser manually, or if you should auto-navigate to the next highest priority link in the queue. Wait for the user's input or the next page load.

## Usage

Simply invoke the skill:
`@context-browse` (Auto-pops from the queue)
`@context-browse https://github.com/my-org/my-repo/pull/123` (Starts with a specific URL)

Then, navigate the browser naturally or let the agent autonomously pick the next link. The chat will update automatically.

## Internal Flow (Sub-skills)

On every page load, this skill orchestrates the following internal utilities:
1. `browser-navigator`: Extracts page content.
2. `visited-check`: Ensures we don't re-process known URLs.
3. `snapshot-save`: Saves the extracted text to global storage.
4. `page-path-evaluator`: Calculates confidence and finds the best next links.
5. `@context-add`: Updates the per-repo `.cursor/research-queue.json`.

When you are done exploring, simply close the Firefox window. The skill will detect this and print a final summary.

## Next Steps
After exploration, run **`@context-plan`** to build a strategy from what you found.
