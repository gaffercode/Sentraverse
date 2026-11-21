# Data

What the site stores, sends and serves. Security controls are in [`security.md`](security.md).

## Data classes

| Data | Where | Retention | Owner |
| --- | --- | --- | --- |
| Static assets: `public/neural-face.webp`, `public/legacy-film/<version>/`, `public/brand/` | Repository, served by the host | Until removed from the repository | Gaffer, published on purpose |
| Visitor question and Vera conversation | Sent from the browser through `route.ts` to Dify | Not stored by this capsule; Dify retention is set in the Dify app, outside this repository | Dify app owner |
| Conversation id | React state in `VeraNeuralWidget.tsx` | Until the tab closes or "Restart conversation" | Visitor's browser |
| Rate-limit counter | Upstash Redis key `vera:msgs:<sha256(ip)[0:32]>` | 24 h TTL (`SET … EX 86400 NX`) | Vercel Marketplace store |
| Rate-limit fallback | In-memory `Map` per server instance | Until the instance stops; pruned above 5,000 keys | None (ephemeral) |

No patient data, account, cookie, form or analytics. The raw client IP is never stored: only a
truncated SHA-256 hash reaches Upstash (`limit.test.mjs` asserts it).

## Environment variables

Names only; values live in Vercel project settings or a local `.env.local` (git-ignored). The
tracked `.env.example` lists the same names with empty values.

| Name | Used by | Required |
| --- | --- | --- |
| `DIFY_API_KEY` | `route.ts` | For Vera; without it the route returns 500 |
| `DIFY_API_URL` | `route.ts` | No; default `https://api.dify.ai/v1` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | `limit.ts` | No; without them the limit is per instance |

## Film versions

A re-export of the film goes into a new `public/legacy-film/<version>/` folder (frames are
served `immutable`); `FILM.version` in `film.ts` selects it. Old versions stay until no deployed
build points at them. Only `v1` exists (120 frames plus `poster.webp`).

## Backup and recovery

Everything durable is in git. The Upstash counter is disposable: losing it only resets limits.
