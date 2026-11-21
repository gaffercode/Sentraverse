# Development

How to run and change the capsule on a workstation. Every command runs from the capsule root
as argv, as in `project.contract.json`.

## Requirements

- Node 24 (`engines: >=24 <25`), pnpm 11.21.0 (`packageManager`); the capsule has its own
  `pnpm-workspace.yaml` and `pnpm-lock.yaml` and never uses the enclosing monorepo's.
- `scripts/pnpm.mjs` wraps pnpm through a shell so the same argv works on Windows (`pnpm` is a
  `.cmd` there).
- Optional: Google Chrome for Playwright e2e and for the film scripts.

## Install and run

```bash
node scripts/pnpm.mjs install --frozen-lockfile
node scripts/pnpm.mjs run dev      # next dev --webpack on 127.0.0.1:4346
node scripts/pnpm.mjs run build    # next build --webpack
node scripts/pnpm.mjs run start    # next start on 127.0.0.1:4346
```

If 4346 is held by an earlier `next start`, stop it or verify on another port
(`.agents/HANDOFF.md`, Known quirks).

## Configuration

The journey needs no configuration. Vera needs `DIFY_API_KEY` (and optionally `DIFY_API_URL`,
`KV_REST_API_URL`, `KV_REST_API_TOKEN`) in a git-ignored `.env.local`, copied from the tracked
[`.env.example`](../.env.example); see [`data.md`](data.md).
Never commit values. Without a key the page works and Vera answers "not available".

## Workflow

1. Read `.agents/HANDOFF.md`, `.agents/CONTEXT.md`, then `AGENTS.md`.
2. Change code; keep frames in an existing `public/legacy-film/<version>/` untouched.
3. Run typecheck, lint, test (and build for runtime changes); see [`testing.md`](testing.md).
4. Record durable decisions in `.agents/DECISIONS.md` and the session in `.agents/HANDOFF.md`.

## Film re-export

```bash
node scripts/legacy-film/extract.mjs <clip.mp4> <version> [quality]
node scripts/legacy-film/measure.mjs <out.png> [density]
```

`extract.mjs` refuses an existing version folder. Update `FILM.version` in `film.ts` afterwards.

## Style notes

- Every file carries "Architected and built by Drferdi." in its header comment.
- GSAP quirks (`quickSetter(el, 'scale')` is a no-op; CSS transforms on GSAP-moved elements) are in
  `.agents/HANDOFF.md`.
