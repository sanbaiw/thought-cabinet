---
name: writing-skill
description: Create, revise, or distill workflows into skills following best practices. Use when user asks to create a new skill, iterate on an existing skill, distill a session workflow into a reusable skill, or improve skill quality.
---

# Writing Skills

Create new skills, revise existing ones, or distill workflows into reusable skills. Follow [best practices](best-practices.md) and use [skill-template](skill-template.md).

## Workflow Context

This meta-skill produces skills. Common skill patterns:
- **Complex workflow** — Multiple phases, planning/implementation/validation
- **Research/synthesis** — Discovery, analysis, pattern extraction
- **Simple imperative** — Single task, straightforward execution
- **Integration-focused** — Modifies/enhances other workflows

**Skills are saved to your Thought Cabinet skills directory**:
- `~/.thought-cabinet/skills/` (new)
- `~/.config/thought-cabinet/skills/` (legacy, if config exists there)

## Determine the Mode

Infer from user query:
- "create", "new", "write" → Step 1
- "revise", "update", "fix", "improve", "modify" → Step 2  
- "distill", "extract", "turn into skill" → Step 3

Only ask if ambiguous.

---

## Step 1: Create New Skill

### 1a. Requirements

Only ask what user hasn't provided:
- Task automated/guided
- Trigger contexts (words/situations)
- Inputs needed and outputs produced
- Relation to existing skills

### 1b. Resolve Skills Directory

```bash
# Check for existing config
if [ -f ~/.thought-cabinet/config.json ]; then
  export THC_SKILLS_DIR=~/.thought-cabinet/skills
elif [ -f ~/.config/thought-cabinet/config.json ]; then
  export THC_SKILLS_DIR=~/.config/thought-cabinet/skills
else
  export THC_SKILLS_DIR=~/.thought-cabinet/skills
fi

mkdir -p "$THC_SKILLS_DIR"
```

Save to `$THC_SKILLS_DIR/[skill-name]/`.

### 1c. Research Patterns

Spawn parallel sub-agents to searche for analog skills in skill directories:
- `$THC_SKILLS_DIR`
- agent skill directories, e.g. `~/.claude/skills/` and `.claude/skills/` for Claude Code

**Choose analog** based on characteristics:
- Multi-phase workflow → find complex workflow skills
- Simple imperative → find single-task skills
- Research/synthesis → find discovery/analysis skills
- Integration-focused → find skills that modify/enhance other workflows

### 1d. Design Present

```
**Name**: kebab-case-name
**Description**: Third-person, specific, includes triggers
**Modeled after**: [skill pattern] + rationale
**Save to**: $THC_SKILLS_DIR/[skill-name]

**Workflow**:
1. Step - action
2. Step - action

**Integration**: how it connects

**Files**: SKILL.md, [supplements + rationale]

Confirm before writing?
```

### 1e. Write

1. Create `$THC_SKILLS_DIR/[skill-name]/`
2. Write SKILL.md following template
3. Add supplementary files
4. Verify against analog skill

### 1f. Quality Check

Run the checklist from best-practices.md:
- [ ] Description specific with triggers
- [ ] Under 500 lines
- [ ] Concise (no unnecessary explanations)
- [ ] Consistent terminology
- [ ] One-level references
- [ ] Clear workflow steps
- [ ] Integrates naturally

```
Created: $THC_SKILLS_DIR/[name]/SKILL.md
Key decisions: [rationales]
Quality: [x] passes checklist
```

### 1g. Install Skill

Make the skill available:

```bash
thc skill install --target [agent-name] --force
```

---

## Step 2: Revise Existing Skill

### 2a. Locate Skills Directory

Resolve directory (Step 1b), then list available skills:
```bash
ls -la "$THC_SKILLS_DIR"
```

### 2b. Audit

Read SKILL.md and best-practices.md.

```
**Strengths**: [what works]
**Issues**: [specific problems from checklist]
**Changes**: 1. [change] 2. [change]

Which changes?
```

### 2c. Apply

Make surgical edits to `$THC_SKILLS_DIR/[skill-name]/`. Maintain structure unless changing it.

```
Updated [skill-name]:
- [change 1]
- [change 2]
Quality check passed. Further?
```

---

## Step 3: Distill Session Workflow

### 3a. Extract

```
**Task pattern**: what we did
**Steps**: 1. [step] 2. [step]
**Context needed**: what helps future runs
**Proposed name**: kebab-case-name
Save to: $THC_SKILLS_DIR/[name]/
Create?
```

### 3b. Generalize

Replace specifics with patterns, frameworks. Remove session artifacts.

### 3c. Write

Resolve directory (Step 1b), then follow Step 1e-1g.

---

## Sync to Source (thought-cabinet repo only)

After creating, revising, or distilling a skill, check if you're working inside the `thought-cabinet` repository:

```bash
# Check if src/agent-assets/skills/ exists in the repo root
if [ -d "$(git rev-parse --show-toplevel 2>/dev/null)/src/agent-assets/skills" ]; then
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  # Copy the skill directory into the bundled assets
  cp -r "$THC_SKILLS_DIR/[skill-name]" "$REPO_ROOT/src/agent-assets/skills/[skill-name]"
fi
```

This ensures new or updated skills are tracked in `src/agent-assets/skills/` for packaging and distribution. The copy goes into the repo's working tree — it is NOT committed automatically.

---

## Guidelines

**Conciseness**: Challenge every paragraph — does it justify its token cost?

**Integration**: Reference related skills in Workflow Context. Match tone/structure to analog.

**Iterate**: Ship minimal working skill, refine from usage.

**Config Compatibility**: Check `~/.thought-cabinet/` (new) and `~/.config/thought-cabinet/` (legacy). Use existing location; default to new.
