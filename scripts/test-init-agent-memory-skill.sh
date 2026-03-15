#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SKILL_SOURCE_DIR="${REPO_ROOT}/src/agent-assets/skills/init-agent-memory"

CODEX_BIN="${CODEX_BIN:-}"
KEEP_TMP="${KEEP_TMP:-0}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-900}"

TEMP_DIR=""
TEST_REPO=""

usage() {
  cat <<'EOF'
Usage: scripts/test-init-agent-memory-skill.sh [options]

Creates a temporary repository, runs the init-agent-memory skill workflow via Codex,
and validates generated outputs.

Options:
  --codex-bin <path>   Path to Codex CLI binary. Defaults to `codex` in PATH.
  --keep-tmp           Do not delete temporary repository after test run.
  --timeout <seconds>  Max seconds to allow codex execution (default: 900).
  -h, --help           Show this help.

Environment variables:
  CODEX_BIN            Same as --codex-bin.
  KEEP_TMP             Set to 1 to preserve temporary files.
  TIMEOUT_SECONDS      Same as --timeout.
EOF
}

log() {
  printf '[init-agent-memory-test] %s\n' "$*"
}

fail() {
  printf '[init-agent-memory-test] ERROR: %s\n' "$*" >&2
  if [[ -n "${TEST_REPO}" ]]; then
    printf '[init-agent-memory-test] Temporary repo: %s\n' "${TEST_REPO}" >&2
  fi
  exit 1
}

cleanup() {
  if [[ "${KEEP_TMP}" == "1" ]]; then
    if [[ -n "${TEST_REPO}" ]]; then
      log "Keeping temporary repo at ${TEST_REPO}"
    fi
    return
  fi

  if [[ -n "${TEMP_DIR}" && -d "${TEMP_DIR}" ]]; then
    rm -rf "${TEMP_DIR}"
  fi
}

resolve_path() {
  if command -v realpath >/dev/null 2>&1; then
    realpath "$1"
    return
  fi

  readlink -f "$1"
}

assert_file_exists() {
  local file_path="$1"
  [[ -f "${file_path}" ]] || fail "Expected file does not exist: ${file_path}"
}

assert_contains_regex() {
  local file_path="$1"
  local regex="$2"
  local label="$3"
  grep -Eiq "${regex}" "${file_path}" || fail "Missing required content (${label}) in ${file_path}"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --codex-bin)
      [[ $# -ge 2 ]] || fail "--codex-bin requires a value"
      CODEX_BIN="$2"
      shift 2
      ;;
    --keep-tmp)
      KEEP_TMP=1
      shift
      ;;
    --timeout)
      [[ $# -ge 2 ]] || fail "--timeout requires a value"
      TIMEOUT_SECONDS="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

if [[ -z "${CODEX_BIN}" ]]; then
  if command -v codex >/dev/null 2>&1; then
    CODEX_BIN="$(command -v codex)"
  else
    fail "Codex CLI not found. Set CODEX_BIN or pass --codex-bin <path>."
  fi
fi

if [[ ! -x "${CODEX_BIN}" ]]; then
  fail "Codex binary is not executable: ${CODEX_BIN}"
fi

if [[ ! -f "${SKILL_SOURCE_DIR}/SKILL.md" ]]; then
  fail "Skill source is missing: ${SKILL_SOURCE_DIR}"
fi

trap cleanup EXIT

TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/init-agent-memory-test.XXXXXX")"
TEST_REPO="${TEMP_DIR}/sample-project"
mkdir -p "${TEST_REPO}/src/services" "${TEST_REPO}/src/lib"

log "Creating temporary test repository at ${TEST_REPO}"

cat >"${TEST_REPO}/package.json" <<'EOF'
{
  "name": "memory-skill-test-project",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "lint": "eslint .",
    "start": "node dist/index.js"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.1.0",
    "eslint": "^9.0.0"
  }
}
EOF

cat >"${TEST_REPO}/README.md" <<'EOF'
# Memory Skill Test Project

This repository simulates a small TypeScript CLI service so the init-agent-memory
workflow can generate realistic memory documentation from real project evidence.

## Goals

- Provide a practical repository layout with source modules and shared utilities.
- Expose build, test, and lint commands in package metadata.
- Include repeated architectural patterns (service + repository boundaries).
EOF

cat >"${TEST_REPO}/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true
  },
  "include": ["src/**/*.ts"]
}
EOF

