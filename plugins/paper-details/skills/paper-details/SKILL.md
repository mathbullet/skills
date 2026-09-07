---
name: paper-details
description: Produce a detailed Markdown explainer of an academic paper. The skill aims for faithful description, not critical review. Section structure mirrors the original paper, equations render as LaTeX with variable tables, citations to the paper under review use position only, and citations to other works use author-short form. Use when the user asks for a detailed paper write-up, a thorough paper explainer, or invokes "paper details". Depends on documenting-with-sources and writing-quotation.
---

# Paper Details

Conventions for producing a detailed Markdown explainer of an academic paper. The aim of this skill is to describe the paper accurately, not to critique it.

This skill follows the shared sourced-writing conventions defined in `documenting-with-sources`. Read `documenting-with-sources` before drafting.

## 1. Deliverable structure

### 1.0 Output location

Write the explainer as a `.md` file under the project's `reports/` directory, where "the project" is the root that contains the source paper PDF. Create the directory if it does not exist.

- Path: `{project-root}/reports/{paper-filename-base}.md`
- Example: if the PDF is at `/path/to/project/papers/foo.pdf`, the output is `/path/to/project/reports/foo.md`

Do not write next to the PDF, and do not write at the project root. Do not ask the user for the output path — determine it mechanically by the rule above.

### 1.1 Opening

In this order:

1. Title (`# {paper title} — Detailed Explainer`)
2. Bibliographic info (authors, affiliations, venue, year, arXiv/DOI, URL)
3. Full abstract — quote the original in a code block per `writing-quotation`; if the original is in a non-working language, place the translation alongside as a separate paragraph in the same block.

### 1.2 Body section structure

The body's section structure follows the paper's. If the paper has Section 1 Introduction, Section 2 Method, Section 3 Results, ..., the explainer uses the same order and the same headings.

Add explainer-only sections (e.g. "Strengths of the paper", "Limitations of the paper", "Source list") *after* the paper's own section structure.

### 1.3 Bullet lists vs prose

Pick the form by the nature of the content.

- Bullet lists fit enumerations of parallel items — variable lists, definitions of evaluation metrics, table-column descriptions, comparison points between methods, etc. When the content is genuinely list-shaped, the prose form blurs the boundaries between items.
- Prose fits relationships, causal flow, contextual explanation. When the reader needs to understand why items appear together or how they form a single argument, prose is what holds it together.

### 1.4 Figures and tables: extract as images

Never reconstruct a figure or table from scratch (no hand-written HTML tables, no redrawn SVG figures). Extract them as images from the source paper and insert those images into the deliverable (`.md` or HTML). Hand reconstruction introduces transcription errors and loses the original layout — bold, underline, colour-coded legends — so it is forbidden.

Use the script bundled with this skill:

```
uv run {this-skill-dir}/scripts/extract_images.py <PDF path>
```

- The script finds `Figure N` / `Table N` captions in the PDF and clip-renders the figure/table region directly above each caption — the bounding box of vector drawings, rules, and embedded images — at 300 dpi. Figures and tables are usually drawn as vectors with no embedded raster, so extraction is region rendering, not pulling out an embedded image.
- Output defaults to `{project-root}/images-from-papers/` as `{paper-filename-base}-fig{N}.png` / `{paper-filename-base}-table{N}.png`. The extraction list is recorded in `{base}-manifest.json` in the same directory.
- A multi-panel float (e.g. one Table float that contains panels (a)–(f)) is extracted as a single image, matching the single float in the paper.
- After extraction, insert the images from `images-from-papers/` into the deliverable. In `.md`, reference them by relative path, e.g. `![Figure N](../images-from-papers/{base}-fig{N}.png)`. In an HTML deliverable created with `html`, embedding as a base64 data URI is acceptable.
- Add the translated caption as a separate paragraph below the image. The caption text inside the image stays in the original language (it is not redrawn), so the translation goes outside the image.
- If the script occasionally drops a figure/table or includes too much margin, raise `--dpi` or inspect the output and adjust the pymupdf clip rectangle for that item. Either way, do not abandon the image-extraction approach.

