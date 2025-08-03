#!/bin/bash

# E2E Test Runner Script
# This script compiles TypeScript tests, fixes module imports, and runs the E2E tests

echo "🔧 Compiling TypeScript tests..."
npm run e2e:compile

if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
fi

echo "📝 Renaming .js files to .cjs..."
find dist/e2e -name '*.js' -exec bash -c 'mv "$0" "${0%.js}.cjs"' {} \;

echo "🔗 Fixing module imports..."
find dist/e2e -name '*.cjs' -exec sed -i '' 's/require("\.\/\([^"]*\)\.actions")/require(".\/\1.actions.cjs")/g' {} \;
find dist/e2e -name '*.cjs' -exec sed -i '' 's/require("\.\/\([^"]*\)\.actions\.js")/require(".\/\1.actions.cjs")/g' {} \;
find dist/e2e -name '*.cjs' -exec sed -i '' 's/require("\.\.\/support\/testIndicator\.utils")/require("..\/support\/testIndicator.utils.cjs")/g' {} \;

echo "🧪 Running E2E tests..."
node run-cucumber.cjs --tags 'not @wip and not @bug'

echo "✅ E2E test run completed" 