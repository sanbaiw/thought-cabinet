# Research Guidance for Plan Iteration

Detailed patterns for spawning research sub-tasks when updating plans.

## When to Research

**Research needed:**
- Adding phases involving unfamiliar code areas
- Validating technical feasibility of proposed changes
- Understanding patterns for new implementation approaches

**Skip research for:**
- Reordering existing phases
- Rewording descriptions
- Adjusting scope without technical implications
- Adding/removing success criteria

## Sub-task Spawning Patterns

### For Code Investigation

**codebase-locator:**
```
Find all files related to [specific feature/area].
Focus on: [specific directories]
Return: file paths with brief descriptions
```

**codebase-analyzer:**
```
Analyze the implementation of [component/feature].
In: [specific file or directory]
Extract: architecture decisions, patterns used, constraints
```

**codebase-pattern-finder:**
```
Find similar implementations to [proposed approach].
Look for: [specific pattern or functionality]
Return: code examples with file:line references
```

### For Historical Context

**thoughts-locator:**
```
Find existing documents about [topic].
In: thoughts/ directory
Return: relevant document paths
```

**thoughts-analyzer:**
```
Extract insights from [document path].
Focus on: [specific aspects relevant to the change]
```

## Best Practices

1. **Spawn multiple tasks in parallel** for efficiency
2. **Be specific about directories** - include full path context
3. **Request file:line references** in all responses
4. **Wait for all tasks** before synthesizing
5. **Verify unexpected results** - spawn follow-up if needed

## Example: Adding Error Handling Phase

```
Spawn in parallel:
1. codebase-locator: "Find error handling patterns in src/"
2. codebase-analyzer: "Analyze current error handling in src/api/"
3. thoughts-locator: "Find any research on error handling"
```

Read identified files, then update plan with verified approach.
