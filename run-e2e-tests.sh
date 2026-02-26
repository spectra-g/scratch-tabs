#!/bin/bash

# E2E Test Runner Script
# This script compiles TypeScript tests, fixes module imports, and runs the E2E tests
set -euo pipefail

echo "🔧 Compiling TypeScript tests..."
npm run e2e:compile

echo "📝 Renaming .js files to .cjs..."
find dist/e2e -name '*.js' -print0 | while IFS= read -r -d '' file; do
  mv "$file" "${file%.js}.cjs"
done

echo "🔗 Fixing module imports..."
find dist/e2e -name '*.cjs' -print0 | while IFS= read -r -d '' file; do
  perl -pi -e 's/require\("\.\/([^"]*)\.actions"\)/require(".\/$1.actions.cjs")/g' "$file"
  perl -pi -e 's/require\("\.\/([^"]*)\.actions\.js"\)/require(".\/$1.actions.cjs")/g' "$file"
  perl -pi -e 's/require\("\.\.\/support\/testIndicator\.utils"\)/require("..\/support\/testIndicator.utils.cjs")/g' "$file"
done

echo "🧪 Running E2E tests..."
node run-cucumber.cjs "$@" --tags 'not @wip and not @bug'

echo "✅ E2E test run completed" 
