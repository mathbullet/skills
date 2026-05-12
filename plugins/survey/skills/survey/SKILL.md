---
name: survey
description: Investigate a topic across papers, articles, social-media posts, and industry signals, then deliver an indexed Markdown report. Use when the user asks to investigate, survey, gather sources, build an index, collect evidence, round up references, or otherwise wants a thorough cross-source roundup on a specific topic. Depends on documenting-with-sources and writing-quotation.
---

# Survey

Gather sources from the web, papers, social media, and industry on a specific topic, and produce an indexed Markdown report.

This skill follows the shared sourced-writing conventions defined in `documenting-with-sources`. Read `documenting-with-sources` before drafting.

## Quality criteria

Apply to every source.

- Prefer trustworthy sources (peer-reviewed papers > official blogs > major industry media > personal blogs).
- If the author is an individual, list their affiliation and role. If unknown, look it up.
- For papers, in addition to bibliographic info (authors, affiliations, venue, year), include citation count.
- Always attach a URL.
- Always attach a date.
- Treat official documentation and third-party articles as different reliability tiers. Do not mix them; the reader must be able to tell which is which.

## Prose structure: Assertion-Evidence form

Write the body in Assertion-Evidence form — claim first, then evidence.

1. Prose: the writer states the claim or summary in their own words first.
2. Immediately after, a code-block quotation from the source backs up the claim, formatted per `writing-quotation`.
3. On the line after the closing fence, place the source reference `[source-name (YYYY/MM)]`.

The reader grasps "what is being said" first, then checks "what is the basis". The reverse order (quotation first, claim later) is forbidden — the reader cannot tell what the quotation is for until they have read past it.

Bad example (quotation first):

```
The standard recipe of pretraining on huge corpora and then running classical preference-label RLHF is now widely treated as obsolete.
```

[industry-tracker (2026/03)]

The mainstream has shifted to a modular post-training stack.

Good example (claim first):

The classical RLHF pipeline (human preference labels → reward model → PPO) is no longer used in leading models; it has been replaced by a modular stack that separates concerns.

```
The standard recipe of pretraining on huge corpora and then running classical preference-label RLHF is now widely treated as obsolete. Every leading model released in the past year uses a different post-training stack.
```

[industry-tracker (2026/03)]

## Source-reference label

Within the `[label (YYYY/MM), location]` structure defined in `documenting-with-sources`, the survey skill fills the label slot with the publication or source name (media name, site name, etc.). The location is omitted when it cannot be pinned down.

## Heading-content alignment

Section headings and the items placed under them must match exactly.

- If a heading is "human-side guardrails", only human conduct and discipline goes underneath. Tooling and CI/CD belong under a separate heading.
- If a heading is "failure cases", do not mix in success stories or recommendations.
- If a source spans multiple angles, either split it across the relevant sections, or place it under the most appropriate one and add an explicit note about the other angles.
- Before finalising, walk every heading and check that everything underneath it actually belongs there.

## Output destination

Write the deliverable to `{CWD}/reports/` as a `.md` file. Create the directory if it does not exist. Sub-agents that emit intermediate artefacts use the same directory.

## Workflow

1. From the user's request, identify the claim or hypothesis and the collection scope.
2. Design search queries for the scope (in multiple languages where appropriate).
3. Dispatch sub-agents to investigate (one per angle, in parallel).
4. Consolidate the sub-agent outputs; the main agent assembles the final version.
5. Write out the deliverable to `{CWD}/reports/` as a `.md` file.

## Sub-agent delegation rules

When delegating to sub-agents, follow these.

- Split by angle and dispatch in parallel (e.g. "papers & academia", "media & blogs", "social media", "industry signals").
- Give each sub-agent the quality criteria and the conventions from `documenting-with-sources`. Re-emphasise "no fabricated associations or interpretations" specifically — sub-agents are particularly prone to drifting toward the calling-conversation context and inventing connections.
- Sub-agent output is not the final deliverable. The main agent performs:
  - Deduplication.
  - Information completion (filling in missing affiliations, citation counts, etc. via additional lookups).
  - Structural unification (tables, consistent section structure).
  - Separation of criticism from supporting evidence.
  - Explicit listing of investigation limits (information that could not be retrieved, unverified URLs, etc.).
  - Removal of fabricated associations (see the corresponding section in `documenting-with-sources`).
  - Heading-content alignment check (see above).

## Deliverable structure

```
# Survey of {topic}

Date: YYYY-MM-DD
Scope: {scope description}

## Table of Contents

1. [{angle 1}](#1-angle-1-slug)
2. [{angle 2}](#2-angle-2-slug)
...
N. [Criticism & concerns](#n-criticism-concerns)
N+1. [Overall assessment](#n1-overall-assessment)
N+2. [Investigation limits](#n2-investigation-limits)

## 1. {angle 1} (e.g. academic papers)
## 2. {angle 2} (e.g. media coverage)
## 3. {angle 3} (e.g. social-media reactions)
## 4. {angle 4} (e.g. industry signals)
## N. Criticism & concerns
## N+1. Overall assessment
## N+2. Investigation limits
```

Adjust the section layout for the topic.

## Table-of-contents requirements

Always place a table of contents at the top of the report, directly after the metadata block and before the body. Writing the report without a ToC is forbidden.

- If there are ten or more sections, or fifteen or more individual items (papers, articles, etc.), use a two-level ToC. Level 1 is the section name; level 2 is the section's main items (paper titles, article headlines, ...).
- For short reports (five or fewer sections, few items per section) a single-level ToC is fine.
- Provide anchor links. Use the renderer's slug rules (lowercased, spaces → hyphens, special characters dropped) for the link targets.
- Even when the slug rule is uncertain, write the link rather than dropping it; let the renderer slugify.
- ToC entries and section headings must match word for word. No abbreviation or paraphrase.
