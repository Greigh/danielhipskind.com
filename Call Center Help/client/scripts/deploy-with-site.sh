#!/usr/bin/env bash
# Deploy Adamas together with danielhipskind.com — always.
# Usage (from Adamas checkout): npm run deploy
# Optional env:
#   SITE_ROOT=/path/to/danielhipskind.com
#   DEPLOY_SKIP_PULL=1     skip git pull on both repos
#   DEPLOY_SKIP_TESTS=1    skip npm test before deploy

set -euo pipefail

ADAMAS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_site_root() {
  if [ -n "${SITE_ROOT:-}" ] && [ -f "${SITE_ROOT}/deploy.sh" ]; then
    echo "$SITE_ROOT"
    return 0
  fi
  # Sibling checkouts (common local layout)
  for candidate in \
    "$ADAMAS_ROOT/../danielhipskind.com" \
    "$ADAMAS_ROOT/../../danielhipskind.com" \
    "$HOME/danielhipskind.com" \
    "$HOME/Projects/danielhipskind.com" \
    "$HOME/Developer/danielhipskind.com"; do
    if [ -f "$candidate/deploy.sh" ]; then
      echo "$(cd "$candidate" && pwd)"
      return 0
    fi
  done
  # Nested layout: Adamas living inside Call Center Help/client
  if [ -f "$ADAMAS_ROOT/../../deploy.sh" ]; then
    echo "$(cd "$ADAMAS_ROOT/../.." && pwd)"
    return 0
  fi
  return 1
}

echo "🚀 Unified deploy: Adamas + danielhipskind.com"

SITE="$(resolve_site_root)" || {
  echo "❌ Could not find danielhipskind.com (deploy.sh)."
  echo "   Clone it next to Adamas, or set SITE_ROOT=/path/to/danielhipskind.com"
  exit 1
}

echo "📁 Adamas: $ADAMAS_ROOT"
echo "📁 Site:   $SITE"

if [ "${DEPLOY_SKIP_PULL:-0}" != "1" ]; then
  echo "⬇️  Pulling latest for both repos..."
  if [ -d "$ADAMAS_ROOT/.git" ]; then
    git -C "$ADAMAS_ROOT" pull --ff-only || {
      echo "⚠️  Adamas git pull failed (continuing with local tree)"
    }
  fi
  if [ -d "$SITE/.git" ]; then
    git -C "$SITE" pull --ff-only || {
      echo "⚠️  Site git pull failed (continuing with local tree)"
    }
  fi
else
  echo "⏭️  Skipping git pull (DEPLOY_SKIP_PULL=1)"
fi

if [ "${DEPLOY_SKIP_TESTS:-0}" != "1" ]; then
  echo "🧪 Running Adamas tests before deploy..."
  (cd "$ADAMAS_ROOT" && npm test) || {
    echo "❌ Tests failed — refusing to deploy"
    exit 1
  }
else
  echo "⏭️  Skipping tests (DEPLOY_SKIP_TESTS=1)"
fi

export ADAMS_SRC="$ADAMAS_ROOT"
export REQUIRE_ADAMAS_SRC=1
# Tests already ran above — don't run them twice inside deploy.sh
export DEPLOY_SKIP_TESTS=1
echo "🏗️  Invoking site deploy.sh with ADAMS_SRC=$ADAMS_SRC"
exec bash "$SITE/deploy.sh" "$@"