## 2. Quotation and source reference

### 2.0 Output is built around translated quotation blocks

Build the explainer primarily out of "original quotation + translation" blocks that cover the paper's body in full. Do not make summarised, paraphrased prose the main act. Keep the reader able to check the original against the translation throughout the document.

Prose — the writer's own text — is a complement to the quotation-led flow, added only when one of the following holds:

- The connection between quotation blocks is unclear, and the relationship or logical flow between sections or paragraphs needs bridging.
- A supplementary explanation — variable definitions, prerequisite knowledge, how to read a figure or table, the first-occurrence definition of a term — is genuinely useful to the reader.

Where neither holds, do not re-summarise the original in prose; let the quotation block speak for itself. Do not settle into a "quotes carry the gist, prose summarises" split.

To convey the paper's claims accurately, include direct quotations from the original. A summary alone does not let the reader judge whether the writer's interpretation is correct.

Within the `[label (YYYY/MM), location]` structure defined in `documenting-with-sources`, the `paper-details` skill fills the label slot differently depending on which work is referenced.

### Reference to the paper under review

When referring to the paper under review, omit the author and year and cite the position only, in the form `[p.X, Section Y.Z]`. Since the entire explainer is about a single paper, the author does not need to be repeated each time.

Examples: `[p.4, Section 1]`, `[p.21, (15)]`, `[p.31, Figure 2]`.

### Reference to other works

For other works that the paper cites, use `[author-short (YYYY)]` inline.

- Pin location with a section, page, table, or figure number.
- Do not abbreviate the list of cited works with phrases like "...and others". List each work individually with its author and year. The reader of the explainer depends on this list — citing the explainer's host paper alone does not substitute for naming the works the paper references.

## 3. Equations

### 3.1 Syntax

- Equations are written in LaTeX. Inline as `$...$`, display as `$$...$$`.
- Forbidden: putting equations inside a code block. Forbidden: writing equations in plain-text form, pseudo-code form, or anything other than LaTeX syntax.

### 3.2 Variable definitions

Every symbol in an equation is unknown to the reader until it is defined. Before presenting an equation, define every variable and symbol that appears in it. Do not place an equation without its variable definitions in scope.

In equation-heavy sections (theory, method formalisation), put a variable table at the top of the section. Group variables by role. Each entry includes:

- The symbol (in LaTeX).
- What it means (one sentence).
- A note that helps intuition (concrete example, value range, behaviour in special cases).

Example:

```
Inputs:

- $n$: number of characters in the input text. The length of the user's prompt.
- $K$: the model's context-window length in characters. Inputs longer than this cannot be passed to the model directly.

Planner outputs:

- $k^*$: branching factor at each level — how many chunks to split into. With $k^*=5$ the input is split into five chunks at each level.
- $\tau^*$: threshold below which the chunk is sent to the LLM as-is, without further splitting. With $\tau^*=26{,}000$, chunks of 26,000 characters or fewer go straight to the LLM.
```

In sections with few equations, defining variables in-line before and after each equation is acceptable — but the principle that no equation appears with undefined symbols still holds.

## 4. Numerical results

- Present experimental results in tables when possible.
- Place the proposed method and baselines side by side.
- Transcribe numbers exactly as they appear in the paper. Do not round or approximate.
- Before showing the table, define each column and each metric in a preceding bullet list. By the time the reader sees the numbers, the meaning of each column is clear.
- Do not use generic words like "accuracy" or "performance" loosely. Use the metric name the paper itself defines (classification accuracy, pass rate, pass@1, etc.).
- If the same word is used in different senses across the paper (e.g. a method name that means "the best single result" in a table but "the entire procedure" in the body), call out the polysemy explicitly.

## 5. Describing experiments

### 5.1 Spell out the procedure

