#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
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
