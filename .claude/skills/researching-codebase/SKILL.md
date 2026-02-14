---
name: researching-codebase
description: Document codebase as-is with thoughts directory for historical context. Use when (1) exploring how codebase features work, (2) understanding component interactions, (3) creating technical documentation of existing systems. Triggers on requests like "how does the authentication flow work?", "document the API layer", or "research how X component works".
---

# Research Codebase

Conduct comprehensive research across the codebase to answer questions by spawning parallel sub-agents and synthesizing findings.

## CRITICAL: DOCUMENT THE CODEBASE AS IT EXISTS TODAY

- **DO NOT** suggest improvements or changes unless explicitly asked
- **DO NOT** perform root cause analysis unless explicitly asked
- **DO NOT** propose future enhancements unless explicitly asked
- **DO NOT** critique the implementation or identify problems
- **DO NOT** recommend refactoring, optimization, or architectural changes
- **ONLY** describe what exists, where it exists, how it works, and how components interact
- Create a technical map/documentation of the existing system

## Initial Setup

**If NO research query provided:**
```
I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.
```

Then wait for the user's research query.

## Workflow

### Step 1: Read Mentioned Files First

If the user mentions specific files (code, docs, JSON):
- Read them FULLY using the Read tool WITHOUT limit/offset parameters
- **CRITICAL**: Read these files yourself in the main context BEFORE spawning sub-tasks
- This ensures full context before decomposing the research

### Step 2: Analyze and Decompose

- Break down the query into composable research areas
- Consider underlying patterns, connections, and architectural implications
- Create a research plan using TodoWrite to track all subtasks
- Identify relevant directories, files, or architectural patterns

### Step 3: Spawn Parallel Sub-Agents

Create multiple Task agents to research concurrently:

**For codebase research:**
- **codebase-locator**: Find WHERE files and components live
- **codebase-analyzer**: Understand HOW specific code works (without critiquing)
- **codebase-pattern-finder**: Find examples of existing patterns (without evaluating)

**For thoughts directory:**
- **thoughts-locator**: Discover what documents exist about the topic
- **thoughts-analyzer**: Extract insights from specific documents (only most relevant)

**For web research (only if user explicitly asks):**
- **web-search-researcher**: External documentation and resources
- Include links in final report when using web research

**Agent usage guidelines:**
- Start with locator agents to find what exists
- Use analyzer agents on most promising findings
- Run multiple agents in parallel when searching for different things
- Each agent knows its job—just tell it what you're looking for
- Remind agents they are documenting, not evaluating

### Step 4: Wait and Synthesize

**IMPORTANT**: Wait for ALL sub-agent tasks to complete before proceeding.

- Compile all results (codebase and thoughts findings)
- Prioritize live codebase findings as primary source of truth
- Use thoughts/ findings as supplementary historical context
- Connect findings across components
- Include specific file paths and line numbers
- Verify thoughts/ paths are correct (e.g., `thoughts/allison/` not `thoughts/shared/` for personal files)
- Highlight patterns, connections, and architectural decisions
- Answer specific questions with concrete evidence

### Step 5: Generate Research Document

1. **Gather metadata (required)**:
   ```bash
   thoughtcabinet metadata
   ```
   Captures: researcher name, git commit, branch, repository, timestamp
   - **DO NOT** use raw `git` commands for metadata unless `thoughtcabinet metadata` fails.

2. **Determine filename**:
   - Path: `thoughts/shared/research/YYYY-MM-DD-description.md`
   - Description: kebab-case summary of topic
   - Example: `2025-01-08-authentication-flow.md`

3. **Generate document** using template in [research-template.md](research-template.md)
   - **MUST** Read the template and follow the structure exactly.

4. **Sync and present findings**:
   ```bash
   thoughtcabinet sync -m "Research: <topic>"
   ```
   - Present a concise summary of findings to the user
   - Include key file references for easy navigation
   - Ask if they have follow-up questions or need clarification

**Document rules:**
- **Document what IS, not what SHOULD BE**—no recommendations or critiques
- **Frontmatter**: Always include, use snake_case for multi-word fields
- **Code references**: Format as `path/to/file.ext:line` with descriptions

**Follow-up research**:
- If the user has follow-up questions, append to the same research document
- Spawn new sub-agents as needed for additional investigation
- Continue updating the document and syncing

## Important Notes

- Always use parallel Task agents to maximize efficiency
- Always run fresh codebase research—never rely solely on existing documents
- The thoughts/ directory provides historical context to supplement live findings
- Focus on concrete file paths and line numbers for reference
- Research documents should be self-contained
- Each sub-agent prompt should focus on read-only documentation operations
- Document cross-component connections and interactions
- Include temporal context (when research was conducted)
- Keep the main agent focused on synthesis, not deep file reading
- Have sub-agents document examples and usage patterns as they exist
- Explore all of thoughts/ directory, not just research subdirectory

## Critical Ordering

1. **ALWAYS** read mentioned files first before spawning sub-tasks (Step 1)
2. **ALWAYS** wait for all sub-agents to complete before synthesizing (Step 4)
3. **ALWAYS** gather metadata before writing the document (Step 5)
4. **NEVER** write the research document with placeholder values

## Path Handling

- The `thoughts/searchable/` directory contains hard links for searching
- Always use canonical paths when referencing or writing files
  - Use: `thoughts/shared/prs/123.md`
  - Not: `thoughts/searchable/shared/prs/123.md`
