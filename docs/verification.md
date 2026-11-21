# Verification

What was actually run, when, and with what result. Add a new dated section per verification
session; never rewrite an old one. How to run each check is in [`testing.md`](testing.md).

## Acceptance criteria

A change is acceptable when, from the capsule root:

1. `install --frozen-lockfile`, `typecheck`, `lint`, `test`, `build` and `deploy:dry-run` exit 0;
2. runtime or visual changes also pass `test:e2e` against the fresh build;
3. Vera changes are exercised against a stub or closed upstream (no real Dify calls in tests);
4. the result is recorded here and in `.agents/HANDOFF.md`.

## 2026-11-21 — secret scan before a commit and in CI (Claude Fable 5.2)

Branch `chore/secret-scan-2026-11-21`, cut from `main` (`e8ca1ac`). Linux, Node 24.22.3, pnpm 11.21.0. Adds
`scripts/secret-scan.mjs`, `.githooks/pre-commit`, `app/secret-scan.test.mjs` and a Secret scan step in the CI Lint
job. No runtime file changed.

| Command | Exit | Result |
| --- | --- | --- |
| `node --test app/secret-scan.test.mjs` before the script existed | 1 | 7 of 7 failed (expected) |
| `lint`, `typecheck` | 0 | No findings |
| `test` | 0 | 70/70 |
| `node scripts/secret-scan.mjs` | 0 | every tracked file checked, no findings |

NOT RUN: `build`, `deploy:dry-run`, `test:e2e`, live Vera.

## 2026-11-21 — capsule-local ignore tests (Claude Fable 5.2)

Branch `fix/capsule-local-ignore-tests-2026-11-21`, cut from `main` (`bc8364e`). Linux, Node 24.22.3,
pnpm 11.21.0. Test-only change in `app/env-contract.test.mjs`: the capsule's `.gitignore` is now judged
alone, in an empty temporary repository, instead of asking Git in place.

Reason: asked in place, Git also applies the rules of a repository that encloses this folder. With the
capsule nested in a larger repository and its own SQLite rules removed, the old test still passed; the
new one fails and names `data.sqlite` and `local.sqlite3`. The four tests now also run in a tree that
has no `.git` folder.

| Command | Finished (UTC) | Exit | Result |
| --- | --- | --- | --- |
| `install --frozen-lockfile`, `lint`, `typecheck` | 08:00 | 0 | No findings |
| `test` | 08:00 | 0 | 63/63 |

NOT RUN: `build`, `deploy:dry-run` (no runtime file changed), `test:e2e`, live Vera.

Second commit on the same branch (wording only): `AGENTS.md`, `docs/neural-journey.md` and a
`ci.yml` comment now say the tests cover `components/` and `app/`, which is what the `test` script
runs. `lint` and `test` re-run after it; see the pull request checks for the recorded result.

## 2026-11-21 — env template and ignore rules (Claude Fable 5.2)

Branch `chore/env-contract-and-ignore-rules-2026-11-21`, cut from the public `main` (`c3541d3`) in a
scratch clone of `gaffercode/Sentraverse`. Linux, Node 24.22.3, pnpm 11.21.0. Commands run via
`node scripts/pnpm.mjs` on a clean clone.

| Command | Finished (UTC) | Exit | Result |
| --- | --- | --- | --- |
| `install --frozen-lockfile` | 07:33 | 0 | Lockfile unchanged |
| `typecheck` | 07:33 | 0 | No errors |
| `lint` | 07:33 | 0 | No findings |
| `test` | 07:33 | 0 | 63/63 (59 existing, 4 new in `app/env-contract.test.mjs`) |
| `build` | 07:33 | 0 | Production build written |
| `deploy:dry-run` | 07:33 | 0 | Artifact present, no server-only names in the client bundle |

The four new tests were watched failing before the change: no `.env.example`; thirteen probe paths
not ignored (`.env`, `.env.production`, a nested `.env`, SQLite and `.db` files, dumps, backups, key
files); and, with the ignore rule in place but no exception, `.env.example` itself ignored.

NOT RUN: `test:e2e` (no browser on this machine) and live Vera.

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
