---
name: onboard
description: Onboard an AI agent to a new project by initializing ThoughtCabinet thoughts repo and bootstrapping agent memory. Use when starting work on a new repository, setting up a fresh project for AI-assisted development, or when the user asks to onboard, bootstrap, or initialize a project.
---

# Onboarding a New Project

Set up a new project for AI-assisted development: initialize the thoughts repo and bootstrap agent memory in one workflow.

## Workflow Context

This skill orchestrates two capabilities that are normally run separately:
- `thc init` — connects the project to a thoughts repo
- `init-agent-memory` skill — creates AGENTS.md and supporting docs

After onboarding, the project is ready for skills like `creating-plan`, `research-codebase`, and `implementing-plan`.

## Workflow Overview

1. **Pre-flight** - Verify git repo, check existing setup, confirm thc is available
2. **Initialize thoughts** - Run `thc init` to connect the thoughts repo
3. **Bootstrap agent memory** - Create AGENTS.md and CLAUDE.md via the init-agent-memory skill
4. **Verify and present** - Confirm everything is wired up correctly

## Step 1: Pre-flight

### 1a. Verify git repository

```bash
git rev-parse --git-dir > /dev/null 2>&1
```

If not a git repo, tell the user and stop:
```
This directory is not a git repository. Please run `git init` first or navigate to an existing repo.
```

### 1b. Check existing setup

Check what's already done to avoid redundant work:

```bash
# Check if thoughts/ directory exists with valid symlinks
[ -L thoughts/shared ] && echo "thoughts: initialized" || echo "thoughts: not initialized"

# Check if AGENTS.md or CLAUDE.md exists
[ -f AGENTS.md ] && echo "memory: exists" || echo "memory: not found"
[ -f CLAUDE.md ] && echo "claude-md: exists" || echo "claude-md: not found"
```

If thoughts is already initialized, ask the user:
```
Thoughts directory is already initialized. Do you want to:
1. Skip thoughts init and proceed with memory bootstrap
2. Re-initialize with --force
3. Cancel
```

### 1c. Check ThoughtCabinet availability

```bash
command -v thoughtcabinet > /dev/null 2>&1 || command -v thc > /dev/null 2>&1
```

If neither command is available:
```
ThoughtCabinet CLI (`thc`) is not installed or not in PATH.
Install it from the thought-cabinet repository, then re-run this skill.
```

## Step 2: Initialize Thoughts

Run `thc init` interactively. This will:
- Create or connect to a thoughts git repo
- Map the current repository to a named directory
- Create `thoughts/` with symlinks (`{user}/`, `shared/`, `global/`)
- Generate `thoughts/CLAUDE.md` with usage guidance
- Install git hooks (pre-commit to prevent committing thoughts/, post-commit to auto-sync)

```bash
thc init
```

**For non-interactive mode** (recommended for automation and skill scripts), derive the directory name from the repo basename. This works even on first run — `thc init` will auto-create the global config with defaults and create the directory if it doesn't exist:
```bash
thc init --directory "$(basename "$(pwd)")"
```

After init completes, verify:
```bash
[ -L thoughts/shared ] && [ -L thoughts/global ] && echo "thoughts: OK" || echo "thoughts: FAILED"
```

If verification fails, stop and report the error.

## Step 3: Bootstrap Agent Memory

**If AGENTS.md already exists**: Ask the user whether to regenerate or skip.

**If AGENTS.md does not exist**: Invoke the `init-agent-memory` skill to create it.

The init-agent-memory skill will:
1. Research the codebase (tech stack, directories, commands, patterns)
2. Propose an AGENTS.md structure
3. Write AGENTS.md (under 150 lines) and docs/architectural-patterns.md
4. Create CLAUDE.md as a symlink to AGENTS.md

**Important**: The `thoughts/CLAUDE.md` generated in Step 2 and the root `CLAUDE.md` from this step serve different purposes:
- `thoughts/CLAUDE.md` — explains the thoughts directory structure and usage rules
- `./CLAUDE.md` — project memory for the AI agent (symlink to AGENTS.md)

## Step 4: Verify and Present

Run a final verification:

```bash
echo "=== Onboarding Status ==="

# Thoughts
[ -L thoughts/shared ] && [ -L thoughts/global ] && echo "[OK] thoughts/ initialized" || echo "[FAIL] thoughts/ not initialized"

# Agent memory
[ -f AGENTS.md ] && echo "[OK] AGENTS.md created" || echo "[SKIP] AGENTS.md not created"
[ -L CLAUDE.md ] && echo "[OK] CLAUDE.md symlink" || ([ -f CLAUDE.md ] && echo "[OK] CLAUDE.md exists" || echo "[SKIP] CLAUDE.md not created")

# Git hooks
GIT_DIR=$(git rev-parse --git-common-dir 2>/dev/null)
[ -f "$GIT_DIR/hooks/pre-commit" ] && echo "[OK] pre-commit hook" || echo "[WARN] no pre-commit hook"
[ -f "$GIT_DIR/hooks/post-commit" ] && echo "[OK] post-commit hook" || echo "[WARN] no post-commit hook"

echo "=== Done ==="
```

Present results:

```
Project onboarding complete!

- thoughts/ connected to [thoughts repo path]
- AGENTS.md created with project context
- Git hooks installed (auto-sync on commit)

You're ready to use skills like /creating-plan, /research-codebase, and /implementing-plan.
```

If any step was skipped or failed, note it clearly with suggested remediation.

## Guidelines

**Be incremental**: Each step checks preconditions and skips if already done. Re-running the skill should be safe.

**Fail fast**: If a critical step fails (thoughts init, thc not installed), stop and report rather than continuing with a broken setup.

**Minimal prompting**: Only ask questions when the answer cannot be inferred from the environment. Detect existing setup automatically.

**Respect existing work**: Never overwrite AGENTS.md, CLAUDE.md, or thoughts/ without explicit user confirmation.
