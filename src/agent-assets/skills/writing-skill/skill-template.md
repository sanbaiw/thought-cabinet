# Skill Template

Use this template as a starting point when creating a new skill. Customize sections as needed.

## SKILL.md Template

````markdown
---
name: [kebab-case-name]
description: [Third-person description of what the skill does AND when to use it.]
---

# [Skill Title]

[One-sentence summary of what this skill does.]

## Workflow Context

[How this skill relates to other skills in the ecosystem. Which skills produce inputs for this one? Which skills consume its outputs?]

## Workflow Overview

1. **[Step name]** - [what happens]
2. **[Step name]** - [what happens]
3. **[Step name]** - [what happens]

## Step 1: [Step Name]

[Instructions for this step. Include decision trees, templates, or agent task specifications as needed.]

## Step 2: [Step Name]

[Instructions for this step.]

## Step N: [Step Name]

[Instructions for this step.]

## Guidelines

[Behavioral rules organized under clear headings.]

**[Guideline Category]:**
- [Rule]
- [Rule]
````

## Supplementary File Template

When a skill needs additional files (templates, references, examples):

```text
skill-name/
├── SKILL.md              # Main instructions (loaded when triggered)
├── [template].md         # Output template (loaded as needed)
├── [reference].md        # Reference material (loaded as needed)
└── [examples].md         # Usage examples (loaded as needed)
```

Rules:
- SKILL.md references supplementary files directly (one level deep)
- Each file has a descriptive name indicating its content
- Keep each file focused on a single concern
