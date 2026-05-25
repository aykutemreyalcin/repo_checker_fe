# RepoChecker — Frontend

React UI for entering a GitHub repository URL, starting a security scan, and listing the results.

Talks to the backend (`repo_checker_be`); in development, Vite proxies `/api` requests to `http://localhost:8080`.

## Features

- Repo URL input and **Check** to start a scan
- **Reset** reloads the page and clears state
- **Download TXT** exports completed scan results as a text file
- Polls every 2 seconds by `jobId` (`POLL_MS = 2000`)
- Findings: severity (`CRITICAL` … `LOW`), category, file path, line, description, masked snippet
- Terminal states: `COMPLETED`, `FAILED`
- Clear error message when the backend is unreachable

## Requirements

- Node.js 20+ (recommended)
- Running backend: [repo_checker_be](../repo_checker_be) on `localhost:8080`

## Setup and run

```bash
cd repo_checker_fe
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

Example URL: `https://github.com/owner/repo`

### Other commands

```bash
npm run build    # build to dist/
npm run preview  # preview production build
npm run lint     # ESLint
```

## API layer

`src/api/githubScan.ts`:

| Function | Endpoint |
|----------|----------|
| `startScan(repoUrl)` | `POST /api/github/scan` |
| `getScanResult(jobId)` | `GET /api/github/scan/{jobId}` |

Types: `ScanStatus`, `Severity`, `FindingCategory`, `Finding`, `ScanResultResponse`.

Proxy (`vite.config.ts`):

```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true },
  },
},
```

For a production build served from the same origin, configure a reverse proxy or an `API_BASE` environment variable for the backend URL (currently hardcoded to `/api/github/scan`).

## Project structure

```
src/
  App.tsx           # Main page, form, polling, results list
  App.css           # Styles
  api/githubScan.ts # Backend client
  index.css         # Global styles
```

## Running with the backend

1. Terminal 1 — backend:

   ```bash
   cd ../repo_checker_be && ./mvnw spring-boot:run
   ```

2. Terminal 2 — frontend:

   ```bash
   npm run dev
   ```

The backend CORS config already allows port `5173`; with the proxy, browser requests go through the same origin.

## Stack

- React 19
- TypeScript
- Vite 8
- ESLint

## Related project

API and scan logic: [repo_checker_be](../repo_checker_be)
