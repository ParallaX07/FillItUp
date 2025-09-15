#!/usr/bin/env bash
set -euo pipefail

# Build and optionally sign your Firefox extension using pnpm + web-ext.
# Usage:
#   # build only
#   ./scripts/build_and_sign.sh
#
#   # build and sign (recommended for unlisted signing)
#   WEB_EXT_API_KEY=your_key_here WEB_EXT_API_SECRET=your_secret_here ./scripts/build_and_sign.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Load environment variables from .env if present (do not commit .env)
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env
fi

echo "Building extension with web-ext (pnpm dlx)..."
# Use pnpm dlx so users don't need a global install
pnpm dlx web-ext build --source-dir . --artifacts-dir web-ext-artifacts

echo
echo "Artifacts in: $ROOT_DIR/web-ext-artifacts"
ls -la web-ext-artifacts || true

if [[ -n "${WEB_EXT_API_KEY:-}" && -n "${WEB_EXT_API_SECRET:-}" ]]; then
  echo
  echo "API keys detected — uploading to AMO to request signing (unlisted channel)..."
  pnpm dlx web-ext sign \
    --api-key "$WEB_EXT_API_KEY" \
    --api-secret "$WEB_EXT_API_SECRET" \
    --channel unlisted \
    --source-dir . \
    --artifacts-dir web-ext-artifacts

  echo
  echo "Signed artifacts (or download links) will be available in web-ext-artifacts or via the web-ext output above."
  ls -la web-ext-artifacts || true
else
  echo
  echo "WEB_EXT_API_KEY or WEB_EXT_API_SECRET not set. Skipping signing step."
  echo "Set those env vars to sign via AMO, e.g.:"
  echo "  WEB_EXT_API_KEY=... WEB_EXT_API_SECRET=... ./scripts/build_and_sign.sh"
fi
