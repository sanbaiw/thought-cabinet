---
name: navigate-thoughts
description: Resolves thoughts/ paths and navigates thought documents. Use when user references a thoughts/ path, asks to find/read/list thoughts documents, or encounters symlinks in the thoughts directory.
---

# Navigating Thoughts

Resolve thoughts paths to canonical form and locate documents in the local thoughts directory.

## Background

`thoughts/` is a symlink-based directory managed by ThoughtCabinet. It points into a central thoughts git repo but is accessed locally via relative paths from the project root.

**Directory structure:**
- `thoughts/{user}/` — Personal repo-specific notes
- `thoughts/shared/` — Team-shared repo-specific notes (plans, research, PRs)
- `thoughts/global/` — Cross-repository notes
- `thoughts/searchable/` — Hard links for search tools (NOT canonical, never reference)

**Common subdirectories under `shared/`:**
- `shared/plans/` — Implementation plans (`YYYY-MM-DD-description.md`)
- `shared/research/` — Research documents (`YYYY-MM-DD-description.md`)

## Workflow

1. **Normalize path**
   - Strip `searchable/` segment: `thoughts/searchable/shared/plans/foo.md` → `thoughts/shared/plans/foo.md`
   - Ensure `thoughts/` prefix (add if user gives bare path like `shared/plans/foo.md`)
   - If user gives a description instead of a path, proceed to search

2. **Locate document**
   - Exact path given: read it directly
   - Partial/fuzzy: `ls` the likely directory, then match by name or grep for content
   - No path given: `ls -lt thoughts/shared/ thoughts/{user}/ | head -20` to show recent documents

3. **Present**
   - Read and present the document content
   - If the path was non-canonical (e.g. contained `searchable/`), note the canonical path

## Rules

- **NEVER reference `thoughts/searchable/` paths** in output — always use canonical paths
- **All paths are relative** to the project root (e.g. `thoughts/shared/plans/...`, never absolute)
- If `thoughts/` doesn't exist, tell the user to run `thc thoughts init`
- When listing, prefer `ls -lt` (recent first) for discoverability
