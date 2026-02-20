---
name: validating-plan
description: Validate implementation against plan, verify success criteria, identify issues. Use after implementing-plan to confirm execution, check success criteria, and generate validation reports.
---

# Validating Plan

Verify that implementation plans from `thoughts/shared/plans/` were correctly executed, check success criteria, and identify deviations or issues.

## Getting Started

### Determine Context

1. **Existing conversation**: Review what was implemented in this session
2. **Fresh start**: Discover implementation through git and codebase analysis

### Locate the Plan

If plan path provided, use it. Otherwise:
```bash
ls -lt thoughts/shared/plans/ | head
```
Ask user which plan to validate.

### Gather Implementation Evidence

```bash
# Recent commits
git log --oneline -n 20

# Diff covering implementation commits
git diff HEAD~N..HEAD  # Where N covers implementation commits

# Run verification
cd $(git rev-parse --show-toplevel) && make check test
```

## Validation Workflow

### Step 1: Context Discovery

Read the implementation plan completely and identify:
- All files that should be modified
- All success criteria (automated and manual)
- Key functionality to verify

Use parallel research tasks if needed (via Task tool):
```
codebase-analyzer: Verify changes match plan specifications
thoughts-locator: Find related documentation or decisions
```

### Step 2: Systematic Validation

For each phase in the plan:

1. **Check completion status**
   - Look for checkmarks (- [x])
   - Verify code matches claimed completion

2. **Run automated verification**
   - Execute commands from "Automated Verification"
   - Document pass/fail status
   - Investigate failures

3. **Assess manual criteria**
   - List what needs manual testing
   - Provide clear steps for user

4. **Analyze edge cases**
   - Were error conditions handled?
   - Missing validations?
   - Potential regressions?

### Step 3: Generate Validation Report

```markdown
## Validation Report: [Plan Name]

### Implementation Status

- Phase 1: [Name] - [Status]
- Phase 2: [Name] - [Status]

### Automated Verification Results

- Build: `make build` - [Pass/Fail]
- Tests: `make test` - [Pass/Fail]
- Lint: `make lint` - [Pass/Fail]

### Code Review Findings

**Matches Plan:**
- [Implementation detail with file:line]

**Deviations from Plan:**
- [Deviation with file:line and explanation]

**Potential Issues:**
- [Issue and impact]

### Manual Testing Required

- [ ] [Test step 1]
- [ ] [Test step 2]

### Recommendations

- [Action item]
```

## Working with Existing Context

If you participated in implementation:
- Review conversation history
- Check todo list for completed items
- Focus on work done in this session
- Be honest about incomplete items

## Validation Checklist

Always verify:
- [ ] All phases marked complete are actually done
- [ ] Automated tests pass
- [ ] Code follows existing patterns
- [ ] No regressions introduced
- [ ] Error handling is robust
- [ ] Documentation updated if needed
- [ ] Manual test steps are clear

## Guidelines

**Be Thorough**: Run all automated checks; don't skip verification commands.

**Document Everything**: Both successes and issues.

**Think Critically**: Question if the implementation truly solves the problem.

**Consider Maintenance**: Will this be maintainable long-term?

## Relationship to Other Skills

Recommended workflow:
1. `implementing-plan` - Execute the implementation
2. `/commit` - Create atomic commits
3. `validating-plan` - Verify implementation correctness

Validation works best after commits are made, enabling git history analysis.
