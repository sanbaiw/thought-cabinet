---
name: test-driven-development
description: Write tests before implementation code using red-green-refactor. Use when implementing features, fixing bugs, or when the user mentions TDD, test-first, or test-driven.
---

# Test-Driven Development

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

## Workflow Context

This skill integrates with the plan-based workflow:

- `implementing-plan` executes phases that include success criteria with test commands
- **test-driven-development** (this skill) governs **how** code within each phase gets written: test-first

When implementing a plan phase, apply TDD to each unit of work within that phase. The phase's automated verification commands are the final check, not a substitute for test-first development.

## Workflow Overview

1. **Discover test infrastructure** - Find test runner, patterns, conventions
2. **RED** - Write one failing test
3. **Verify RED** - Run it, confirm correct failure
4. **GREEN** - Write minimal code to pass
5. **Verify GREEN** - Run it, confirm all tests pass
6. **REFACTOR** - Clean up, keep tests green
7. **Repeat** - Next behavior, next failing test

## Step 1: Discover Test Infrastructure

Before writing any test, research the project's testing setup:

```
Tasks to spawn concurrently:
- codebase-locator: Find test files near the code being changed
- codebase-pattern-finder: Find test patterns (describe/it, test runner config, assertion style)
```

Identify:
- Test runner and command (e.g. `npm test`, `pytest`, `make test`)
- File naming convention (e.g. `*.test.ts`, `*_test.go`, `test_*.py`)
- Assertion style and test structure used in existing tests
- Any test utilities or fixtures in the project

Follow existing conventions exactly. Do not introduce new test libraries or patterns unless user explicitly asks for it.

## Step 2: RED - Write Failing Test

Write one minimal test for one behavior.

<Good>
```typescript
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
```
Clear name describing behavior, tests one thing, uses real code.
</Good>

<Bad>
```typescript
test('works', async () => {
  const mock = jest.fn().mockResolvedValueOnce('ok');
  await submitForm(mock);
  expect(mock).toHaveBeenCalledTimes(1);
});
```
Vague name, tests mock not behavior.
</Bad>

**Requirements:**
- One behavior per test
- Name describes the expected behavior
- Use real code paths (mocks only when unavoidable — external APIs, databases)

## Step 3: Verify RED - Watch It Fail

**MANDATORY. Never skip.**

Run the test and confirm:
- Test **fails** (not errors from syntax/import issues)
- Failure message matches what you expect
- Fails because the feature is missing, not because of a typo

**Test passes immediately?** You're testing existing behavior. Rewrite the test.

**Test errors instead of failing?** Fix the error first, re-run until it fails correctly.

## Step 4: GREEN - Minimal Code

Write the simplest code that makes the test pass.

<Good>
```typescript
async function retryOperation<T>(fn: () => T | Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try { return await fn(); }
    catch (e) { if (i === 2) throw e; }
  }
  throw new Error('unreachable');
}
```
Just enough to pass.
</Good>

<Bad>
```typescript
async function retryOperation<T>(
  fn: () => T | Promise<T>,
  options?: { maxRetries?: number; backoff?: 'linear' | 'exponential'; onRetry?: (n: number) => void }
): Promise<T> { /* ... */ }
```
Over-engineered beyond what the test requires.
</Bad>

Do not add features, refactor surrounding code, or "improve" beyond the test.

## Step 5: Verify GREEN - Watch It Pass

**MANDATORY.**

Run the test and confirm:
- The new test passes
- All existing tests still pass
- No errors or warnings in output

**New test fails?** Fix the implementation, not the test.

**Other tests break?** Fix them now before proceeding.

## Step 6: REFACTOR - Clean Up

Only after green:
- Remove duplication
- Improve names
- Extract helpers if warranted

Run tests after each refactoring change. Stay green throughout.

Do not add new behavior during refactoring.

## Step 7: Repeat

Return to Step 2 for the next behavior. Each cycle adds one tested behavior.

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Wrote code before the test? Delete it. Start over from Step 2.

- Do not keep it as "reference"
- Do not "adapt" it while writing tests
- Delete means delete

## Good Tests

| Quality | Good | Bad |
|---------|------|-----|
| **Minimal** | One behavior | `test('validates email and domain and length')` |
| **Clear** | Name describes expected behavior | `test('test1')` |
| **Real** | Tests actual code paths | Tests mock return values |
| **Focused** | Asserts on outcome | Asserts on internal implementation |

## Red Flags - STOP and Start Over

- Wrote production code before a test
- Test passes immediately on first run
- Can't explain why the test failed
- Rationalizing "just this once"
- "I already manually tested it"
- Keeping pre-written code as "reference"

All of these mean: delete the code, start over with a failing test.

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write the API you wish existed. Write the assertion first. Ask the user. |
| Test too complicated | Design too complicated. Simplify the interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup huge | Extract helpers. Still complex? Simplify design. |

## Integration with Plan Phases

When working within a plan phase:

1. Read the phase's success criteria
2. For each unit of work in the phase, apply the RED-GREEN-REFACTOR cycle
3. After all units are complete, run the phase's automated verification commands
4. Follow `implementing-plan`'s Phase Completion Checklist: update checkboxes, present the verification message, wait for user confirmation

The phase's automated verification is the final gate. TDD cycles happen within that gate, not instead of it.

**When the plan says tests aren't needed**: Evaluate independently — apply TDD unless genuinely untestable (pure wiring, no behavioral logic). Document any skip with a reason in the phase completion message.
