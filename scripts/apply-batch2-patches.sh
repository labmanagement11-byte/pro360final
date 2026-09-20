#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ ! -f scripts/patches/batch2-Dashboard.patch ]]; then
  python3 scripts/unpack-batch2-patches.py
fi
# ensure service patch exists (may already be on branch)
for p in \
  scripts/patches/batch2-Dashboard.patch \
  scripts/patches/batch2-Users.patch \
  scripts/patches/batch2-admin-users.patch \
  scripts/patches/batch2-service.patch
do
  echo "Applying $p"
  git apply --whitespace=nowarn "$p" || git apply --3way --whitespace=nowarn "$p"
done
echo "All batch2 patches applied"
