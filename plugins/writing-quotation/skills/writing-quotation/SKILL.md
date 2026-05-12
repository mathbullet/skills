---
name: writing-quotation
description: Formatting rules for quoting external sources (papers, articles, web pages, prompt templates) inside a Markdown document. Quotations always live in fenced code blocks (never the `>` blockquote syntax), original and translation sit together, source references go on the line after the fence, and bare numeric references like `[1]` are forbidden. Other sourced-writing skills (survey, paper-details, ...) reference this skill. Consult whenever you write or edit a quotation block.
---

# Writing Quotation

Formatting rules for quoting external sources inside a Markdown document. Other skills that produce sourced deliverables (`survey`, `paper-details`, and similar) reference this one.

## 1. Why quote the original

A summary alone does not let the reader judge whether the writer's reading of the source is correct. Placing the original alongside lets the reader cross-check the writer's interpretation against the source itself. Quotations and prose (the writer's own summary or interpretation) must stay visually and structurally distinct.

## 2. Quotations always go inside code blocks

Quote external sources inside a fenced code block, regardless of content type — prose, prompt templates, code, XML-tagged text, anything. Do not use the blockquote syntax (`>`).

## 3. Structure of a quotation block

A quotation block has the following shape.

- Opening code fence
- Original text
- One blank line
- Translation into the writer's working language (only when the source is in a different language)
- Closing code fence
- The source reference `[label (YYYY/MM), location]` on the line immediately after the closing fence

Rules:

- Original and translation sit together inside the same code block.
- One blank line separates them.
- Do not insert a horizontal rule (`---`) between original and translation.
- Do not move the translation outside the code block. Do not put it in parentheses next to the original.
- The source reference belongs on the line after the closing fence as an independent line. Never inside the code block.

## 4. Examples

### 4.1 Same-language quotation

When the source and the writer share a working language, no translation is needed:

```
Composability is the property by which a system's behaviour is determined by the behaviour of its parts and the rules under which they are combined.
```

[example-handbook (2026/04), Section 2.1]

### 4.2 Cross-language quotation

When the source is in a language other than the writer's working language, place the translation as a separate paragraph inside the same code block:

```
Le sens d'une expression complexe est déterminé par le sens de ses constituants et par les règles qui les combinent.

The meaning of a complex expression is determined by the meaning of its constituents and the rules that combine them.
```

[example-handbook (2026/04), Section 2.1]

### 4.3 Prompt-template quotation

Prompt templates use the same rule. Wrap inside a code block; place the source reference after the fence.

```
Human: You are an assistant who summarises research papers. The paper is enclosed in <paper> tags. Produce a summary enclosed in <summary> tags. <paper>P</paper> Assistant:
```

[example-prompt-library (2026/04), template 03]

### 4.4 Short-form role markers in translations

When translating a prompt template (Human/Assistant style), the translation side may abbreviate role markers to reduce cognitive load and to make it easier to tell original from translation at a glance.

- `Human:` → `H:`
- `Assistant:` → `A:`

Keep the original side unabbreviated (`Human:` / `Assistant:` in full). The trailing `Assistant:` at the very end of a chat template (the position that signals where the response begins) carries structural meaning and may be left as `Assistant:` on the translation side as well.

## 5. Source-reference format

Format: `[label (YYYY/MM), location]`.

- `label`: an identifier for the source. The calling skill decides the convention (author short-form, publication name, etc.).
- `(YYYY/MM)`: year and month. Do not include the day. If only the year is known, use `(YYYY)`.
- `location`: where in the source the cited passage lives (`p.4`, `Section 3.1`, `Figure 2`, `(15)`, `opening`, `final paragraph`, etc.). Omit when it cannot be pinned down.

If there is no location, write `[label (YYYY/MM)]`.

### 5.1 No bare numeric references

Do not use bare numeric references like `[1]` or `[2]`. The reader has to bounce between text and bibliography to learn what each number means. Use a label-based form that identifies the subject directly inside the text.

## 6. Anti-patterns

Anti-pattern 1 — using blockquote syntax (`>`):

A line starting with `>` is not acceptable for an external quotation. Always wrap inside a code block (see Section 2).

Anti-pattern 2 — translation outside the code block:

```
Composability is the property by which ...
```

The translation appears here as prose, outside the code block. [example-handbook (2026/04), Section 2.1]

Fix: place original and translation inside the same code block, separated by one blank line.

Anti-pattern 3 — translation in parentheses next to the original:

```
Composability is the property by which ... (Inline translation in parentheses ...)
```

[example-handbook (2026/04), Section 2.1]

Fix: original and translation are independent paragraphs inside the same code block, separated by one blank line.

Anti-pattern 4 — source reference inside the code block:

```
Composability is the property by which ...

Translation here ...
[example-handbook (2026/04), Section 2.1]
```

Fix: the source reference goes on the line after the closing fence as an independent line.

Anti-pattern 5 — bare numeric source reference:

```
Composability is the property by which ...

Translation here ...
```

[1]

Fix: use a label that identifies the source directly (author short-form or publication name).

Anti-pattern 6 — horizontal rule between original and translation:

```
Composability is the property by which ...
---
Translation here ...
```

[example-handbook (2026/04), Section 2.1]

Fix: separate original and translation with one blank line. No horizontal rule.

## 7. Scope

This skill defines the format of quotations only. *When* to quote (Assertion-Evidence ordering, what label to use, etc.) is decided by the calling skill.

- `survey`: Assertion-Evidence ordering — state the claim in prose first, then back it up with a quotation. The `label` slot holds the publication or source name.
- `paper-details`: References to the paper under review omit the author and use position only (`[p.X, Section Y.Z]`). References to other works use `[author-short (YYYY/MM)]`.
