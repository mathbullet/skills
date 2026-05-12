---
name: explain-via-html
description: Author an explainer as a self-contained single-page HTML file rather than prose Markdown. Use when an explainer would benefit from spatial layout, interactivity, or motion — concept walk-throughs, side-by-side comparisons, annotated diffs, animation sandboxes, interactive flows, etc. References thariqs.github.io/html-effectiveness as a working library of concrete formats and pins down term-list placement, diagram conventions, an opinionated style preset, and an html-expl/ output convention.
---

# HTML Explainer Conventions

## Reference site

https://thariqs.github.io/html-effectiveness/

A gallery of twenty self-contained `.html` files an agent produced instead of a wall of Markdown, organised into nine categories (Exploration & Planning, Code Review & Understanding, Design, Prototyping, Illustrations & Diagrams, Decks, Research & Learning, Reports, Custom Editing Interfaces). Each example opens directly in a browser as a single `.html` file.

## Rule

When asked to explain something, first fetch the gallery page above (and the example closest to the topic) and shape the output after that example's structure and interactivity. Do not default to a long Markdown prose answer.

- Open at least one example from the closest category before drafting. For a concept walk-through use `15-research-concept-explainer.html`; for a feature walk-through `14-research-feature-explainer.html`; for a comparison of alternatives `01-exploration-code-approaches.html`; for a mechanism diagram `13-flowchart-diagram.html`; etc.
- Pick the format that fits the topic (side-by-side comparison, diagram, interactive control, timeline, ...).
- The output is a single self-contained `.html` file. Minimise external dependencies; it must open and work directly in a browser.

The principles below also apply when delivering the explainer as HTML.

## Term handling

- Place the term list in a right sidebar (`<aside>`) so the reader can consult it without scrolling back. Use `position: sticky; top: 0;`, and when content exceeds the viewport let the sidebar scroll independently with `max-height: 100vh; overflow-y: auto;`. Do not put the term list only at the top of the body — the reader will have to scroll back every time a defined term reappears.
- Layout is a two-column CSS Grid: body on the left (`minmax(0, 1fr)`) and the sidebar on the right at a fixed 300–360px. On narrow viewports (around 1000px and below) stack the sidebar above the body and switch `position` back to `static`.
- The term list itself is a table (`<table>`). Every specialised term used in the body is defined here at first occurrence.
- A term-list entry defines what the term *is* in one or two sentences. Functional or behavioural detail belongs in the body.
- Even widely recognised proper nouns get defined. Assume the reader does not know them.
- When defining a compound term, define each constituent word too.

## Diagram conventions

- Use inline SVG for diagrams. Do not use ASCII art (the whole point of moving to HTML is to exploit spatial layout and interaction).
- Every label inside a diagram is a term that exists in the term list.
- For diagrams with many nodes or long labels, lay them out vertically (top-down) rather than horizontally; horizontal strips collapse.
- If using Mermaid, load it via a single CDN script. Do not use `<br/>` inside a Mermaid node — many renderers display the literal HTML tag. Use ` / ` separators or shorten the text to one line.

## Granularity of the description

- Do not gloss details with vague language. Subjects, objects, and verbs must be explicit.
- A phrase like "A uses B to do X" must specify what A is and why A is needed for X.
- Avoid vague verbs like "receives" or "passes". Spell out who does what to bring the state about (e.g. "receives the value" → "the caller passes it as an argument").
- Do not require the reader to make a leap between steps. Step-to-step causality is explicit.
- Describe the mechanism in its general form first; tie it to specific named instances afterwards as "in case X, ...". Do not anchor the whole description to a single proper-noun example.

## Structure

1. Term list
2. Background (why this is needed, or what problem it addresses)
3. Body (the mechanism / concept — includes the diagrams)
4. Worked examples (if any)
5. Notes (limitations, variants, related topics)

## Style rules (required)

- Text colours are limited to two: `#000000` (black) for body, `#00A4AF` (cyan) for accents. Light grey hurts readability and is not used for body, captions, or anything else.
- Background is `#FFFFFF` (white). Do not use coloured cards or coloured bands; rely on rules, whitespace, and typography to structure content.
- Fonts: body is `Noto Sans JP` loaded from Google Fonts (its Latin glyphs are well-tuned and the family also covers Japanese if needed). Monospace is `Ubuntu Mono` Regular. Do not specify serif or system fonts.
- Do not use emoji or Unicode arrow / star / bullet glyphs (→, ←, ↓, ↑, ✓, ★, ●, ▶). When an icon is genuinely needed, draw it as inline SVG.
- Accent elements (links, emphasis, rules, SVG strokes) use `#00A4AF` consistently. No other colour is used.
- Box-like containers (cards, panels, regions) are rounded (`border-radius: 10px` or so). Avoid right-angle boxes. The only exception is "wall"-like elements such as page headers or full-bleed section dividers.
- When laying out same-role items side by side, equalise their heights. With Grid or Flex, use `align-items: stretch` so each box matches its neighbour even if the inner content is shorter. Avoid uneven box heights within a row.
- For short text that must stay on one line (definitions containing math glyphs, labels, variable displays, etc.), do not use `<br>`. Wrap the logical line in a `<span style="white-space: nowrap">`. Latin / Japanese boundaries, half-width spaces, `<i>` math glyphs, `<sub>` and similar mixes give the browser many places to break when the container narrows; the nowrap span forces the run to stay together.
- Do not use inline pill-shaped badges ("chips") for body emphasis. For emphasis: (a) when the term has an authoritative source, wrap it in an `<a>` link to that source; (b) otherwise apply a text-only effect (`font-weight`, `color: var(--accent)`). Heading-adjacent metadata (time ranges, phase numbers) goes on a separate line under the heading as plain text (or `<small>`), not as an inline pill. The pattern to avoid is "a visually independent pill mid-sentence".

## Output location and filename

- HTML files live in an `html-expl/` directory at the project root. Do not scatter HTML across the top of the project.
- File names take the form `{yyyymmdd}-{kebab-case-symbolic-name}.html` (example: `20260512-event-loop-explainer.html`). The date is the local date on which the file is created or updated.
- The first time `html-expl/` is created in a project, ask the user which of the following to do:
  1. Track `html-expl/` in git (commit it with the rest of the project).
  2. Add `html-expl/` to `.gitignore` (treat it as local-only output).
  - Do not silently commit it or silently `.gitignore` it.
  - This check is skipped on subsequent saves once the project's policy is set.
- When updating an existing file, keep the same filename (including its date). Only create a new dated file if you specifically want to keep an alternate version alongside the existing one.

## Post-write behaviour

- Open the file with the `open` command only on first creation.
- On subsequent edits, do not `open`. The browser already has the file open; the reader reloads to see changes. Re-opening pulls the window to the front and interrupts the reader's flow.
- If the user explicitly asks to "open it" or "open in browser", `open` regardless of which case above applies.
