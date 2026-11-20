# Regulatory and clinical safety

The site sits in the healthcare domain but handles no patient data and makes no clinical
decision. This file records why, and the one place where health topics can appear: Vera.

## Scope of the boundary

- The journey is brand storytelling. Chapter copy in `story.ts` describes neurobiology as a
  metaphor; it is not medical advice.
- No form, account, record or upload exists, so no patient data can enter the site.
- Brand rule (design system and brand standards): Sentraverse is a public gateway, never the
  clinical decision engine; write "designed to support", never "clinically validated" without
  documented evidence.

## Vera

- Vera answers come from an external Dify app. Its system prompt, knowledge base and model are not
  in this repository and are not reviewed by this documentation.
- The widget's quick prompts (`QUICK_PROMPTS` in `VeraNeuralWidget.tsx`) invite questions about
  "7 protokol klinis" and "kepatuhan SATUSEHAT & privasi data". These steer visitors toward
  clinical and regulatory topics, which the public gateway is not meant to answer with authority.
- The widget shows no disclaimer that answers are informational.

## Controls and open items

| Item | Status | Owner |
| --- | --- | --- |
| No patient data path | In place (no inputs besides the chat question) | Capsule |
| Vera question length and rate limits | In place (`route.ts`, `limit.ts`) | Capsule |
| Review of the Dify app prompt and knowledge for clinical claims | Not done in this repository | Gaffer |
| Decide whether the clinical/SATUSEHAT quick prompts stay | Open | Gaffer |
| Informational-use disclaimer in the widget | Absent | Gaffer decides; code change |

## Escalation

Any report of Vera giving clinical advice goes to Gaffer, who can remove `DIFY_API_KEY` in
Vercel to disable Vera immediately (see [`runbook.md`](runbook.md)). Changes to clinical
messaging are R3 under the monorepo `AGENTS.md`.
