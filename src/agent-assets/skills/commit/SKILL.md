---
name: commit
description: Creates git commits for session changes with clear, descriptive messages. Use when the user asks to commit changes, or when wrapping up a coding session and changes need to be committed.
---

# Committing Changes

Create git commits for changes made during the current session.

## Workflow

1. **Assess changes**
   - Review conversation history to understand what was accomplished
   - Run `git status` and `git diff` to see current changes
   - Decide: one commit or multiple logical commits?

2. **Plan commits**
   - Group related files together
   - Draft commit messages in imperative mood ("Add feature" not "Added feature")
   - Focus on *why* changes were made, not just *what*

3. **Execute**
   - `git add` with specific files (NEVER use `-A` or `.`)
   - `git commit -m "<message>"`
   - Repeat for each logical commit

4. **Verify**
   - `git log --oneline -n <number>` to show results

## Rules

- **NEVER commit `thoughts/` or anything inside it**
- **NEVER commit dummy files, test scripts, or artifacts** not part of the actual changes
- **NEVER add co-author information or Claude attribution**
- Keep commits focused and atomic
- Use your judgment on grouping - the user trusts you to commit
