# Implementation Plan Template

## File Path Convention

`thoughts/shared/plans/YYYY-MM-DD-description.md`

- YYYY-MM-DD: today's date
- description: brief kebab-case summary (e.g., `improve-error-handling`)

## Template

````markdown
# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why]

## Current State Analysis

[What exists now, what's missing, key constraints discovered]

## Desired End State

[Specification of the desired end state and how to verify it]

### Key Discoveries:

- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]

## Implementation Approach

[High-level strategy and reasoning]

## Phase 1: [Descriptive Name]

### Overview

[What this phase accomplishes]

### Changes Required:

#### 1. [Component/File Group]

**File**: `path/to/file.ext`
**Changes**: [Summary of changes]

##### Testable Behaviors (RED tests)

> Each bullet is one TDD RED test. `implementing-plan` writes each test first, watches it fail, then writes the minimal code to pass it.

- [Input/condition] → [expected output/behavior]
- [Edge case] → [expected behavior]
- [Error case] → [expected fallback]

##### Reference Implementation

```[language]
// Suggested implementation — written AFTER the RED tests pass.
// implementing-plan must not read this before writing the failing tests.
```

---

### Success Criteria:

#### Automated Verification:

- [ ] Migration applies cleanly: `make migrate`
- [ ] Unit tests pass: `make test`
- [ ] Type checking passes: `npm run typecheck`
- [ ] Linting passes: `make lint`

#### Manual Verification:

- [ ] Feature works as expected when tested via UI
- [ ] Performance is acceptable
- [ ] No regressions in related features

**Implementation Note**: After completing this phase and all automated verification passes, pause for manual confirmation before proceeding to the next phase.

---

## Phase 2: [Descriptive Name]

[Similar structure...]

---

## Integration Testing

[End-to-end scenarios that require multiple components working together — not covered by unit tests above]

## Manual Testing Steps

1. [Specific verification step]
2. [Edge case to test manually]

## Performance Considerations

[Any performance implications or optimizations needed]

## Migration Notes

[If applicable, how to handle existing data/systems]

## References

- Related research: `thoughts/shared/research/[relevant].md`
- Similar implementation: `[file:line]`
````

## Success Criteria Guidelines

Always separate into two categories:

**Automated Verification** (commands agents can run):
- Build/compile commands
- Test suites
- Type checking
- Linting

**Manual Verification** (requires human):
- UI/UX functionality
- Performance under real conditions
- User acceptance criteria

## TDD Compatibility Requirements

When writing each change block, ask:

1. **Are the testable behaviors specific enough to write a failing test from?**
   - Bad: "handles null input"
   - Good: "`envCreateTime=null` with cutoff set → returns `false` (safe fallback)"

2. **Is the behavior written before the code block?**
   - The testable behaviors section must appear before the reference implementation.
   - The implementer reads behaviors first and writes the RED test before reading the code.

3. **Does each bullet map to exactly one test?**
   - Compound behaviors (A and B) → split into two bullets.
   - Each bullet = one `def "..."()` / `it(...)` / `test(...)`.

4. **Is the code block labeled "Reference Implementation"?**
   - Never label it "Code to write" or "Implementation".
   - The label signals it is consulted only after RED → GREEN, not before.

## Common Patterns

### Database Changes:

1. Schema/migration
2. Store methods
3. Business logic
4. API endpoints
5. Client updates

### New Features:

1. Data model
2. Backend logic
3. API endpoints
4. UI implementation

### Refactoring:

1. Document current behavior
2. Plan incremental changes
3. Maintain backwards compatibility
4. Include migration strategy
