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

Produce the report inline in your response using this structure:

```markdown
## Validation Report: [Plan Name]

### Implementation Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | [Name] | [完成 / 部分完成 / 未完成] |
| Phase 2 | [Name] | [完成 / 部分完成 / 未完成] |

### Automated Verification Results

| 检查项 | 结果 | 说明 |
|---|---|---|
| `[build command]` | **Pass/Fail** | [detail] |
| `[test command]` | **Pass/Fail** | [detail] |
| `[lint command]` | **Pass/Fail** | [detail] |

### Code Review Findings

**符合计划：**
- [Implementation detail with file:line]

**偏差（Deviations from Plan）：**
- [Deviation with file:line and explanation]

**潜在问题（Potential Issues）：**
- [Issue and impact]

### Manual Testing Required

- [ ] [Test step 1]
- [ ] [Test step 2]

### Recommendations

- [Action item]
```

### Step 4: Append Validation Report to Plan File

After presenting the report, **always** append it to the corresponding plan file so the validation is persisted for future reference.

1. Locate the plan file (same file validated in Step 1)
2. Get the current git user name:
```bash
git config user.name
```
3. Append the following section at the **end** of the plan file:

```markdown
---

## Validation Report

> 验证日期：YYYY-MM-DD | 验证人：[output of `git config user.name`]

### Implementation Status
[same content as the inline report above]

### Automated Verification Results
[same content as the inline report above]

### Code Review Findings
[same content as the inline report above]

### Manual Testing Required
[same content as the inline report above]

### Recommendations
[same content as the inline report above]
```

3. After appending, sync the thoughts directory:
```bash
thoughtcabinet sync -m "Validation report: <plan-name>"
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
