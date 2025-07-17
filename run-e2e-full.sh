#!/bin/bash

# E2E Full Test Runner - Allows for tag filtering
# Usage: ./run-e2e-full.sh [cucumber options]
# Example: ./run-e2e-full.sh --tags @smoke

echo "🔧 Compiling TypeScript tests..."
npm run e2e:compile

echo "📝 Renaming .js files to .cjs..."
find dist/e2e -name '*.js' -exec bash -c 'mv "$0" "${0%.js}.cjs"' {} \;

echo "🔗 Fixing module imports..."
find dist/e2e -name '*.cjs' -exec sed -i '' 's/require("\.\/\([^"]*\)\.actions")/require(".\/\1.actions.cjs")/g' {} \;
find dist/e2e -name '*.cjs' -exec sed -i '' 's/require("\.\/\([^"]*\)\.actions\.js")/require(".\/\1.actions.cjs")/g' {} \;
sed -i '' 's/require("\.\.\/support\/testIndicator\.utils")/require("..\/support\/testIndicator.utils.cjs")/g' dist/e2e/steps/interaction.steps.cjs

echo "🧪 Running E2E tests..."
node run-cucumber.cjs "$@"

echo "✅ E2E test run completed"