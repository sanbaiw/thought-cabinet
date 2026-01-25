---
name: creating-plan
description: Create detailed implementation plans through interactive research and iteration. Use when (1) planning new features or changes, (2) needing to understand codebase before implementation, (3) creating technical specifications. Triggers on requests like "create a plan for", "help me plan", or "/create_plan".
---

# Creating Implementation Plans

Create detailed implementation plans through an interactive, iterative process. Be skeptical, thorough, and work collaboratively to produce high-quality technical specifications.

## Workflow Overview

1. **Gather context** - Read provided files, research codebase
2. **Ask clarifying questions** - Only what research couldn't answer
3. **Discover and propose options** - Present design choices with tradeoffs
4. **Structure the plan** - Get approval on phases before detailing
5. **Write the plan** - Use the template in [references/plan-template.md](references/plan-template.md)
6. **Iterate** - Refine until user is satisfied

## Step 1: Context Gathering

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

## Step 2: Research & Discovery

If the user corrects any misunderstanding:
1. DO NOT just accept the correction
2. Spawn new research tasks to verify
3. Read the specific files/directories mentioned
4. Only proceed once verified

### Spawn Parallel Research Tasks

Use the right agent for each type:

**Deeper investigation:**
- `codebase-locator` - Find specific files
- `codebase-analyzer` - Understand implementation details
- `codebase-pattern-finder` - Find similar features to model after

**Historical context:**
- `thoughts-locator` - Find research, plans, or decisions
- `thoughts-analyzer` - Extract insights from relevant documents

Wait for ALL sub-tasks to complete before proceeding.

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

Once aligned on approach:

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

2. **Write plan** using [references/plan-template.md](references/plan-template.md)

3. **Sync thoughts directory**:
   ```bash
   thoughtcabinet sync
   ```

## Step 5: Review & Iterate

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
- Research actual code patterns using parallel sub-tasks
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

## Sub-task Best Practices

When spawning research sub-tasks:

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
