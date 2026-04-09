#!/usr/bin/env bash
#
# Enforce the per-file LOC ceiling declared in CLAUDE.md.
#
#   - Any new .ts file under src/ or tests/ must stay under MAX_LOC.
#   - Files already over MAX_LOC are listed in BASELINE below with their
#     current size. They must not grow past that size. When a baselined
#     file is refactored under MAX_LOC, delete its entry.
#   - .d.ts files are excluded (generated, not human-written).
#
# If a file is over its cap, the fix is to split it into sibling
# modules along a cluster boundary. Do not bump the cap. Do not add
# entries to BASELINE without owner sign-off and a linked ticket.
#
# Intent: the baseline shrinks to zero over time. Each entry is a
# promise to refactor.

set -euo pipefail

MAX_LOC=700

# Pre-existing over-limit files. Format: "LOC<tab>path". The cap for
# each entry is its current LOC — growth fails the gate. Shrink to
# zero over time by refactoring one file per PR.
BASELINE=$(cat <<'EOF'
1316	src/cli/commands/search.ts
967	src/embeddings/provider-errors.test.ts
947	src/embeddings/embedding-namespace.ts
855	src/index/indexer.ts
845	src/search/searcher.ts
841	src/errors/errors.test.ts
823	src/embeddings/vector-store.ts
713	src/cli/help.ts
EOF
)

lookup_baseline_cap() {
  local file="$1"
  while IFS=$'\t' read -r loc path; do
    if [[ -n "${loc:-}" && "$path" == "$file" ]]; then
      echo "$loc"
      return 0
    fi
  done <<< "$BASELINE"
  return 1
}

fail=0
violations=()

while IFS= read -r -d '' file; do
  loc=$(wc -l < "$file" | tr -d '[:space:]')

  # New files cap at MAX_LOC. Baselined files cap at their recorded LOC.
  if baseline_cap=$(lookup_baseline_cap "$file"); then
    if (( loc > baseline_cap )); then
      violations+=("$(printf '%4d > %d  %s (baselined — refactor instead of growing)' "$loc" "$baseline_cap" "$file")")
      fail=1
    fi
  elif (( loc > MAX_LOC )); then
    violations+=("$(printf '%4d > %d  %s' "$loc" "$MAX_LOC" "$file")")
    fail=1
  fi
done < <(find src tests -type f -name '*.ts' ! -name '*.d.ts' -print0)

if (( fail == 1 )); then
  echo "LOC limit violation:" >&2
  printf '  %s\n' "${violations[@]}" >&2
  echo "" >&2
  echo "Split the offending files along a cluster boundary." >&2
  echo "See CLAUDE.md 'Refactoring threshold'." >&2
  exit 1
fi

echo "loc-limit: ok (max ${MAX_LOC} LOC for new files, baseline enforced for pre-existing)"
