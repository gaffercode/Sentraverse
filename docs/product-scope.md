# Product scope

What Sentraverse Neural is for, who it serves, and where it stops. The design record for the
motion itself is [`neural-journey.md`](neural-journey.md); the code map is
[`architecture.md`](architecture.md).

## Purpose

Sentraverse Neural is the cinematic front door of the Sentra ecosystem. A visitor scrolls one
pinned stage through fifteen chapters (`components/neural/story.ts`): from a single connection,
through neurons, signal and synapse, to the Sentra divisions and the SENTRA wordmark, ending on
THE LEGACY, the founder's film (`components/neural/film.ts`, `LegacyScene.tsx`). Its job is to
explain the ecosystem and send people on to sentrahai.com. It sells nothing, collects no account
data and makes no clinical claim.

## Users

| User | What they need | Where it is served |
| --- | --- | --- |
| Public visitor (desktop) | Understand Sentra in one scroll; reach the ecosystem pages | `/`, links built by `sentra(path)` in `story.ts` |
| Public visitor (phone, tablet, touch) | The same story without horizontal overflow or tiny text | Responsive rules in `journey.module.css`; e2e "mobile retains the complete story" |
| Visitor with reduced motion or no JavaScript | A readable page of the same chapters | Reading mode in `NeuralJourney.tsx`; e2e "without JavaScript the full narrative" |
| Visitor with a question | A short answer about the ecosystem | Vera chat widget, `components/VeraNeuralWidget.tsx` → `POST /api/vera/chat` |
| Owner (Gaffer) | Publish the brand story; control the film and copy | Capsule repository, `.agents/DECISIONS.md` |

## Implemented workflows

1. **Scroll the journey.** One GSAP master timeline (`timeline.ts`) is scrubbed by a pinned
   ScrollTrigger. Chapters can be jumped to from the progress trace.
2. **Explore the divisions.** Each connected region is a link to its page on sentrahai.com;
   pointing at one names it in a micro-label (desktop only).
3. **Watch THE LEGACY.** The film is a scrubbed frame sequence (`public/legacy-film/v1/`, 120
   frames plus a poster), fetched only on the way to it.
4. **Opt into sound.** Sound is off until the visitor turns it on.
5. **Ask Vera.** The floating widget streams answers from a Dify app through the server proxy.
   Each visitor gets 10 messages per 24 hours; questions are capped at 1,000 characters.

## Out of scope

- The rest of sentrahai.com (story, ecosystem, insights, privacy, terms): it lives in the
  `sentraverse` capsule; this site only links to it.
- Any patient data, login, form, payment, analytics or cookie banner.
- Clinical decision support. Vera answers about the ecosystem; its prompt and knowledge live in
  the external Dify app, not in this repository.
- A seeked `<video>` for the film (forbidden by `AGENTS.md`).

## Non-functional requirements

- **Performance:** network frame pacing is recorded by the e2e suite (30–32 ms mean measured
  locally on 2026-10-09, `.agents/HANDOFF.md`). INP and LCP from field data are still open.
- **Accessibility:** no text under 11 px on desktop or 10 px on phones (`.agents/DECISIONS.md`,
  e2e); off-screen chapters are `inert`; reduced motion gets unpinned readable chapters.
- **Resilience:** WebGL failure falls back to Canvas 2D; no canvas still yields the chapter text.
- **Security headers:** OWASP baseline in `next.config.mjs` (see [`security.md`](security.md)).

## Known limits and open questions

- The capsule name says "Neural"; the 2026-11-20 design system names the brand "Sentraverse
  Intelligence" with four divisions, while `story.ts` still carries five divisions. Aligning the
  copy is an owner decision, not done here.
- Safari/iOS devices are a separate release check (`testing.md`).
- Canonical URL, sitemap and Open Graph image wait for the final domain (`app/robots.ts`).
