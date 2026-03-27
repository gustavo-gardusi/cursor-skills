# User Guide

How to use Cursor skills for research and development workflows.

---

## Getting Started

### What are Cursor Skills?

Cursor skills are markdown instructions that the Cursor agent follows to perform complex, multi-step tasks. They act as reusable workflows that you can invoke with simple commands like `@context-add` or `@gh-pr`.

### Installation

#### Option 1: Manual Installation (Recommended)

Run the installation script to build the skills (which embeds any required scripts) and copy them to your Cursor profile:

```bash
git clone https://github.com/gardusig/cursor-skills.git
cd cursor-skills
./install.sh
```

**Local Repository Installation:**
If you want to install the skills locally to a specific repository instead of globally, you can pass a target directory:

```bash
./install.sh /path/to/your/project/.cursor/skills-cursor
```

**Setup Alias** for easy updates:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias sync-cursor-skills="cd ~/github/personal/cursor-skills && git pull && ./install.sh"
```

Then run `sync-cursor-skills` after pulling updates.

#### Option 2: Automatic via Cursor (If supported)

1. Open Cursor Settings
2. Navigate to Features > Agent > Skills
3. Add this repository URL

### Verification

After installation, type `@` in Cursor chat and you should see:
- `@context-add`
- `@context-browse`
- `@context-show`
- `@context-plan`
- `@context-execute`
- `@context-clear`
- `@gh-start`
- `@gh-check`
- `@gh-push`
- `@gh-pr`

## Context Research

Use for exploring PRs, docs, or any web research where you need to follow links and build understanding.

### Workflow

```bash
# Add links to exploration queue
@context-add https://github.com/org/repo/pull/456

# Start autonomous or manual exploration
@context-browse

# Navigate naturally - each page load is captured
# Click links, open tabs, follow references

# Check progress
@context-show

# Build strategy from findings using polls/Q&A
@context-plan

# Execute the generated strategy
@context-execute

# Clean up when done
@context-clear
```

**What happens:**
- Firefox opens with your saved logins
- As you browse, pages are captured automatically
- AI scores relevance and recommends next links
- Queue updates in real-time with suggestions

## GitHub Workflow

Complete development cycle from branch to PR.

### Workflow

```bash
# Start new task
@gh-start TIS-503
# Syncs main, stashes dirty work, creates branch tis-503, pops work

# Make your code changes

# Verify code
@gh-check
# Auto-detects stack, runs format/lint/tests

# Commit and push
@gh-push
# Runs @gh-check, updates docs, commits, pushes

# Create PR
@gh-pr
# Syncs upstream, generates title/body, creates/updates PR
```

**Stack Support:**
- Node/TypeScript (npm, pnpm, yarn)
- Rust (cargo)
- Python (pip, poetry, uv)
- Go (go mod)

Detected automatically from README and config files.

## Storage

Storage implementation details (global profiles vs per-repo artifacts) are documented in **[Architecture](ARCHITECTURE.md#storage-model-detailed)**.

**Clearing:** `@context-clear` removes per-repo files, keeps global snapshots.

## Best Practices

**Context Research:**
- Use `@context-add` to bulk load links to explore
- Check progress with `@context-show` every 5-10 pages
- Use `@context-plan` after exploring 15+ pages to draft a strategy
- Use `@context-execute` to write the code
- Clear between tasks with `@context-clear`

**GitHub Workflow:**
- Always run `@gh-check` before committing
- Let skills handle git (don't manually commit during workflows)
- Trust stack discovery (reads README/config automatically)
- Update README to match code changes

**Model Selection:**
- We recommend using **`gemini-3.1-pro`** for all workflows (Planning, Code Review, General Coding, Real-time exploration, and Quick questions). It provides an excellent balance of speed, reasoning, and context limits for handling complex multi-step skills.

## Troubleshooting

**Browser won't launch:**
- Check Firefox installed: `which firefox`
- Close all Firefox windows, try again

**Stack not detected:**
- Ensure README has "Setup" section
- Config files in repo root
- Add install commands to README

**Checks fail:**
- Install system tools: `brew install node`, `rustup`, etc.
- Check version requirements
- Run `@gh-check` after fixing

**Need `gh` CLI:**
```bash
brew install gh
gh auth login
```

## See Also

- **[Reference](REFERENCE.md)** - Quick skill lookup
- **[Testing](TESTING.md)** - Validation framework
- **[Architecture](ARCHITECTURE.md)** - Technical details
