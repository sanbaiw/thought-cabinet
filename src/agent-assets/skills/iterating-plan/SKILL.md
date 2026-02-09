---
name: iterating-plan
description: Iterate on existing implementation plans with thorough research and updates. Use when updating existing plans based on feedback, refining plan phases or success criteria, or adjusting plan scope.
---

# Iterating on Implementation Plans

Update existing implementation plans based on user feedback through a surgical, verified approach.

## Workflow

1. **Identify plan and feedback** - Parse input for plan path and requested changes
2. **Read and understand** - Read the entire existing plan
3. **Research if needed** - Only for changes requiring new technical understanding
4. **Confirm approach** - Present understanding before modifying
5. **Update surgically** - Make precise edits, preserve good content
6. **Sync and review** - Commit changes, offer further iteration

## Step 1: Handle Input

**If NO plan file provided:**
```
Which plan would you like to update? Please provide the path.
Tip: `ls -lt thoughts/shared/plans/ | head`
```

**If plan file but NO feedback:**
```
I've found the plan at [path]. What changes would you like to make?
Examples: "Add a phase for X", "Update success criteria", "Split Phase 2"
```

**If BOTH provided:** Proceed directly to Step 2.

## Step 2: Read and Understand

1. **Read the existing plan FULLY** - No limit/offset parameters
2. **Parse requested changes** - What to add/modify/remove
3. **Determine if research needed** - Only for new technical understanding

## Step 3: Research If Needed

Skip if changes are simple (reordering, rewording, scope adjustments).

Only spawn research if the feedback requires *new technical understanding* or *validating assumptions*.

1. **Create a research todo list** with TodoWrite (only if research is non-trivial)
2. **Spawn parallel, focused sub-tasks** (do not research serially if tasks are independent)
   - Be explicit about **exact directories** to search and what signals to extract
   - Ask sub-tasks to return **file:line references** for every claim

**Code investigation (pick the right one):**
- `codebase-locator` - Find relevant files quickly
- `codebase-analyzer` - Understand implementation details and constraints
- `codebase-pattern-finder` - Find similar patterns to model after

**Historical context:**
- `thoughts-locator` - Find related research or decisions
- `thoughts-analyzer` - Extract insights from prior documents

3. **Read any newly-identified files FULLY** into main context (Read without limit/offset)
4. **Wait for ALL sub-tasks to complete** before synthesizing
5. **Verify sub-task results**: if something seems off, spawn a follow-up task immediately

## Step 4: Confirm Approach

```
Based on your feedback, I understand you want to:
- [Change 1]
- [Change 2]

My research found:
- [Relevant discovery]

I plan to update by:
1. [Specific modification]
2. [Another modification]

Does this align with your intent?
```

Get confirmation before proceeding.

## Step 5: Update the Plan

1. **Make surgical edits** using the Edit tool
2. **Maintain existing structure** unless explicitly changing it
3. **Keep file:line references accurate**
4. **Ensure consistency** - new phases follow existing pattern
5. **Update related sections** - scope, success criteria, approach

## Step 6: Sync and Review

```bash
thoughtcabinet sync -m "[message]"
```

Present changes made and offer further iteration.

```
I've updated the plan at `thoughts/shared/plans/[filename].md`

Changes made:
- [Specific change 1]
- [Specific change 2]

The updated plan now:
- [Key improvement]
- [Another improvement]

Would you like any further adjustments?
```

## Guidelines

**Be Skeptical:**
- Question vague feedback - ask for clarification
- Verify technical feasibility with research
- Point out conflicts with existing phases

**Be Surgical:**
- Precise edits, not wholesale rewrites
- Only research what's necessary
- Preserve content that doesn't need changing

**Be Interactive:**
- Confirm understanding before changes
- Allow course corrections
- Don't disappear into research

**Track Progress:**
- Use TodoWrite to track research/update work if complex
- Mark research tasks complete as you finish them

**No Open Questions:**
- Research or ask immediately if uncertain
- Never update plan with unresolved questions

## Success Criteria Structure

Maintain two-category structure when updating:

1. **Automated Verification** - Commands like `make test`, `npm run lint`
2. **Manual Verification** - UI/UX, performance, edge cases

## Path Handling

- The `thoughts/searchable/` directory contains hard links for searching
- Always use canonical paths when referencing or writing files
  - Use: `thoughts/shared/prs/123.md`
  - Not: `thoughts/searchable/shared/prs/123.md`
