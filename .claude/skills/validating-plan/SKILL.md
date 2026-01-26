---
name: validating-plan
description: Validate implementation against plan, verify success criteria, identify issues. Use when (1) verifying implementation correctness after execution, (2) checking if success criteria are met, (3) identifying deviations or potential issues. Triggers on requests like "validate the plan", "verify the implementation", "/validate_plan", or after implementation is complete.
---

# Validating Plans

Verify implementation correctness against the plan, run automated checks, and identify issues or deviations.

## Getting Started

Determine your context:

1. **Existing conversation**: Review what was implemented in this session
2. **Fresh start**: Discover what was done through git and codebase analysis

If plan path provided, use it. Otherwise:
```
Which plan would you like to validate? Please provide the path.
Tip: `ls -lt thoughts/shared/plans/ | head`
```

## Context Discovery

When starting fresh:

1. Read the implementation plan completely
2. Check recent commits for implementation evidence:
   ```bash
   git log --oneline -n 20
   git diff HEAD~N..HEAD  # Where N covers implementation commits
   ```
3. Identify what should have changed:
   - Files that should be modified
   - Success criteria (automated and manual)
   - Key functionality to verify

## Validation Workflow

### Phase Verification

For each phase in the plan:

1. **Check completion status**: Look for checkmarks (- [x]) and verify actual code matches
2. **Run automated verification**: Execute commands from success criteria
3. **Assess manual criteria**: List what needs manual testing
4. **Think critically**: Consider edge cases, error handling, regressions

### Spawning Research Tasks

For complex validations, spawn parallel research tasks:

```
Task 1 - Verify code changes:
Find all modified files related to [feature].
Compare actual changes to plan specifications.
Return: File-by-file comparison of planned vs actual

Task 2 - Verify test coverage:
Check if tests were added/modified as specified.
Run test commands and capture results.
Return: Test status and any missing coverage
```

### Running Comprehensive Checks

Execute the project's standard verification:
```bash
cd $(git rev-parse --show-toplevel) && make check test
```

## Validation Report

Generate a comprehensive summary:

```markdown
## Validation Report: [Plan Name]

### Implementation Status

[Use checkmarks for each phase]
- Phase 1: [Name] - Status
- Phase 2: [Name] - Status

### Automated Verification Results

[Results from running success criteria commands]

### Code Review Findings

#### Matches Plan:
- [What was implemented correctly]

#### Deviations from Plan:
- [Differences with file:line references]

#### Potential Issues:
- [Problems or concerns identified]

### Manual Testing Required:

[Checklist of manual verification steps]

### Recommendations:

[Action items before considering implementation complete]
```

## Working with Session Context

If you were part of the implementation:

- Review conversation history
- Check todo list for what was completed
- Focus validation on work done in this session
- Be honest about shortcuts or incomplete items

## Guidelines

**Be thorough**: Run all automated checks, don't skip verification commands

**Document everything**: Both successes and issues

**Think critically**: Question if the implementation truly solves the problem

**Consider maintenance**: Will this be maintainable long-term?

## Validation Checklist

Always verify:

- [ ] All phases marked complete are actually done
- [ ] Automated tests pass
- [ ] Code follows existing patterns
- [ ] No regressions introduced
- [ ] Error handling is robust
- [ ] Documentation updated if needed
- [ ] Manual test steps are clear

## Workflow Context

This skill works best after commits are made. Recommended workflow:

1. `/implement_plan` - Execute the implementation
2. `/commit` - Create atomic commits for changes
3. `/validate_plan` - Verify implementation correctness

