---
name: explain
description: Conventions for writing a Markdown explainer that walks the reader through a concept or system. Lays out term-list formatting, Mermaid diagram rules, granularity expectations, and a fixed five-part structure. Use when the user asks for an explainer, a concept write-up, a glossary section, or otherwise wants a system or idea documented for another reader.
---

# Explainer Document Conventions

## Term handling

- Put a term list at the top of the document in table form (`| Term | Description |`). Every specialised term used in the body must be defined in this list at first occurrence.
- A term-list entry defines what the term *is* in one or two sentences. The functional or behavioural detail goes in the body, not in the term list.
- Even widely recognised proper nouns (industry-standard product names, infrastructure components, etc.) get defined here. Assume the reader does not know them.
- When defining a compound term, define the constituent words too. If the compound has three words, give all three their own entries — readers cannot be expected to infer one from another.

## Diagram conventions

- Use Mermaid for diagrams. Do not use ASCII art.
- Every node label is a term that exists in the term list. Do not introduce a new term inside a diagram.
- Do not put `<br/>` inside a Mermaid node. Many renderers display the literal HTML tag. If a line break is needed, separate with ` / ` or shorten the text to fit one line.
- For diagrams with four or more nodes, or where any label is long, use `graph TD` (top-down). `graph LR` (left-right) collapses long-label graphs into an unreadable horizontal strip.

## Granularity of the description

- Do not gloss details with vague language. Subjects, objects, and verbs must be explicit.
- A phrase like "A uses B to do X" must specify what A is and why A is needed for X.
- Avoid vague verbs like "receives" or "passes". Spell out who does what to bring the state about (e.g. "receives the address" → "the platform allocates the address automatically").
- Do not require the reader to make a leap between steps. Every step's causal connection to the next is explicit.
- Describe the mechanism in its general form first; tie it to specific named instances afterwards as "in case X, ...". Do not anchor the whole description to a single proper-noun example.

## Structure

1. Term list
2. Background (why this thing is necessary, or what problem it addresses)
3. Mechanism (how it works — includes the diagrams)
4. Concrete steps (commands, procedures, or worked examples)
5. Current state (where things stand today — for ongoing systems)
