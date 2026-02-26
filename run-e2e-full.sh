#!/bin/bash

# E2E Full Test Runner - Allows for tag filtering
# Usage: ./run-e2e-full.sh [cucumber options]
# Example: ./run-e2e-full.sh --tags @smoke
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
done
if [[ -f dist/e2e/steps/interaction.steps.cjs ]]; then
  perl -pi -e 's/require\("\.\.\/support\/testIndicator\.utils"\)/require("..\/support\/testIndicator.utils.cjs")/g' dist/e2e/steps/interaction.steps.cjs
fi

echo "🧪 Running E2E tests..."
node run-cucumber.cjs "$@"

echo "✅ E2E test run completed"
