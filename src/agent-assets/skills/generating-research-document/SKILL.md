---
name: generating-research-document
description: Generate structured research documentation. Use when (1) creating research documents after codebase exploration, (2) documenting findings from code analysis, (3) writing technical research reports to thoughts/shared/research/. Triggers on requests like "how does the authentication flow work?"
---

# Generate Research Document

Generate research documentation for the thoughts/ directory with proper metadata and structure.

## Workflow

1. **Gather metadata**

   ```bash
   thoughtcabinet metadata
   ```

   Captures: researcher name, git commit, branch, repository, timestamp

2. **Determine filename**
   - Path: `thoughts/shared/research/YYYY-MM-DD-description.md`
   - Description: kebab-case summary of topic
   - Example: `2025-01-08-authentication-flow.md`

3. **Generate document**
   - Use template from [document_template.md](document_template.md)
   - Fill metadata from step 1
   - Structure findings into appropriate sections
   - Include file:line references for all code mentions

4. **Sync**
   ```bash
   thoughtcabinet sync -m <message>
   ```

## Key Rules

- **Document what IS, not what SHOULD BE** - no recommendations or critiques
- **Path handling**: Remove only "searchable/" from thoughts paths (e.g., `thoughts/searchable/allison/` → `thoughts/allison/`)
- **Frontmatter**: Always include, use snake_case for multi-word fields
- **Code references**: Format as `path/to/file.ext:line` with descriptions
