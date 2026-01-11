---
name: writing-plan
description: Write implementation plan documents to thoughts/shared/plans/. Use when (1) creating a new implementation plan after research is complete, (2) writing technical specifications with phases and success criteria, (3) documenting planned changes with file paths and code snippets. Triggers on requests like "write the plan", "create the plan document", or after plan structure has been approved.
---

# Write Implementation Plan

Write structured implementation plans to `thoughts/shared/plans/YYYY-MM-DD-description.md`.

## Workflow

1. **Determine file path**: `thoughts/shared/plans/YYYY-MM-DD-description.md`
   - YYYY-MM-DD: today's date
   - description: brief kebab-case summary (e.g., `improve-error-handling`)

2. **Write plan** using the template structure below

3. **Sync thoughts directory**: Run `thoughtcabinet sync` after writing

## Plan Template

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

```[language]
// Specific code to add/modify
```

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

## Testing Strategy

### Unit Tests:

- [What to test]
- [Key edge cases]

### Integration Tests:

- [End-to-end scenarios]

### Manual Testing Steps:

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
