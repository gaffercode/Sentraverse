# Observability

What can be seen about the running site, and what cannot.

## Signals that exist

| Signal | Source | Where to read it |
| --- | --- | --- |
| `Vera upstream error: <status>` | `console.error` in `route.ts` when Dify is non-2xx | Vercel runtime logs |
| `Vera proxy error: <message>` | `console.error` in the route's catch | Vercel runtime logs |
| HTTP status of `/api/vera/chat` (400/413/429/500/502) | Next.js | Vercel request logs |
| Build output | `next build --webpack` | Vercel build logs, GitHub Actions `ci.yml` |
| Network frame pacing | `e2e/neural.spec.ts` ("network frame pacing is recorded") | Local Playwright output |
| Dify usage and conversations | Dify app console | Outside this repository |
| Limit keys | Upstash console | `vera:msgs:*` keys and TTLs |

Logs never print the question, the key or the IP.

## Gaps

- No health endpoint, uptime monitor or alert routing.
- No analytics or Real User Monitoring; INP and LCP field data are an open item.
- No counter of 429s or of the memory fallback being used.
- Log retention depends on the Vercel plan and was not verified from this repository.

## When to look

After a deploy, check the page and one Vera message (see [`runbook.md`](runbook.md)); when Vera
fails, read the runtime logs first ([`troubleshooting.md`](troubleshooting.md)).