cat >"${TEST_REPO}/src/lib/logger.ts" <<'EOF'
export function logInfo(message: string): void {
  console.log(`[info] ${message}`)
}

export function logError(message: string): void {
  console.error(`[error] ${message}`)
}
EOF

cat >"${TEST_REPO}/src/services/userService.ts" <<'EOF'
import { logError, logInfo } from '../lib/logger.js'

export type User = { id: string; name: string }

export class UserService {
  private readonly users = new Map<string, User>()

  addUser(user: User): void {
    this.users.set(user.id, user)
    logInfo(`user created: ${user.id}`)
  }

  getUser(id: string): User | undefined {
    const result = this.users.get(id)
    if (!result) {
      logError(`user missing: ${id}`)
    }
    return result
  }
}
EOF

cat >"${TEST_REPO}/src/services/taskService.ts" <<'EOF'
import { logError, logInfo } from '../lib/logger.js'
import { UserService } from './userService.js'

export type Task = { id: string; assigneeId: string; title: string }

export class TaskService {
  private readonly tasks = new Map<string, Task>()

  constructor(private readonly users: UserService) {}

  addTask(task: Task): void {
    if (!this.users.getUser(task.assigneeId)) {
      logError(`cannot assign task ${task.id} to unknown user ${task.assigneeId}`)
      return
    }

    this.tasks.set(task.id, task)
    logInfo(`task created: ${task.id}`)
  }
}
EOF

cat >"${TEST_REPO}/src/index.ts" <<'EOF'
import { TaskService } from './services/taskService.js'
import { UserService } from './services/userService.js'

const users = new UserService()
users.addUser({ id: 'u-1', name: 'Ada' })

const tasks = new TaskService(users)
tasks.addTask({ id: 't-1', assigneeId: 'u-1', title: 'Draft docs' })
EOF

cat >"${TEST_REPO}/init_agent_memory.md" <<'EOF'
Analyze this codebase and create AGENTS.md with these rules:

1. Keep AGENTS.md under 150 lines.
2. Include sections: Project Overview, Tech Stack, Key Directories, Essential Commands, Additional Documentation.
3. Use file:line references instead of code snippets.
4. Do not include generic formatting or style guidance.
5. Create docs/architectural_patterns.md with repeated patterns backed by evidence.
6. Create CLAUDE.md as a symlink to AGENTS.md.
EOF

mkdir -p "${TEST_REPO}/.codex/skills"
cp -R "${SKILL_SOURCE_DIR}" "${TEST_REPO}/.codex/skills/init-agent-memory"

git -C "${TEST_REPO}" init -q
git -C "${TEST_REPO}" config user.email test@example.com
git -C "${TEST_REPO}" config user.name "Skill Test"
git -C "${TEST_REPO}" add .
git -C "${TEST_REPO}" commit -qm "seed test repository"

log "Running init-agent-memory workflow via Codex"

PROMPT_FILE="${TEMP_DIR}/prompt.txt"
cat >"${PROMPT_FILE}" <<'EOF'
Use the init-agent-memory skill from .codex/skills/init-agent-memory to initialize this repository.

Requirements:
- Treat this prompt as approval for the structure proposal step.
- Produce AGENTS.md as the canonical memory file.
- Create CLAUDE.md as a symlink to AGENTS.md.
- Create docs/architectural_patterns.md.
- Keep AGENTS.md concise and under 150 lines.
- Use file:line references and avoid code snippets.
- Avoid generic formatting or style guidance.
EOF

