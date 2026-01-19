# Research Document Template

## YAML Frontmatter

```yaml
---
date: [ISO 8601 datetime with timezone, e.g., 2025-01-08T14:30:00+08:00]
researcher: [From `thoughtcabinet metadata` output]
git_commit: [Current commit hash from metadata]
branch: [Current branch name from metadata]
repository: [Repository name from metadata]
topic: "[User's Research Question/Topic]"
tags: [research, codebase, relevant-component-names]
status: complete
last_updated: [YYYY-MM-DD format]
last_updated_by: [Researcher name]
---
```

## Document Structure

```markdown
# Research: [User's Question/Topic]

**Date**: [datetime with timezone]
**Researcher**: [name]
**Git Commit**: [hash]
**Branch**: [branch]
**Repository**: [repo]

## Research Question

[Original user query verbatim]

## Summary

[High-level documentation answering the user's question by describing what exists]

## Detailed Findings

### [Component/Area 1]

- Description of what exists ([file.ext:line](path/to/file.ext))
- How it connects to other components
- Current implementation details (without evaluation)

### [Component/Area 2]

...

## Code References

- `path/to/file.py:123` - Description of what's there
- `another/file.ts:45-67` - Description of the code block

## Architecture Documentation

[Current patterns, conventions, and design implementations found]

## Historical Context (from thoughts/)

[Relevant insights from thoughts/ directory with references]

- `thoughts/shared/something.md` - Historical decision about X
- `thoughts/local/notes.md` - Past exploration of Y
  Note: Paths exclude "searchable/" even if found there

## Related Research

[Links to other research documents in thoughts/shared/research/]

## Open Questions

[Areas that need further investigation]
```

## Follow-up Research Section

When adding follow-up research, append:

```markdown
## Follow-up Research [timestamp]

### Follow-up Question

[The follow-up question]

### Additional Findings

[New findings from additional investigation]
```

Also update frontmatter:

- `last_updated`: Current date
- `last_updated_by`: Researcher name
- Add `last_updated_note: "Added follow-up research for [brief description]"`
