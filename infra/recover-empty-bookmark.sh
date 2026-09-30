#!/usr/bin/env bash
# Human-run local recovery: preserve network data; rebuild only the pinned peer.
set -euo pipefail
base="$HOME/corridorproof-infra"
project=/mnt/c/Users/krish/Documents/Codex/2026-09-30/the-prompt-pack-is-above-drunix/outputs/corridorproof
export PATH="$base/tools/go/bin:$PATH"
export GOMAXPROCS=2 GOMEMLIMIT=512MiB GOGC=50 CGO_ENABLED=0
cd "$base/drunix"
test "$(git rev-parse HEAD)" = ddc0eae778158d3f8a96605cfeda383ae5eafcfc
for name in drunix-empty-bookmark.patch drunix-bookmark-namespace.patch; do
  patch="$project/infra/$name"
  if git apply --check "$patch" 2>/dev/null; then
    git apply "$patch"
  elif git apply --reverse --check "$patch" 2>/dev/null; then
    printf 'Patch is already applied: %s\n' "$name"
  else
    printf 'Source differs from expected patch %s; stopping.\n' "$name" >&2
    exit 1
  fi
done
mkdir -p "$base/logs"
go build -buildvcs=false -ldflags '-X github.com/npci/drunix/common/metadata.Version=1.0.0 -X github.com/npci/drunix/common/metadata.CommitSHA=ddc0eae-bookmark-fix -X github.com/npci/drunix/common/metadata.DockerNamespace=npcioss' -o build/bin/peer-bookmark-fixed ./cmd/peer
sha256sum build/bin/peer-bookmark-fixed | tee "$base/logs/peer-bookmark-fixed.sha256"
# Only these two existing lite peers are changed. No volumes are removed.
for name in lp1.org1 lp1.org2; do
  docker stop --timeout 10 "$name"
  docker cp build/bin/peer-bookmark-fixed "$name:/usr/local/bin/peer"
  docker start "$name"
done
printf 'Patched lite peers restarted. Preserve this script and checksum as evidence.\n'
