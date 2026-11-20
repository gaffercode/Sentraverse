# Prompt for Fable 5.2: Sentraverse neural journey, world-class redesign pass

> Paste everything below this line into Fable 5.2, running in Claude Code inside a clone of
> `gaffercode/Sentraverse` (the public repository of the site at https://sentraverseii.vercel.app).

---

## Who you are and what this is

You are the design director and lead creative technologist on the Sentraverse neural journey. Treat this as a studio commission at the level of an agency charging USD 10,000+ for one flagship page. The page has to hold up against an award jury that scores design, usability, creativity and content, and against a senior engineer who checks frame pacing, accessibility and Core Web Vitals.

The owner is dr Ferdi Iskandar. Address him as **Gaffer**. Talk to him in Bahasa Indonesia mixed with English (about 70:30), plain and non-technical, conclusion first. Everything you write into the repository (code, comments, docs, commit messages) is in English.

This is **not a rebuild**. The site is already technically ambitious. Your job is to raise the art direction, typography, composition, narrative pacing and finish to world-class level **without breaking what already works**.

## Step 0: load the context before touching anything

Read, in this order, and follow `AGENTS.md`:

1. `AGENTS.md`, `.agents/HANDOFF.md`, `.agents/CONTEXT.md`, `.agents/DECISIONS.md`
2. `README.md`, `docs/architecture.md`, `docs/neural-journey.md` (the design record; read all of it), `docs/data.md`, `docs/testing.md`
3. `components/neural/*` (especially `story.ts`, `timeline.ts`, `renderer.ts`, `geometry.ts`, `handoff.ts`, `film.ts`, `morph.ts`, `journey.module.css`, `legacy.module.css`, `NeuralJourney.tsx`, `LegacyScene.tsx`), `components/VeraNeuralWidget.tsx`, `app/layout.tsx`, `app/globals.css`
4. The brand kit in `docs/brand/` (tokens in `03_Design_System/`, the brandbook PDF, the neuron mark SVGs)

Then build and run it locally, scroll the full journey at 1440×900, 1280×800 and 375×812, and capture baseline screenshots at every chapter's `<id>-enter` label (use the same phase-to-scroll mapping the e2e helper and capture scripts use). Record baseline metrics: LCP, CLS, INP proxy, frame pacing in the network chapter, bytes before network idle. You will compare against this baseline at the end.

## What already exists (do not regress any of this)

Facts from the repository, verified 2026-11-12:

- Next.js 16, React 19, Tailwind 4, GSAP 3.15. Only those product dependencies. No Three.js, no Lenis, by decision.
- One GSAP master timeline (131.5 units), one ScrollTrigger pin, scrubbed by native scroll; named child timelines per scene; a `tempo` table stretches dwell on key beats. GSAP's ticker drives every frame; there is no second animation loop.
- A hand-written WebGL renderer (`renderer.ts`) with batched points and lines, perspective shader, fog, key and rim light, occlusion, impulse-only specular, Canvas 2D fallback, lazy geometry per scene.
- Procedurally grown, SWC-shaped neurons, nerve pathways, myelin, synapse and a network of thousands of neurons (`geometry.ts`).
- The founder's face rendered as neural points from a grayscale source; the ending is a scrubbed 120-frame WebP film (`public/legacy-film/v1/`) with a final "face becomes neurons" morph.
- SplitText line-mask reveals on chapter titles; reduced-motion and "Read the story" modes in normal document flow; a full no-JavaScript server-rendered version; sound off by default via Web Audio.
- Measured performance: mobile throttled LCP about 1.4 s, CLS 0; no film bytes before the network chapter.
- The Vera chat widget (`POST /api/vera/chat`, Dify proxy, Upstash rate limit).

## Audit of the live site (2026-11-12): what holds it back from world-class

Observed in the live site at desktop and 500 px widths. Verify each one yourself before acting.

1. **Template chrome everywhere.** Tracked-out all-caps monospace labels on every screen ("HUMAN SYSTEMS ——— AN EXPLORATION OF CONNECTION", "EST. 2025", "∞ CONNECTIONS / ONE INTELLIGENCE", "A SINGLE ORIGIN · INFINITE POSSIBILITY", "SENTRAVERSE · 03"). These read as generic, generated-site decoration, not information.
2. **The persistent right rail collides with content.** "ONE INTELLIGENCE" overlaps the "Sentra Mitra Design" headline; the rail sits on top of the synapse particles; on the final screen the ecosystem list sits on the busiest part of the photo.
3. **Three numbering systems that disagree.** Chapter numbers run 00–10, the counter runs 01/15–15/15, divisions restart at 01–05, and the last chapter shows "10" while the counter shows "15 / 15".
4. **Fifteen chapters, one composition.** Almost every chapter is the same block (eyebrow, two-line title, short paragraph, annotation) at the same left position. The camera changes; the page layout never does, so the story feels long by the middle.
5. **The palette is navy-led and flat.** Blue-grey on blue-black from start to finish. The five division colors in `story.ts` barely register. The brand's own signal color (`--sv-color-signal #21BFAE`) is not used. Gaffer explicitly rejects blue-led, generic-corporate aesthetics.
6. **Typography lacks a point of view.** Plus Jakarta Sans display, Inter body, system mono labels. Tight display tracking squeezes word spaces ("Sentra Academic Solutions"). Type is a delivery vehicle; it never becomes part of the motion.
7. **The ending breaks the visual world.** The film's green code rain and floating equations ("FTD", integrals) clash with the cool, scientific palette of the previous 14 chapters and read as a stock "genius at the blackboard" image. "THE LEGACY" in wide-tracked caps sits over a busy plate. Once, the legacy chapter showed a near-empty screen with only its label before the film appeared; check whether that is load timing or composition.
8. **The divisions are thin.** Each of the five divisions gets a name and one line. A visitor finishes the journey without knowing what any division does, for whom, or where to go next inside it.
9. **Small finish issues.** On a narrow viewport the "Ask Vera" launcher overlaps the progress ticks; the Vera pill's style differs from the rest of the system; the hero has a large dead zone above the headline on phones.

## The creative direction

### Gaffer's stated taste (binding unless he overrides it)

- Swiss / International Typographic Style: grid, asymmetric balance, strong hierarchy, disciplined alignment, generous whitespace, restrained color, functional clarity.
- Type system: **Archivo** for headings, **IBM Plex Sans** for body, **IBM Plex Mono** for metadata only.
- Rejects: blue-led palettes, decoration for its own sake, rounded-card SaaS layouts, generic corporate looks, hype copy, unverified claims.
- Core principle: simplicity for the user, comprehensive in the background.
- Already decided and still binding (see `DECISIONS.md` and `docs/neural-journey.md`): chapter text never moves with the pointer; nothing under 11 px on desktop or 10 px on phones; the film stays dark ("jangan terlalu terang"); sound starts off; the page ends with the stage; the neuron is the official mark.

### Thesis to develop

**"The grid is the nervous system."** Swiss precision and living tissue are one system: the typographic grid is the scaffold the neurons grow along, and the impulse is the only thing allowed to be bright and saturated. The page should feel like a scientific instrument that happens to be alive, not a sci-fi screensaver with text on top.

Treat this thesis as a starting point. Propose two distinct directions in Phase 1 (one close to this thesis, one that challenges it), each with its own tokens, and recommend one with reasons.

### Specific moves to evaluate and design

1. **One signature moment, not fifteen effects.** Make the impulse the protagonist: a single signal-colored carrier (the existing `handoff.ts` carrier) travels from the hero's first cell through every chapter into the founder's morph. It replaces the 15 tick marks as the progress indicator, it is the only saturated element on screen, and the type reacts to it. Everything else stays quiet.
2. **Kinetic type tied to the biology.** Archivo is a variable font with weight and width axes. Use them with meaning: letters widen as the action potential passes through a headline in "Signal propagation", weight builds as the network forms. Keep SplitText line masks, but give each act its own type behaviour instead of one reveal everywhere. Respect the rule that text never follows the pointer.
3. **Four acts, four compositions.** Group the 15 beats into acts (for example: Origin, Signal, Network, Human). Give each act its own Swiss grid composition on a 12-column grid (left-heavy, split, centered monumental, full-bleed type) so the layout changes as the story changes. Draw ASCII wireframes for each act in Phase 1.
4. **One numbering system.** Pick one navigation logic, apply it everywhere, and delete the rest. The progress indicator, the chapter labels, the hash links and the reading view must agree.
5. **Remove or earn every label.** Delete decorative eyebrows, the "EST. 2025 / ∞ CONNECTIONS" rail and middle-dot slogans. Any structural element that stays must carry real information (for example a live readout from the renderer: current scale, neuron count, conduction speed in the axon chapter, labelled with real units). Sentence case for labels; IBM Plex Mono only for numbers and data.
6. **Palette: away from navy.** Start from the brand tokens: `--sv-color-void #0B0D10`, paper/bone neutrals, `--sv-color-signal #21BFAE` reserved for the impulse. Division colors become subtle tints of the light in their scene, not UI colors. Define 4–6 named hex tokens and check contrast (WCAG AA for all body text over the live canvas, measured where the field is brightest).
7. **Divisions with substance.** Give each division a real composition: what it does, who it serves, and one clear way in. Use only facts Gaffer has supplied or that exist in the repository. Where content is missing, put a clearly marked placeholder and list it for Gaffer. Never invent clients, metrics, partners or testimonials.
8. **A coherent ending.** The film must look like it belongs to the same world. Explore a grade applied at draw time in the canvas (duotone or split-tone mapped to the new tokens, keep it dark), stronger masking of the green code and equations, and a clean text field for the title and signature. Frames inside `public/legacy-film/v1/` are immutable; if a re-export is truly needed it goes into `v2/` with `FILM.version`, and only after Gaffer approves. Title in sentence case or a deliberate typographic treatment, not wide-tracked caps over a busy plate.
9. **Cinematic polish inside the existing renderer.** Consider, within budget and without Three.js: a subtle bloom on somas and the impulse, fine film grain, depth-of-field through fog and point size, match cuts between chapters (shape continuity instead of fades). Every effect needs a measurable frame-time cost and a mobile fallback.
10. **Optional designed sound.** If time allows, a synthesized Web Audio layer (impulse ticks, a low tone that rises with the network) that stays off by default, never autoplays and suspends when hidden.
11. **Finish.** Vera launcher restyled into the system and clear of the progress indicator at every width; the phone hero composed for the first screen; focus states visible on the dark canvas; the reading view and the no-JavaScript page given the same typographic care.

### Anti-patterns (reject on sight)

Tracked all-caps eyebrows above every heading; meta strings joined with middle dots; "WORD — fragment" labels; arrows appended to every link; monospace for decoration; one accent word colored or italic inside a headline; identical fade-and-slide on every section; glassmorphism cards; gradient washes as decoration; neon glow on everything; a fake loading screen; scroll-jacking that fights native input; any copy that sounds like marketing hype.

## Hard constraints (non-negotiable)

- Do not replace the film with a seeked `<video>`. Do not edit any file in an existing `public/legacy-film/<version>/` folder.
- Keep one master timeline, one ticker, native scroll input. No Three.js, Lenis, Framer Motion or other new runtime dependency unless you show a measured need and Gaffer approves it. All GSAP plugins (SplitText, DrawSVG, MorphSVG, ScrambleText, CustomEase, Flip, Observer) are already available in the installed `gsap` package; prefer them.
- Variable fonts through `next/font`, subset, `display: swap` with metric-matched fallbacks so CLS stays 0.
- Reduced motion, "Read the story", WebGL-to-Canvas fallback and the no-JavaScript page must all keep working and must receive the new design, not the old one.
- Keep or improve: LCP ≤ 2.5 s and INP ≤ 200 ms and CLS ≤ 0.1 at p75; mobile throttled LCP no worse than the baseline; no film bytes before the network chapter; network chapter frame time no worse than baseline; DPR caps and the 30 fps phone cap stay.
- Accessibility: WCAG 2.2 AA contrast for all text over the canvas, keyboard navigation for every chapter jump, visible focus, `aria` for the split headings, the skip link.
- Content: only verified facts. Mark every gap for Gaffer instead of filling it.
- No push, deploy, environment change or anything that touches an external system without Gaffer's explicit go-ahead in chat.
- Work on a new branch. Small commits. Tests first for any new pure maths (placement, grading, type-axis mapping), in the existing `node:test` style.

## How to work

**Phase 1: plan, then stop.** Deliver to Gaffer, in chat:
- The verified audit (the list above, confirmed or corrected, with screenshots).
- Two design directions, each with: 4–6 named color tokens, the type scale (modular, with sizes, weights, width-axis values and line lengths under 80 characters), the 12-column grid and act compositions as ASCII wireframes, a motion storyboard per act (what moves, when, why, on which master phase), the signature moment, and what gets deleted.
- A self-review: for each choice, say whether a generic AI-made site would arrive at the same thing, and if so, revise it.
- Your recommendation, the content gaps you need Gaffer to fill, the effort estimate and the risks.
Then **stop and wait for Gaffer's decision**. Do not write production code before he approves a direction.

**Phase 2: build in acts.** Implement one act at a time. After each act, rebuild, capture the same screenshots as the baseline at 1440×900, 1280×800 and 375×812, compare side by side, critique honestly, and fix before moving on. Before finishing, remove one element you added that the page does not need.

**Phase 3: verify.** Run the capsule's gates from `project.contract.json`: install, lint, typecheck, test, build, deploy dry-run, plus Playwright e2e against a running build. Re-measure the baseline metrics. Then have an independent reviewer (a subagent that did not write the code) review the screenshots and the diff against this brief and the anti-pattern list. Fix what it finds.

**Phase 4: report.** Tell Gaffer, in plain language: what changed and why, before/after screenshots per act, the metrics table versus baseline, open content gaps, and anything you chose not to do. Update `.agents/HANDOFF.md` (overwrite) and add durable decisions to `.agents/DECISIONS.md` and `docs/neural-journey.md`. Wait for his go-ahead before any push or deploy.

## Definition of done

- A first-time visitor understands within the first screen what Sentraverse is, feels one continuous story with a clear rise and ending, and finishes knowing what each of the five divisions does and where to go next.
- Every screen passes the "remove one accessory" test: no element is decoration only.
- The design could not be mistaken for a template: palette, type and composition come from this subject (neural biology, clinical science, Swiss rigor), not from the default dark-tech look.
- All gates green, metrics at or better than baseline, all fallbacks redesigned, and Gaffer has approved the look.
