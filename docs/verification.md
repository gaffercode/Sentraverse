# Verification

What was actually run, when, and with what result. Add a new dated section per verification
session; never rewrite an old one. How to run each check is in [`testing.md`](testing.md).

## Acceptance criteria

A change is acceptable when, from the capsule root:

1. `install --frozen-lockfile`, `typecheck`, `lint`, `test`, `build` and `deploy:dry-run` exit 0;
2. runtime or visual changes also pass `test:e2e` against the fresh build;
3. Vera changes are exercised against a stub or closed upstream (no real Dify calls in tests);
4. the result is recorded here and in `.agents/HANDOFF.md`.

## 2026-11-20 — documentation pass (Claude Opus 5.5)

Branch `docs/sentraverse-neural-srds`, capsule `projects/healthcare/sentraverse-neural`,
Windows 11, Node 24, pnpm 11.21.0. Commands run via `node scripts/pnpm.mjs` after deleting the
local `.next`, `test-results` and `tsconfig.tsbuildinfo` caches.

| Command | Started (UTC) | Exit | Result |
| --- | --- | --- | --- |
| `install --frozen-lockfile` | 13:03:06 | 0 | Lockfile unchanged |
| `run typecheck` | 13:03:07 | 0 | `tsc --noEmit` clean |
| `run lint` | 13:03:10 | 0 | ESLint clean |
| `run test` | 13:03:15 | 0 | node:test 59 tests, 59 pass, 0 fail |
| `run build` | 13:03:16 | 0 | `next build --webpack` succeeded |
| `run deploy:dry-run` | 13:03:32 | 0 | "production artifact present, no server-only names in client bundle" |

NOT RUN in this session:

- `test:e2e` (Playwright): not re-run; last recorded 24/24 on 2026-10-09 before the Vera widget.
- Live Vera request against Dify, and the Upstash-backed limit in production.
- `project:verify` extraction proof from the monorepo root.

Caveats:

- The dry-run's server-only list is empty, so its "no server-only names" line proves nothing
  about `DIFY_API_KEY` (see [`security.md`](security.md)).
- The SRDS scripts report `INVALID_LIFECYCLE_COMMAND` for the five commands that carry
  `timeoutSeconds`. The live contract schema (`tools/project-standalone/src/contract.mjs`)
  allows that key; the SRDS validator accepts only `{program, args}`. Neither the contract nor
  the validator was changed.

## 2026-10-11 — Vera limit (recorded in HANDOFF)

typecheck 0, lint 0 on `app/api/vera/chat/`, test 59/59, build 0; local production server with a
closed upstream: messages 1–10 passed the limit, the 11th returned 429, a 1,001-character
question returned 413. Live limit not verified.
