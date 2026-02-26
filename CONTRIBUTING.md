# Contributing

## Ground Rules

- Keep changes focused and small.
- Include tests for behavioural changes where practical.
- Follow existing code style and conventions.
- Do not include secrets, credentials, or personal environment data.

## Development Setup

```bash
npm install
npm run dev
```

## Before Opening a PR

Run:

```bash
npm run lint
npm run tsc
npm run test
```

For UI-heavy or flow changes, run E2E checks:

```bash
npm run e2e
```

## Pull Request Checklist

- Describe the problem and solution clearly.
- Reference related issues.
- Add or update tests.
- Update docs when behavior changes.

## Commit Messages

Use clear, descriptive commit messages that explain intent and scope.
