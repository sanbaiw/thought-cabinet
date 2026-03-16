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

1. **Pre-flight + Initialize thoughts** - Run `onboard.sh`: check environment, run `thc init`
2. **Bootstrap agent memory** - Invoke `init-agent-memory` skill (if needed)
3. **Verify** - Run `onboard.sh --verify-only`: confirm everything is wired up

## Step 1: Pre-flight and Initialize Thoughts

Run: `bash onboard.sh`

**Exit codes determine next action**:
- **1** — Fatal error (not a git repo, thc missing, init failed). Stop and report.
- **2** — Thoughts ready, AGENTS.md not found. Proceed to Step 2.
- **3** — Thoughts + AGENTS.md both exist. Ask user if they want to regenerate memory or skip to Step 3.

If thoughts was already initialized and user wants to re-initialize:
```bash
bash onboard.sh --force
```

## Step 2: Bootstrap Agent Memory

**If AGENTS.md already exists**: Ask the user whether to regenerate or skip.

**If AGENTS.md does not exist**: Invoke the `init-agent-memory` skill.

**Note**: `thoughts/CLAUDE.md` (from Step 1) and root `CLAUDE.md` (from this step) serve different purposes:
- `thoughts/CLAUDE.md` — thoughts directory usage rules
- `./CLAUDE.md` — project memory for the AI agent (symlink to AGENTS.md)

## Step 3: Verify and Present

Run: `bash onboard.sh --verify-only`

Present results to user:

```
Project onboarding complete!

- thoughts/ connected to [thoughts repo path]
- AGENTS.md created with project context
- Git hooks installed (auto-sync on commit)

You're ready to use skills like /creating-plan, /research-codebase, and /implementing-plan.
```

If any step was skipped or failed, note it clearly with suggested remediation.

## Guidelines

**Be incremental**: Re-running the skill should be safe — each step skips if already done.

**Fail fast**: If a critical step fails, stop and report rather than continuing with a broken setup.

**Minimal prompting**: Only ask questions when the answer cannot be inferred from the environment.

**Respect existing work**: Never overwrite AGENTS.md, CLAUDE.md, or thoughts/ without explicit user confirmation.
