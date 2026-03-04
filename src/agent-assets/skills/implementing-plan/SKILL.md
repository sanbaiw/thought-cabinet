---
name: implementing-plan
description: Implement technical plans from thoughts/shared/plans with verification. Use when executing approved implementation plans, resuming partially completed plans, or when the user mentions execute plan or resume plan.
---

# Implementing Plans

Execute approved technical plans from `thoughts/shared/plans/` with verification at each phase.

## Workflow Context

This skill executes plans produced by `creating-plan`:

1. `creating-plan` — Research, design, write the plan
2. **implementing-plan** (this skill) — Execute phase-by-phase with verification
3. `validating-plan` — Audit the implementation against the plan

The plan file at `thoughts/shared/plans/` is the contract. Success criteria in the plan are executed literally — automated verification commands are run as written.

### Test-Driven Implementation

**MANDATORY**: Apply the `test-driven-development` skill's RED-GREEN-REFACTOR cycle for every unit of production code written within a phase.

The procedure for each unit of work:

1. Write a failing test (RED)
2. Write minimal code to pass (GREEN)
3. Refactor while keeping tests green
4. Repeat for the next behavior

After all TDD cycles in the phase are complete, run the phase's automated verification commands as the final gate.

**Resolving conflicts with the plan**: If the plan says "no tests needed", evaluate independently — apply TDD unless genuinely untestable (pure wiring, no behavioral logic). Document any skip with a reason in the phase completion message.

## Getting Started

When given a plan path:

1. Read the plan completely - check for existing checkmarks (- [x])
2. Read ALL files mentioned in the plan without limit/offset
3. Understand how the pieces fit together
4. Create a todo list to track progress
5. Begin implementation of the **first uncompleted phase only**

If no plan path provided, ask for one:

```
Which plan would you like to implement? Please provide the path.
Tip: `ls -lt thoughts/shared/plans/ | head`
```

## Implementation Workflow

### Following the Plan

Plans are carefully designed, but reality can be messy:

- Follow the plan's intent while adapting to discoveries
- Implement each phase fully before moving to the next
- Verify work makes sense in the broader codebase context
- **Update checkboxes in the plan as sections complete**
- Maintain a detailed todo list tracking each task step-by-step

### Handling Mismatches

When reality doesn't match the plan:

1. STOP and think deeply about why
2. Present the issue clearly:

```
Issue in Phase [N]:
Expected: [what the plan says]
Found: [actual situation]
Why this matters: [explanation]

How should I proceed?
```

## Phase Implementation Workflow

Before writing any production code for a phase:

1. Identify the testable behaviors the phase introduces or changes
2. Apply the `test-driven-development` RED-GREEN-REFACTOR cycle for each behavior
3. Only after all TDD cycles are complete, proceed to the completion checklist below

## Phase Completion Checklist

After implementing a phase (all TDD cycles done), follow this checklist **in order**:

1. Run automated success criteria checks (compile, tests, etc.)
2. Fix any issues found
3. Update checkboxes in the plan file for completed automated verification items
4. Update progress in todo list
5. **STOP** and present the verification message (see below)
6. **WAIT** for user confirmation before starting next phase

### Verification Message Template

```
Phase [N] Complete - Ready for Manual Verification

Automated verification passed:
- [List automated checks that passed]

Please perform the manual verification steps listed in the plan:
- [List manual verification items from the plan]

Let me know when manual testing is complete so I can proceed to Phase [N+1].
```

### Before Starting Any New Phase - Ask Yourself:

1. Did the user explicitly confirm the previous phase is complete?
2. Did the user explicitly request multiple phases?

If BOTH answers are NO → **Do not proceed. Wait for user input.**

Do NOT check off manual testing steps in the plan until confirmed by the user

## Resuming Work

If the plan has existing checkmarks:

- Trust that completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

## When Stuck

When something isn't working as expected:

1. Read and understand all relevant code first
2. Consider if the codebase evolved since the plan was written
3. Present the mismatch clearly and ask for guidance

Use tasks sparingly - mainly for targeted debugging or exploring unfamiliar territory.

## Guidelines

**One Phase at a Time**: Stop after each phase. Wait for confirmation. This is the default.

**Follow Intent**: The plan is your guide, but judgment matters. Adapt to discoveries while preserving the plan's goals.

**Be Thorough**: Read files completely. Understand context before making changes.

**Communicate Clearly**: When things don't match, explain why and ask for direction.

**Track Progress**: Update checkboxes in the plan and maintain todo list for visibility.

## Path Handling

- The `thoughts/searchable/` directory contains hard links for searching
- Always use canonical paths when referencing or writing files
  - Use: `thoughts/shared/prs/123.md`
  - Not: `thoughts/searchable/shared/prs/123.md`
