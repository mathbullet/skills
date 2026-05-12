---
name: documenting-with-sources
description: Common conventions for writing Markdown documents that cite external sources (survey reports, paper explainers, and any deliverable that surfaces facts from outside). Defines mandatory citation, in-text reference format, quotation-versus-prose separation, the ban on fabricated associations, and the source-list format. Referenced by survey, paper-details, and any skill that produces sourced output.
---

# Documenting with Sources

Common conventions for writing Markdown documents that pull from outside sources. Apply to any deliverable that surfaces facts taken from elsewhere — survey reports, paper explainers, and similar.

## Cite every factual claim

Every factual claim in the deliverable must carry a citation. A claim with no citation cannot be verified, and is worthless as a documented finding. If a claim cannot be tied to a source, mark it explicitly (e.g. "citation not confirmed"). Do not slip uncited claims in silently.

## Reference format

- In-text references take the shape `[label (YYYY/MM), location]`. How to fill the `label` slot (publication name, author short-form, position-only for the paper under review, etc.) is decided by the calling skill.
- Do not use bare numeric references such as `[1]` or `[2]`. Numbers alone force the reader to bounce between text and source list; readability drops.
- For the formatting of quotation blocks themselves (code-block fencing, original-and-translation pairing, where to place the source reference, anti-patterns), follow the `writing-quotation` skill. Read `writing-quotation` before drafting.

## Quotation vs prose

- Keep quotations and prose (the writer's own summary or interpretation) visually and structurally separate. Even when not quoting, write in a way that prevents the source's claim and the writer's interpretation from blending.
- When quoting a source written in a language other than the writer's working language, place the translation alongside the original inside the same code block (see `writing-quotation`).

## No fabricated associations or interpretations

Do not write interpretations, speculation, or associations that the source itself does not contain.

- Do not invent connections such as "this relates to X", "this could be applied to Y", or "this suggests Z" when the source does not say so.
- Do not import context from the surrounding conversation or the calling project into the body of the document. Descriptions of a source must stay within the source's own content.
- Good: "Main criticism: even with flipped labels, accuracy does not always drop, and the text-gradient is mathematically distinct from classical gradient descent" (states what the source actually says).
- Bad: "Relation to AI writing improvement: feedback-based improvement is mathematically different from gradient descent..." (the source does not say this; the connection is fabricated from conversation context).

## Source-list format

The source list at the end of the document uses this format:

`[label, YYYY/MM] Author. "Title." Publication. URL`

Do not use the `- [n]` list format.
