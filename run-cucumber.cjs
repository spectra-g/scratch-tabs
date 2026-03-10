#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables to handle CommonJS modules
process.env.NODE_OPTIONS = '--require ts-node/register';

// Get command line arguments (skip node and script name)
const args = process.argv.slice(2);

// Run cucumber-js with all arguments
const cucumber = spawn('npx', ['cucumber-js', ...args], {
  stdio: 'inherit',
  env: { ...process.env }
});

// Forward signals so that AfterAll hooks in hooks.ts (which kill the dev server) still run
function forwardSignal(signal) {
  if (!cucumber.killed) {
    cucumber.kill(signal);
  }
}
process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

cucumber.on('close', (code) => {
  process.exit(code);
}); 