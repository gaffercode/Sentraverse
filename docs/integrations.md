# Integrations

One HTTP endpoint and two external services. Data handling is in [`data.md`](data.md).

## `POST /api/vera/chat`

Source: `app/api/vera/chat/route.ts` (`runtime = 'nodejs'`).

Request body (JSON):

| Field | Type | Rule |
| --- | --- | --- |
| `query` | string | Required, non-empty after trim, ≤ 1,000 characters |
| `conversation_id` | string | Optional; Dify conversation to continue |
| `user` | string | Optional; default `sentraverse-neural-visitor` |

Responses:

| Status | When | Body |
| --- | --- | --- |
| 200 | Accepted | `text/event-stream` passed through from Dify (`no-cache, no-transform`, `X-Accel-Buffering: no`) |
| 400 | Missing or empty `query` | `{ "error": "Query parameter is required" }` |
| 413 | `query` too long | `{ "error": "Please keep your question under 1000 characters." }` |
| 429 | Limit reached | `{ "error": "…limit of 10 messages per day…" }`, `Retry-After` header |
| 500 | No `DIFY_API_KEY`, or an exception | `{ "error": "Vera is not available right now." }` |
| 502 | Dify non-2xx or no body | Generic error; the upstream text is not forwarded |

The client (`VeraNeuralWidget.tsx`) reads the SSE events, appends `answer` text, keeps the
returned `conversation_id`, and shows retriever sources when present.

## Dify

- Call: `POST ${DIFY_API_URL ?? 'https://api.dify.ai/v1'}/chat-messages` with
  `Authorization: Bearer ${DIFY_API_KEY}`, `inputs: {}`, `response_mode: 'streaming'`.
- No retry and no timeout in the route; a slow upstream holds the request open until the host's
  function limit.
- The Dify app (prompt, knowledge, model, retention) is configured outside this repository.

## Upstash Redis (REST)

- Call: `POST ${KV_REST_API_URL}/pipeline` with `SET key 0 EX 86400 NX`, `INCR key`, `TTL key`.
- 2 s timeout (`AbortSignal.timeout(2000)`); any failure falls back to the in-memory count.
- Installed by Gaffer from the Vercel Marketplace on 2026-10-11 (Production + Preview).

## Outbound links

`sentra(path)` in `story.ts` builds absolute links to `https://sentrahai.com` (story, ecosystem,
privacy, terms). They are links only, never imports.
