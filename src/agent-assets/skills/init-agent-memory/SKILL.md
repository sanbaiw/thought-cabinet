---
name: init-agent-memory
description: Initializes agent memory for a new project by creating a concise AGENTS.md and supporting docs with progressive disclosure. Use when onboarding an agent to a repository, bootstrapping first-run project context, or replacing an overly long memory file with a scoped index to docs references.
---

# Initializing Agent Memory

Create high-signal project memory for new repositories by generating `AGENTS.md` plus focused supporting docs under `docs/`, then creating `CLAUDE.md` as a compatibility symlink.

## Workflow Context

This skill establishes the baseline memory docs used by all coding and research skills:

1. **init-agent-memory** (this skill) - Create `AGENTS.md`, foundational supporting docs, and a compatibility symlink
2. `research-codebase` - Deepen or update technical documentation when needed
3. `writing-skill` - Create or revise additional workflow skills after memory is established

The output should optimize fast orientation: short primary doc, detailed references in separate files.

## Workflow Overview

1. **Gather context** - Read user instructions and repository facts; ask only unresolved questions
2. **Research evidence** - Identify tech stack, project layout, commands, and repeated architectural patterns with file:line references
3. **Propose structure** - Share planned AGENTS.md sections and supporting docs before writing
4. **Write docs** - Generate `AGENTS.md`, supporting docs, and the `CLAUDE.md` symlink
5. **Quality review** - Validate constraints from the request and improve clarity

## Step 1: Gather Context

### Read Inputs First

If present, read these in order:
1. User-provided memory instructions (for example `init_agent_memory.md`)
2. Existing `AGENTS.md` and `CLAUDE.md`
3. `README.md` and package/build metadata

Read full files before drafting. Do not assume conventions.

### Ask Only Missing Questions

Only ask if required information cannot be inferred from repository files. Keep questions minimal and concrete.

Example:

```text
I can generate the initial memory docs. One point is still unclear: should AGENTS.md include only project-level workflows, or also team-specific process notes?
```

## Step 2: Research Evidence

Collect concrete references for each required section.

### Required Evidence Buckets

- **Project overview (WHY):** repository purpose and problem domain
- **Tech stack (WHAT):** languages, frameworks, runtime, major tooling
- **Key directories (WHAT):** top-level modules and responsibilities
- **Essential commands (HOW):** build, test, lint, run workflows used daily
- **Architectural patterns:** conventions/design decisions that appear in multiple files

### Evidence Rules

- Use file:line references instead of code snippets
- Prefer primary sources (`src/`, command definitions, config files)
- For architectural patterns, include only patterns supported by at least two code references
- If evidence conflicts across docs and code, prefer the code and mention mismatch briefly

## Step 3: Propose Structure

Before writing files, share a concise structure proposal and get confirmation.

Use this format:

```text
Here is the proposed memory layout.

AGENTS.md (under 150 lines):
1. Project Overview
2. Tech Stack
3. Key Directories
4. Essential Build/Test Commands
5. Additional Documentation

Supporting docs:
- docs/architectural-patterns.md

I will keep AGENTS.md as an index and push detail into supporting docs (progressive disclosure).
I will then create CLAUDE.md as a symlink to AGENTS.md for backward compatibility.
Should I proceed with this structure?
```

If the user already requested this exact structure explicitly, treat that as approval and proceed.

## Step 4: Write Docs

### 4a. Create `AGENTS.md`

Use [claude-memory-template.md](claude-memory-template.md).

Required constraints:
- Keep total length under 150 lines
- Include WHAT, WHY, HOW coverage
- Use file:line references instead of code snippets
- Do not include formatting/style rules that linters already enforce
- Add an "Additional Documentation" section that points to `docs/*`

### 4b. Create `docs/architectural-patterns.md`

Use [architectural-patterns-template.md](architectural-patterns-template.md).

Required constraints:
- Document only recurring patterns and conventions
- Every pattern needs concrete evidence with file:line references
- Focus on decisions that influence future implementation work

### 4c. Create `CLAUDE.md` Symlink

After writing `AGENTS.md`, create `CLAUDE.md` as a symlink to `AGENTS.md` in the same directory.

If `CLAUDE.md` already exists as a regular file (not a symlink):
1. Read the existing `CLAUDE.md` content
2. Identify any useful, non-redundant content not already covered by the new `AGENTS.md`
3. Incorporate that content into `AGENTS.md` (respecting the 150-line limit) or into a supporting doc under `docs/`
4. Remove the old `CLAUDE.md` file and replace it with the symlink

Create the symlink with:
```bash
ln -sf AGENTS.md CLAUDE.md
```

Required constraints:
- `AGENTS.md` is the canonical file
- `CLAUDE.md` is a symlink (not a duplicate copy)
- The symlink target resolves to `AGENTS.md` from the repository root
- Pre-existing `CLAUDE.md` content must be preserved (merged into `AGENTS.md` or `docs/`) before replacement

### 4d. Progressive Disclosure Rules

- Keep `AGENTS.md` concise and universally applicable
- Put specialized details in `docs/*.md`
- References from `AGENTS.md` should be direct and descriptive
- Avoid deep reference chains

## Step 5: Quality Review

Run this checklist before presenting output:

- [ ] `AGENTS.md` is under 150 lines
- [ ] `CLAUDE.md` is a symlink to `AGENTS.md`
- [ ] Sections cover project overview, tech stack, key directories, essential commands, additional docs
- [ ] File:line references are present and accurate
- [ ] No code snippets in `AGENTS.md`
- [ ] No generic formatting/style guidance duplicated from linters
- [ ] `docs/architectural-patterns.md` includes only repeated patterns with evidence
- [ ] Terminology is consistent (`AGENTS.md`, `CLAUDE.md` symlink, "Additional Documentation", `docs/`)

Present result with file paths and invite targeted revision requests.

## Guidelines

**Scope discipline:**
- Optimize for first-session usefulness, not exhaustive documentation
- Prefer omission over speculative or weakly supported claims

**Progressive disclosure:**
- `AGENTS.md` is an entrypoint index
- Keep advanced details in dedicated `docs/` files

**Reliability:**
- Cite source lines for every non-trivial claim
- Re-check references after edits
