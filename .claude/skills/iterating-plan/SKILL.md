---
name: iterating-plan
description: Iterate on existing implementation plans with thorough research and updates. Use when (1) updating existing plans based on feedback, (2) refining plan phases or success criteria, (3) adjusting plan scope. Triggers on requests like "update the plan", "iterate on this plan", or "/iterate_plan".
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

For changes requiring technical validation, spawn parallel sub-tasks:

**Code investigation:**
- `codebase-locator` - Find relevant files
- `codebase-analyzer` - Understand implementation details
- `codebase-pattern-finder` - Find similar patterns

**Historical context:**
- `thoughts-locator` - Find related research or decisions
- `thoughts-analyzer` - Extract insights from documents

See [references/research-guidance.md](references/research-guidance.md) for detailed patterns.

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
thoughtcabinet sync -m "Iterate on plan: [description]"
```

Present changes made and offer further iteration.

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

**No Open Questions:**
- Research or ask immediately if uncertain
- Never update plan with unresolved questions

## Success Criteria Structure

Maintain two-category structure when updating:

1. **Automated Verification** - Commands like `make test`, `npm run lint`
2. **Manual Verification** - UI/UX, performance, edge cases

## Path Handling

The `thoughts/searchable/` directory contains hard links.
Always use canonical paths: `thoughts/shared/plans/...`, not `thoughts/searchable/shared/plans/...`
