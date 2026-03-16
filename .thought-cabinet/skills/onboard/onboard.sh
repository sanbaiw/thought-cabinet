#!/usr/bin/env bash
set -euo pipefail

# onboard.sh — Pre-flight checks, thoughts init, and verification for the onboard skill.
#
# Usage: bash onboard.sh [--force] [--verify-only]
#   --force        Re-initialize thoughts even if already set up
#   --verify-only  Skip init, only run verification
#
# Exit codes:
#   0  Success (init completed or already set up)
#   1  Fatal error (not a git repo, thc missing, init failed)
#   2  Thoughts already initialized, AGENTS.md not found (agent memory needed)
#   3  Thoughts already initialized, AGENTS.md exists (fully onboarded)

FORCE=false
VERIFY_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    --verify-only) VERIFY_ONLY=true ;;
  esac
done

# --- Helpers ---

resolve_thc() {
  if command -v thc > /dev/null 2>&1; then
    echo "thc"
  elif command -v thoughtcabinet > /dev/null 2>&1; then
    echo "thoughtcabinet"
  else
    echo ""
  fi
}

check_status() {
  [ -L thoughts/shared ] && THOUGHTS=true || THOUGHTS=false
  [ -f AGENTS.md ] && MEMORY=true || MEMORY=false

  echo "thoughts: $([ "$THOUGHTS" = true ] && echo initialized || echo 'not initialized')"
  echo "memory: $([ "$MEMORY" = true ] && echo exists || echo 'not found')"
}

verify() {
  echo "=== Onboarding Status ==="
  local issues=0

  if [ -L thoughts/shared ] && [ -L thoughts/global ]; then
    echo "[OK] thoughts/ initialized"
  else
    echo "[FAIL] thoughts/ not initialized"
    issues=$((issues + 1))
  fi

  [ -f AGENTS.md ] && echo "[OK] AGENTS.md created" || echo "[SKIP] AGENTS.md not created"

  if [ -L CLAUDE.md ]; then echo "[OK] CLAUDE.md symlink"
  elif [ -f CLAUDE.md ]; then echo "[OK] CLAUDE.md exists"
  else echo "[SKIP] CLAUDE.md not created"; fi

  local git_dir
  git_dir=$(git rev-parse --git-common-dir 2>/dev/null)
  [ -f "$git_dir/hooks/pre-commit" ] && echo "[OK] pre-commit hook" || echo "[WARN] no pre-commit hook"
  [ -f "$git_dir/hooks/post-commit" ] && echo "[OK] post-commit hook" || echo "[WARN] no post-commit hook"

  echo "=== Done ==="
  return "$issues"
}

# --- Main ---

# Pre-flight: git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "FATAL: Not a git repository. Run 'git init' first."
  exit 1
fi

# Pre-flight: thc availability
THC_CMD=$(resolve_thc)
if [ -z "$THC_CMD" ]; then
  echo "FATAL: thc is not installed or not in PATH."
  exit 1
fi

# Verify-only mode
if [ "$VERIFY_ONLY" = true ]; then
  verify
  exit $?
fi

# Status check
check_status

# Initialize thoughts
if [ "$THOUGHTS" = true ] && [ "$FORCE" = false ]; then
  echo "SKIP: thoughts/ already initialized."
  if [ "$MEMORY" = true ]; then
    exit 3
  else
    exit 2
  fi
fi

INIT_FLAGS="--directory $(basename "$(pwd)")"
[ "$FORCE" = true ] && INIT_FLAGS="$INIT_FLAGS --force"
$THC_CMD init $INIT_FLAGS

# Verify init succeeded
if [ -L thoughts/shared ] && [ -L thoughts/global ]; then
  echo "OK: thoughts/ initialized."
else
  echo "FATAL: thoughts/ init failed — symlinks not created."
  exit 1
fi

# Return based on memory status
[ -f AGENTS.md ] && exit 3 || exit 2