In experiment sections, the reader must be able to follow what was actually done. Do not omit:

- The concrete task steps (what the input is, what each step produces, what the final output is).
- The data-split structure (search set / validation set / test set — what each is for, and which result corresponds to which split).
- The search or optimisation procedure (initial state, number of iterations, what each iteration generates, the criterion under which the final result is selected).

### 5.2 Independence between sections

Each experiment section reads on its own. Do not refer back to "the method defined in Section X" with an unspecified abbreviation. Even when two experiments share a search procedure, restate it with the experiment-specific parameters in each section.

### 5.3 Consistent granularity

When the paper has multiple experiment sections, keep the level of detail consistent across them. Do not write the search procedure thoroughly in one section and dismiss it in one sentence in another.

### 5.4 Define concepts before use

Define every concept the first time it appears in the explainer, before using it. Do not omit concepts the paper itself defines. In particular, before presenting a table or a number, make sure every concept needed to read that number has already been defined.

## 6. Source list

Place the source list at the end of the explainer, formatted per `documenting-with-sources`. In addition to the paper under review, include every other work the explainer mentions.

## 7. Section-by-section subagent audit

A first-pass draft typically contains errors that a single re-read misses: numbers transcribed off by a digit, citation numbers mapped to the wrong reference, sentences whose translated meaning drifts from the original, citations from the paper that never made it into the explainer. Before treating the draft as done, audit it section by section with subagents.

### 7.1 Output location

Write audit results to `{cwd}/subagent-reviews/{NN-section-name}.md`, one file per section. Create the directory if it does not exist. Audits are separate artifacts from the explainer; do not put them under `reports/`.

### 7.2 Sectioning

Split the explainer into independent units that align with the paper's section structure:

- Abstract and bibliographic info (one unit)
- Each top-level section of the paper body (Introduction, Background/Related Work, Method, Experiments, Limitations, Conclusion, etc.)
- The source list at the end of the explainer

Larger sections (e.g. an Experiments section with multiple sub-experiments and tables) can be split further if a single auditor would face too much material. Keep one auditor per file.

### 7.3 Auditor brief

Spawn one general-purpose subagent per section, in parallel. The brief tells each subagent to:

1. Read the paper PDF and the corresponding section of the explainer.
2. Verify factual accuracy: claims, equations, numbers in tables and inline numbers in prose, citation-number ↔ reference correspondence.
3. Verify translation accuracy when the explainer is in a non-source language. Look for: dropped words, added implications not in the original, inappropriate word order, untranslated source-language idioms.
4. Verify formatting compliance: citation form (`[p.X, Section Y.Z]` for the paper under review, `[author-short (YYYY)]` for other works), no `**` bold decoration, quotation rules from `writing-quotation` (code-block quotes, original-translation pairing, source reference on its own line outside the block).
5. Verify terminology consistency across the section.

Each audit file uses three headings: overall assessment, findings, suggested edits. Findings point at specific lines or quoted passages in the explainer; for translation issues, quote both the source and the explainer's rendering so the synthesis step can compare them side by side.

### 7.4 Synthesis and edits

After all audits return:

1. Read each audit file in full.
2. Cross-check audit claims against the paper itself before applying them. Auditors can be wrong, and two auditors may disagree on the same fact (for example, two reviewers may map a numeric citation `[16]` to different references). When that happens, consult the paper's References list and resolve the conflict from the source.
3. Apply confirmed edits to the explainer.
4. When applying overlapping edits across sections (e.g. a citation-label change that recurs throughout), make the change consistently in every occurrence.
5. Move on once findings have been resolved — there is no need to write a separate "responses to audit" document; the audited explainer itself is the artifact.

### 7.5 Vocabulary

The artifact this skill produces is a detailed explainer, not a review. Audit outputs are reviews. Keep these terms separate in conversation with the user and in titles: do not call the explainer a "review", and do not call the audit a "detailed explainer". This separation prevents ambiguity when the user asks "update the review" partway through the workflow.
