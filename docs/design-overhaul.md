# McAdams reading companion — design direction

This implements the owner's request for a complete UI/UX overhaul based on the supplied McAdams review. The existing working exercise and scoring service remain the foundation.

## Intent

A bookclub member arriving from WhatsApp should feel invited to imagine, rather than examined. They observe four pictures, supply a story, inspect what the model noticed, and privately reflect on their own goals. The activity is a doorway into Motivated Agent, not a measurement of their true self.

Domain: ambiguous pictures, imagined wants, four story folios, marginal notes, reading together, private reflection.
Palette: warm book paper, dark green cloth binding, graphite ink, terracotta annotation, muted brass, pale sage.
Signature: four numbered folios that become progress markers and return as story sections in the debrief.
Replace a personality-score hero with paired evidence panels; replace a long onboarding list with three compact steps; replace a long theory lecture with a guided private reflection and optional reading notes.

Typography uses Chinese serif headings and readable sans-serif body text. One restrained surface-tint system, fine rules, an 8px spacing rhythm, generous line-height, and short transitions keep it calm. No decorative stimulus previews or motive categories before submission.

## Implementation

1. Rebuild the intro, exercise, review, waiting and results layouts; preserve existing IDs and draft schema.
2. Give original and translated counts identical visual weight, including explicit unavailable translation.
3. Group source sentences by picture and reveal translation/label detail on demand.
4. Add a three-question reflection navigator: competence/relatedness, intrinsic/extrinsic, promotion/prevention. No personal input, storage or transmission.
5. Keep methodological metadata collapsed. Make local download carry both analysis paths equally and include reflection prompts.
6. Add interpretation and picture-norm boundaries to the README.
7. Verify result fixtures, fallback, keyboard/phone layout, draft reload, whole exercise navigation and backend regression tests. Preview locally; publication is separate from this design change.

## Scientific boundaries

Use the supplied review as conceptual context, not as a source of extra validation claims. In particular, do not repeat its suggestion that agreement gives greater confidence: both paths use the same model, so agreement is not validation. Keep affiliation distinct from McAdams's specific intimacy system. PSE stories are imagined stories, not autobiographical narratives. Picture norms select the shared set and never normalize participants.
