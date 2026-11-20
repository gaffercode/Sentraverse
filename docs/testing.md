# Testing

The test inventory, how to run it, and what it does not cover. Results of a given session are in
[`verification.md`](verification.md).

## Commands

All from this capsule root (see `AGENTS.md` "Commands"):

```text
node scripts/pnpm.mjs run typecheck
node scripts/pnpm.mjs run lint
node scripts/pnpm.mjs run test
node scripts/pnpm.mjs run build
node scripts/pnpm.mjs run deploy:dry-run
node scripts/pnpm.mjs run test:e2e      # needs Chrome; PLAYWRIGHT_BASE_URL or a dev server
```

## Unit tests (node:test)

`test` runs every `components/**/*.test.mjs` and `app/**/*.test.mjs`. Tested modules are leaves
with no runtime relative imports.

| File | Pins |
| --- | --- |
| `timeline.test.mjs` | Phase-to-time mapping, chapter labels, dwell, film/morph clocks, legacy beats, camera |
| `film.test.mjs` | Frame index/URLs, every frame present on disk, nearest-loaded fallback, fetch order |
| `morph.test.mjs`, `face.test.mjs` | Face region, dissolve front, glyph crop, face growth order |
| `morphology.test.mjs`, `constellation.test.mjs` | Neuron tree shape, vertex budget, constellation seats |
| `signal.test.mjs`, `handoff.test.mjs`, `tactile.test.mjs` | Activity cycle, carrier handoff, pointer placement |
| `app/api/vera/chat/limit.test.mjs` | Daily limit with TTL, hashed IP only, fallback when store is down or absent |

## End-to-end (Playwright, Chromium)

`e2e/smoke.spec.ts` (4 tests: landmark, way on to the ecosystem, robots and JSON-LD, logo and
icon) and `e2e/neural.spec.ts` (film, reduced motion, mobile, WebGL/canvas fallbacks, no-JS,
carrier, progress trace, text-size floor, SentraSquad and more). Run locally against a build;
CI does not run them (Gaffer, 2026-10-09).

## Gaps

- `route.ts` itself has no automated test: 400/413/429/500/502 paths were checked by hand on
  2026-10-11 (`.agents/HANDOFF.md`). A live Dify answer is never part of the suite.
- `VeraNeuralWidget.tsx` has no unit or e2e test.
- Frame timings are local evidence, not 60 fps on every GPU; INP comes from field data after a
  deploy; Safari/iOS devices are a separate release check.
- `deploy:dry-run` checks an empty server-only list; see [`security.md`](security.md).

Capsule topology from the enclosing repository: `python tools/safrs/check_topology.py`.
