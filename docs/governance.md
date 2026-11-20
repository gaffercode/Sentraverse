# Governance

Who decides what, and how changes are recorded. The monorepo root `AGENTS.md` applies while
the capsule is nested and wins on conflict; this file must not become a lifecycle dependency.

## Risk tiers for this capsule

| Tier | Examples here | Approval |
| --- | --- | --- |
| R0 | Reading code, running checks | None |
| R1 | Docs, copy, motion knobs, tests, local builds | Agent, recorded in HANDOFF |
| R2 (capsule default) | The Vera route, environment names, dependencies, CI, `project.contract.json`, `AGENTS.md` | Reviewed diff; Gaffer informed |
| R3 | Production deploy, Vercel/Dify/Upstash settings, credentials, publication, clinical messaging | Gaffer's explicit prior approval, per action |

Merges (including pull and fast-forward of `main`) need Gaffer's approval each time; auto-merge
is never enabled.

## Protected areas

- Frames inside an existing `public/legacy-film/<version>/` (immutable).
- The master timeline's phase mapping in `timeline.ts` (pinned by tests).
- The chapter order and division names in `story.ts`.
- The standalone contract: no imports from other capsules or root packages.

## Records

| Record | Purpose |
| --- | --- |
| `.agents/HANDOFF.md` | Current state; updated every capsule session |
| `.agents/DECISIONS.md` | Durable decisions, appended, dated |
| `.agents/CONTEXT.md` | Capsule identity |
| `project.contract.json` | Lifecycle commands, repository, risk, external dependencies |
| `docs/documentation.manifest.json` | SRDS documentation coverage |

Agent commits carry a `Co-Authored-By` trailer. Agents report outcomes with the actual model and
only directly observed verification.

## Human authority

Gaffer (dr. Ferdi Iskandar) owns the product, the brand, the founder's film and every
publication. Agents may prepare changes, run local checks and write documentation; they never
push, deploy, change credentials or decide clinical messaging on their own.
