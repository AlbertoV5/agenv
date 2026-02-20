#!/bin/bash
# Release a patch version of @agenv/workstreams
# Usage: ./scripts/release-workstreams-patch.sh

set -e

cd "$(dirname "$0")/../packages/workstreams"

echo "📦 Releasing @agenv/workstreams patch version..."

# Bump version and create git tag
VERSION=$(bun pm version patch --no-git-tag-version | tail -1)
VERSION=${VERSION#v}
echo "✅ Bumped to version: $VERSION"

# Commit the version change
git add package.json
git commit -m "chore(workstreams): release v$VERSION"

# Create and push tag
TAG="workstreams-v$VERSION"
git tag "$TAG"
echo "✅ Created tag: $TAG"

# Push commit and tag
git push origin main
git push origin "$TAG"

echo ""
echo "🚀 Released $TAG"
echo "   GitHub Actions will now publish to npm"
echo "   Check: https://github.com/AlbertoV5/agenv/actions"
