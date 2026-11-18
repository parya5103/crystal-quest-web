#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="$ROOT/third_party/cocos2d-x"
REV="7a5282a301a13e467bdcc3466d3cd3883862aadf"
mkdir -p "$ROOT/third_party"
if [ ! -d "$ENGINE/.git" ]; then git clone https://github.com/cocos2d/cocos2d-x.git "$ENGINE"; fi
git -C "$ENGINE" fetch --depth 1 origin "$REV"
git -C "$ENGINE" checkout --detach "$REV"
git -C "$ENGINE" submodule update --init --recursive
