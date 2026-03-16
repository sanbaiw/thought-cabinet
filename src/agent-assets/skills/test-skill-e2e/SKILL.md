---
name: test-skill-e2e
description: End-to-end smoke test a ThoughtCabinet skill by deploying it to a target agent, running the agent non-interactively against a test project, capturing output, and evaluating results. Use when you want to verify a skill works correctly before shipping.
---

# End-to-End Skill Testing

Smoke test a ThoughtCabinet skill by deploying it to a target agent CLI, invoking the agent non-interactively against a real project, capturing all output, and evaluating results.

## Workflow Overview

1. **Gather inputs** - Determine which skill, which agent, and which project to test against
2. **Deploy skills** - Copy all bundled skills into the agent's project-level skill directory
3. **Prepare test environment** - Clean up artifacts from prior runs
4. **Execute agent** - Run the agent CLI non-interactively with the skill prompt
5. **Evaluate results** - Read captured output and generate a pass/fail summary

## Step 1: Gather Inputs

Determine three things from the user or surrounding context:

| Input | Example |
|-------|---------|
| Skill to test | `onboard`, or path like `src/agent-assets/skills/onboard/SKILL.md` |
| Agent CLI | `codex`, `claude` |

Once identified, read the target skill's SKILL.md to understand:
- What the skill does (description, workflow steps)
- What artifacts it creates (files, directories, symlinks)
- What verification checks it performs (look for `[OK]`/`[FAIL]` markers)

```bash
# Example: read the skill under test
cat src/agent-assets/skills/<skill-name>/SKILL.md
```

This understanding is essential for Steps 3 and 5.

## Step 2: Deploy Skills

Copy **all** bundled skills from the ThoughtCabinet source tree into the agent's project-level skill directory. Include all skills (not just the one under test) because skills may reference each other.

Agent skill directory conventions:

| Agent | Directory |
|-------|-----------|
| Codex | `<project>/.codex/skills/<skill-name>/` |
| Claude Code | `<project>/.claude/skills/<skill-name>/` |
| Cline | `<project>/.cline/skills/<skill-name>/` |

```bash
# Example: deploy all skills for Codex
THC_SRC="/path/to/thought-cabinet/src/agent-assets/skills"
PROJECT="/path/to/test-project"
AGENT_SKILLS="$PROJECT/.codex/skills"

for skill_dir in "$THC_SRC"/*/; do
  skill_name=$(basename "$skill_dir")
  mkdir -p "$AGENT_SKILLS/$skill_name"
  cp "$skill_dir"SKILL.md "$AGENT_SKILLS/$skill_name/SKILL.md"
done
```

Verify deployment:

```bash
ls -la "$AGENT_SKILLS"
```

## Step 3: Prepare Test Environment

Clean up artifacts from prior runs so the test starts from a known state. Use the skill's SKILL.md (read in Step 1) to determine what to remove.

Common cleanup actions by skill type:

```bash
cd "$PROJECT"

# For onboard skill
thc destroy --force 2>/dev/null || true
rm -f AGENTS.md
rm -f CLAUDE.md
rm -rf docs/architectural-patterns.md

# For init-agent-memory skill
rm -f AGENTS.md
rm -f CLAUDE.md
rm -rf docs/architectural-patterns.md

# Generic: remove thoughts artifacts
rm -rf thoughts/
```

Verify the starting state is clean:

```bash
echo "=== Pre-test state ==="
[ ! -d thoughts ] && echo "[OK] no thoughts/" || echo "[WARN] thoughts/ still exists"
[ ! -f AGENTS.md ] && echo "[OK] no AGENTS.md" || echo "[WARN] AGENTS.md still exists"
[ ! -f CLAUDE.md ] && echo "[OK] no CLAUDE.md" || echo "[WARN] CLAUDE.md still exists"
```

All checks should show `[OK]` before proceeding.

## Step 4: Execute Agent

Run the agent CLI non-interactively with full permissions, instructing it to invoke the skill. Stream all output to a timestamped log file via `tee`.

### Build the prompt

The prompt should instruct the agent to invoke the target skill:

```
Invoke the <skill-name> skill to <summary of what the skill does>.
```

### Agent invocation patterns

| Agent | Command |
|-------|---------|
| Codex | `codex exec --dangerously-bypass-approvals-and-sandbox "<prompt>"` |
| Claude Code | `claude -p "<prompt>" --dangerously-skip-permissions` |

### Run with output capture

```bash
LOGFILE="test-$(date +%Y%m%d-%H%M%S)-<skill-name>.log"

# Codex example
codex exec --dangerously-bypass-approvals-and-sandbox \
  "Invoke the onboard skill to initialize ThoughtCabinet and bootstrap agent memory." \
  2>&1 | tee "$LOGFILE"

# Claude Code example
claude -p \
  "Invoke the onboard skill to initialize ThoughtCabinet and bootstrap agent memory." \
  --dangerously-skip-permissions \
  2>&1 | tee "$LOGFILE"
```

Wait for the agent to complete. Do not interrupt it.

## Step 5: Evaluate Results

Read the log file end-to-end and assess:

```bash
cat "$LOGFILE"
```

### Evaluation checklist

| Check | What to look for |
|-------|-----------------|
| Skill discovery | Agent found and read the SKILL.md |
| Step execution | Each numbered workflow step was attempted |
| No errors | No stack traces, permission blocks, or sandbox violations |
| Artifact creation | Expected files/directories exist on disk |
| Verification markers | `[OK]` markers in output; no `[FAIL]` markers |

### Verify artifacts on disk

```bash
echo "=== Post-test verification ==="
# Adapt these checks to the skill under test

# For onboard skill
[ -L thoughts/shared ] && echo "[OK] thoughts/shared symlink" || echo "[FAIL] thoughts/shared missing"
[ -L thoughts/global ] && echo "[OK] thoughts/global symlink" || echo "[FAIL] thoughts/global missing"
[ -f AGENTS.md ] && echo "[OK] AGENTS.md exists" || echo "[FAIL] AGENTS.md missing"
[ -e CLAUDE.md ] && echo "[OK] CLAUDE.md exists" || echo "[FAIL] CLAUDE.md missing"
```

### Generate summary

Produce a clear pass/fail report:

```
=== Test Results: <skill-name> ===
Agent: <agent-name>
Project: <project-path>
Log: <logfile-path>

Step 1 (Pre-flight):     PASS
Step 2 (Init thoughts):  PASS
Step 3 (Bootstrap memory): PASS
Step 4 (Verify):         PASS

Overall: PASS (4/4 steps)
Notes: <any observations>
```

If any step failed, include the relevant log excerpt and suggested remediation.

## Guidelines

**Idempotent cleanup**: The prepare step (Step 3) should make the test fully repeatable. Running the test twice in a row should produce the same result.

**Log everything**: Always capture output to a file. Agent output in terminals can scroll away or be lost.

**Read the skill first**: Understanding expected outcomes (Step 1) is essential for meaningful evaluation (Step 5). Do not skip this.

**One skill per run**: Test skills individually for clear signal. If you need to test multiple skills, run this workflow once per skill.

**Adapt checks to the skill**: The cleanup and verification examples above are for the `onboard` skill. For other skills, derive the appropriate checks from the skill's SKILL.md.
