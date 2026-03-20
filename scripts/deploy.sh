#!/bin/bash
set -e

# Configure these for your setup
VM_HOST="${DEPLOY_HOST:-user@your-server}"
REMOTE="${DEPLOY_REMOTE:-production}"
BRANCH="${DEPLOY_BRANCH:-main}"

echo "=== CriStream Deploy ==="

# 1. Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Uncommitted changes. Commit first."
  git status --short
  exit 1
fi

# 2. Push to VM
echo "Pushing to $REMOTE..."
git push $REMOTE $BRANCH 2>&1

# The post-receive hook on the VM handles:
# - git checkout
# - docker compose build (with layer cache)
# - docker compose up -d
# - health check

echo ""
echo "Deploy triggered. Check your server logs for status."