CODEX_LAST_MESSAGE_FILE="${TEMP_DIR}/codex-last-message.txt"

run_codex() {
  if command -v timeout >/dev/null 2>&1; then
    timeout "${TIMEOUT_SECONDS}" "${CODEX_BIN}" exec \
      --cd "${TEST_REPO}" \
      --skip-git-repo-check \
      --sandbox workspace-write \
      --color never \
      --output-last-message "${CODEX_LAST_MESSAGE_FILE}" \
      - <"${PROMPT_FILE}"
    return
  fi

  "${CODEX_BIN}" exec \
    --cd "${TEST_REPO}" \
    --skip-git-repo-check \
    --sandbox workspace-write \
    --color never \
    --output-last-message "${CODEX_LAST_MESSAGE_FILE}" \
    - <"${PROMPT_FILE}"
}

if ! run_codex; then
  fail "Codex execution failed. Check authentication and CLI availability."
fi

AGENTS_FILE="${TEST_REPO}/AGENTS.md"
CLAUDE_FILE="${TEST_REPO}/CLAUDE.md"
ARCH_PATTERNS_FILE="${TEST_REPO}/docs/architectural_patterns.md"

log "Validating generated outputs"

assert_file_exists "${AGENTS_FILE}"

agents_lines="$(wc -l <"${AGENTS_FILE}" | tr -d '[:space:]')"
if [[ "${agents_lines}" -ge 150 ]]; then
  fail "AGENTS.md must be under 150 lines but found ${agents_lines}"
fi

[[ -L "${CLAUDE_FILE}" ]] || fail "CLAUDE.md exists but is not a symlink"
resolved_claude_target="$(resolve_path "${CLAUDE_FILE}")"
resolved_agents="$(resolve_path "${AGENTS_FILE}")"
[[ "${resolved_claude_target}" == "${resolved_agents}" ]] || fail "CLAUDE.md symlink does not resolve to AGENTS.md"

assert_file_exists "${ARCH_PATTERNS_FILE}"

section_specs=(
  "Project Overview:::Project[[:space:]]+Overview"
  "Tech Stack:::Tech[[:space:]]+Stack"
  "Key Directories:::Key[[:space:]]+Directories"
  "Essential Commands:::Essential([[:space:]]+Build/Test)?[[:space:]]+Commands"
  "Additional Documentation:::Additional[[:space:]]+Documentation"
)

for spec in "${section_specs[@]}"; do
  section_name="${spec%%:::*}"
  section_pattern="${spec#*:::}"
  assert_contains_regex "${AGENTS_FILE}" "${section_pattern}" "section: ${section_name}"
done

reference_count="$(grep -Eo '([A-Za-z0-9._-]+/)*[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+:[0-9]+' "${AGENTS_FILE}" | wc -l | tr -d '[:space:]')"
if [[ "${reference_count}" -lt 3 ]]; then
  fail "Expected AGENTS.md to contain multiple file:line references; found ${reference_count}"
fi

if grep -q '```' "${AGENTS_FILE}"; then
  fail "AGENTS.md contains fenced code snippets"
fi

if ! grep -Eq 'docs/architectural_patterns\.md' "${AGENTS_FILE}"; then
  fail "AGENTS.md does not reference docs/architectural_patterns.md in Additional Documentation"
fi

if grep -Eiq '^[[:space:]]*#+[[:space:]]*(Formatting|Style Guide|Code Style)\b' "${AGENTS_FILE}"; then
  fail "AGENTS.md contains a generic formatting/style section"
fi

if grep -Eiq '(use single quotes|use double quotes|2-space indentation|4-space indentation|trailing commas|semicolon|line length limit|max line length)' "${AGENTS_FILE}"; then
  fail "AGENTS.md includes generic formatting/style guidance"
fi

log "PASS: init-agent-memory skill produced compliant outputs"
log "Validated repository: ${TEST_REPO}"

