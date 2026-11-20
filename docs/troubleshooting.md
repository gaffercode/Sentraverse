# Troubleshooting

Known failures, how to recognise them and what to do. Escalate anything not listed to Gaffer
with the symptom, URL, browser and time.

## Vera

| Symptom | Likely cause | Check and fix |
| --- | --- | --- |
| "Vera is not available right now." on every message, HTTP 500 | `DIFY_API_KEY` missing in that environment | Vercel env for Production/Preview; locally `.env.local`. Restart or redeploy after setting it |
| Same message, HTTP 502 | Dify returned a non-2xx or no stream | Vercel runtime logs show `Vera upstream error: <status>`; check the Dify app status and quota |
| "You have reached the limit of 10 messages per day." (429) | Limit reached, or many visitors share one IP | `Retry-After` gives seconds left; delete the Upstash key to reset |
| Limit resets unexpectedly | Upstash not configured or unreachable; memory fallback per instance | Check `KV_REST_API_URL` / `KV_REST_API_TOKEN` in Vercel |
| "Please keep your question under 1000 characters." (413) | Question too long | Expected behaviour |

## Journey

| Symptom | Likely cause | Check and fix |
| --- | --- | --- |
| Flat 2D field instead of WebGL | No WebGL, shader link failure or context loss | Expected fallback (`renderer.ts`); e2e "context loss recovers to Canvas" |
| Unpinned, readable chapters | `prefers-reduced-motion: reduce` | Expected reading mode |
| Opening words stay faint | Scripts never started | They come up by themselves after 5 s (CSS `hero-unaided`); check console errors |
| Film frame missing or blank | Frame not loaded yet, or a bad export | The nearest frame stands in; `film.test.mjs` asserts every file exists |
| Stuttering on a weak GPU | Frame pacing beyond budget | Known limit; record a trace and compare with `neural-journey.md` targets |

## Build and local

| Symptom | Cause | Fix |
| --- | --- | --- |
| `spawn pnpm ENOENT` on Windows | Calling `pnpm` directly | Use `node scripts/pnpm.mjs …` |
| `EADDRINUSE 127.0.0.1:4346` | An earlier `next start` still runs | Stop it or start on another port |
| `deploy:dry-run` "BUILD_ID tidak ada" | No build yet | Run `build` first |
| Playwright `-g "a b|c"` matches nothing | Quoting lost through the shell wrapper | `node node_modules/@playwright/test/cli.js test -g "..."` |

## Rollback

If a release breaks the page, promote the previous production deployment in Vercel (Gaffer).
Confirm with the routine checks in [`runbook.md`](runbook.md).
