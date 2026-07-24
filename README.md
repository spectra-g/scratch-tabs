# Scratch Tabs

Scratch Tabs is a local-first developer workspace for exploring, transforming, and validating text/data formats directly in the browser.

Website: https://scratchtabs.com

## Highlights

- Local-first persistence with IndexedDB (no server required for core workflows)
- Installable Progressive Web App with offline app-shell caching
- Monaco-powered editor with many format/tool integrations
- Smart Views for structured content (JSON, CSV, and more)
- Spatial Canvas for arranging mixed text, code, images, links, and videos
- Transformation Pipeline system for repeatable data operations
- Dev tools ("tablets") (JWT, regex, REST client, converter, checksums, etc.)

## Tech Stack

- React 18 + TypeScript
- Vite
- Zustand
- Tailwind CSS
- Jest + Testing Library
- Playwright + Cucumber

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

The app starts on `http://localhost:5173`.

## Scripts

- `npm run dev`: Start local dev server
- `npm run build`: Build production assets
- `npm run preview`: Preview production build locally
- `npm run lint`: Run ESLint
- `npm run tsc`: Type-check project
- `npm run test`: Run unit tests
- `npm run coverage`: Run tests with coverage
- `npm run e2e`: Run E2E tests excluding `@wip`/`@bug`
- `npm run e2e:full`: Run all E2E tests

## Project Structure

- `src/`: Application source code
- `tests/e2e/`: End-to-end test suite
- `landing/`: Landing site assets/pages
- `changelog/`: Changelog generation scripts

## Developer Guidance

Coding-agent and implementation guidance is in [CLAUDE.md](./CLAUDE.md).

## Privacy Model

Scratch Tabs is designed to keep data client-side. Core app workflows run in the browser and persist locally.

Canvas documents and pasted image assets are stored separately in local IndexedDB
records. Baseline link cards do not fetch remote preview metadata, and supported
video embeds are created only after the user chooses Play. Workspace export is an
explicit local action and includes only the Canvas documents and referenced assets
in the selected workspace.

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Security

Please report vulnerabilities using the process in [SECURITY.md](./SECURITY.md).

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
