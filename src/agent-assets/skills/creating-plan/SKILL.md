---
name: creating-plan
description: Create detailed implementation plans through interactive research and iteration. Use when planning new features, designing changes, writing technical specs.
---

# Creating Implementation Plans

Create detailed implementation plans through an interactive, iterative process. Be skeptical, thorough, and work collaboratively to produce high-quality technical specifications.

## Workflow Context

This skill produces the plan document consumed by downstream skills:

1. **creating-plan** (this skill) — Research, design, write the plan
2. `implementing-plan` — Execute the plan phase-by-phase, running build/lint/test after each phase
3. `validating-plan` — Audit the implementation against the plan

The plan file at `thoughts/shared/plans/YYYY-MM-DD-description.md` is the contract between these skills. Write success criteria knowing that `implementing-plan` will run the automated verification commands literally.

## Workflow Overview

1. **Gather context & clarify** - Research codebase, present understanding, ask only what research couldn't answer
2. **Research & propose options** - Deeper investigation based on user input, present design choices with tradeoffs
3. **Structure the plan** - Get approval on phases before detailing
4. **Write the plan** - Detailed, actionable plan following the template
5. **Iterate** - Refine until user is satisfied

## Step 1: Gather Context & Clarify

### If Parameters Provided

Read all mentioned files FULLY without limit/offset parameters:
- Research documents
- Related implementation plans
- JSON/data files

### Spawn Research Tasks

Before asking questions, use specialized agents to research in parallel:

```
Tasks to spawn concurrently:
- codebase-locator: Find all files related to the task
- codebase-analyzer: Understand current implementation
- thoughts-locator: Find existing thoughts documents about this feature
```

After tasks complete, read ALL identified files into context.

### Present Understanding

```
Based on the task and my research of the codebase, I understand we need to [accurate summary].

I've found that:
- [Current implementation detail with file:line reference]
- [Relevant pattern or constraint discovered]
- [Potential complexity or edge case identified]

Questions that my research couldn't answer:
- [Specific technical question that requires human judgment]
- [Business logic clarification]
- [Design preference that affects implementation]
```

Only ask questions you genuinely cannot answer through code investigation.

## Step 2: Research & Propose Options

After the user responds to Step 1 (whether confirming understanding, answering questions, or correcting misunderstandings):

**If the user corrects any misunderstanding:**
1. DO NOT just accept the correction
2. Spawn new research tasks to verify
3. Read the specific files/directories mentioned
4. Only proceed once verified

**If the user confirms understanding or provides answers:**
Spawn deeper research tasks informed by the user's input to explore the solution space.

### Spawn Parallel Research Tasks

Use the right agent for each type:

**Deeper investigation:**
- `codebase-locator` - Find specific files
- `codebase-analyzer` - Understand implementation details
- `codebase-pattern-finder` - Find similar features to model after

**Historical context:**
- `thoughts-locator` - Find research, plans, or decisions
- `thoughts-analyzer` - Extract insights from relevant documents

Wait for ALL tasks to complete before proceeding.

### Present Findings

```
Based on my research, here's what I found:

**Current State:**
- [Key discovery about existing code]
- [Pattern or convention to follow]

**Design Options:**
1. [Option A] - [pros/cons]
2. [Option B] - [pros/cons]

**Open Questions:**
- [Technical uncertainty]
- [Design decision needed]

Which approach aligns best with your vision?
```

## Step 3: Plan Structure

Once aligned on approach, propose the phase structure. Each phase MUST be independently verifiable — see [Phase Independence](#phase-independence) below.

```
Here's my proposed plan structure:

## Overview
[1-2 sentence summary]

## Implementation Phases:
1. [Phase name] - [what it accomplishes]
2. [Phase name] - [what it accomplishes]
3. [Phase name] - [what it accomplishes]

Does this phasing make sense? Should I adjust the order or granularity?
```

Get feedback on structure before writing details.

## Step 4: Write the Plan

After structure approval:

1. **Determine file path**: `thoughts/shared/plans/YYYY-MM-DD-description.md`
   - YYYY-MM-DD: today's date
   - description: brief kebab-case summary
   - If a file already exists at this path, append a numeric suffix (e.g. `-2`) or ask the user

2. **Write plan** using [plan-template.md](plan-template.md)
   - **MUST** Read the template and follow the structure exactly.

3. **Sync thoughts directory**:
   ```bash
   thoughtcabinet sync -m "Plan: <description>"
   ```

## Step 5: Iterate

Present the draft location:

```
I've created the initial implementation plan at:
`thoughts/shared/plans/YYYY-MM-DD-description.md`

Please review it and let me know:
- Are the phases properly scoped?
- Are the success criteria specific enough?
- Any technical details that need adjustment?
- Missing edge cases or considerations?
```

Iterate until the user is satisfied.

## Phase Independence

Each phase MUST be independently verifiable. `implementing-plan` runs build/lint/test and pauses for manual verification after each phase, so phases cannot have circular dependencies.

**Requirements:**
- Code must compile/build after completing each phase alone
- If Phase N imports from Phase N+1, include stubs or reorder phases
- Success criteria should be testable without implementing later phases
- Ask: "Can I run build/lint/test and pause for manual verification after this phase alone?"

**BAD phase structure:**
```
Phase 1: Create command that imports handler
Phase 2: Create handler module
```
Problem: Phase 1 won't compile until Phase 2 is done.

**GOOD phase structure:**
```
Phase 1: Create handler module with core logic
Phase 2: Create command that imports and uses handler
```
Each phase compiles independently.

**Alternative if imports are unavoidable:**
```
Phase 1: Create command with stub imports, create empty handler module with stub exports
Phase 2: Implement handler logic
```
Both phases compile; Phase 1 has minimal but working functionality.

## Guidelines

### Be Skeptical
- Question vague requirements
- Identify potential issues early
- Ask "why" and "what about"
- Don't assume - verify with code

### Be Interactive
- Don't write the full plan in one shot
- Get buy-in at each major step
- Allow course corrections
- Work collaboratively

### Be Thorough
- Read all context files COMPLETELY
- Research actual code patterns using parallel tasks
- Include specific file paths and line numbers
- Write measurable success criteria

### Be Practical
- Focus on incremental, testable changes
- Consider migration and rollback
- Think about edge cases
- Include "what we're NOT doing"

### No Open Questions in Final Plan
- If you encounter open questions, STOP
- Research or ask for clarification immediately
- The implementation plan must be complete and actionable

## Research Task Best Practices

When spawning research tasks:

1. **Spawn multiple tasks in parallel** for efficiency
2. **Each task should be focused** on a specific area
3. **Provide detailed instructions** including:
   - Exactly what to search for
   - Which directories to focus on
   - What information to extract
4. **Be specific about directories** - include full path context
5. **Request specific file:line references** in responses
6. **Wait for all tasks to complete** before synthesizing
7. **Verify results** - if unexpected, spawn follow-up tasks
