# mathbullet/skills [[🇯🇵](./README-ja.md)]

Claude Code skills by mathbullet, distributed as a plugin marketplace.

The six skills focus on writing well-sourced Markdown deliverables and on producing explainers (either as Markdown or as a self-contained HTML page). They cross-reference each other: `survey` and `paper-details` build on top of `documenting-with-sources`, which in turn defers to `writing-quotation` for the formatting of quotation blocks.

## Install

```
/plugin marketplace add mathbullet/skills
/plugin install writing-quotation@skills
/plugin install documenting-with-sources@skills
/plugin install survey@skills
/plugin install paper-details@skills
/plugin install explain@skills
/plugin install explain-via-html@skills
```

The skills auto-trigger based on the user's request — there are no slash commands to remember. Install only the ones you want.

## Plugins

| Plugin | Purpose |
|---|---|
| [writing-quotation](plugins/writing-quotation/skills/writing-quotation/SKILL.md) | Formatting rules for quoting external sources inside a Markdown document. |
| [documenting-with-sources](plugins/documenting-with-sources/skills/documenting-with-sources/SKILL.md) | Common conventions for sourced-writing deliverables (citation, in-text references, source list, ban on fabricated associations). |
| [survey](plugins/survey/skills/survey/SKILL.md) | Multi-source investigation skill that turns a topic into an indexed Markdown report. |
| [paper-details](plugins/paper-details/skills/paper-details/SKILL.md) | Produce a faithful detailed Markdown explainer of an academic paper (description, not critical review). |
| [explain](plugins/explain/skills/explain/SKILL.md) | Conventions for writing a Markdown explainer of a concept or system. |
| [explain-via-html](plugins/explain-via-html/skills/explain-via-html/SKILL.md) | Author an explainer as a self-contained single-page HTML file instead of a wall of Markdown. |

## Dependencies between skills

- `survey` and `paper-details` follow the shared conventions in `documenting-with-sources`. Install `documenting-with-sources` whenever you install either of those.
- `documenting-with-sources` defers to `writing-quotation` for the formatting of quotation blocks. Install `writing-quotation` whenever you install `documenting-with-sources`.
- `survey`, `paper-details`, and `explain-via-html` also reference `writing-quotation` directly.

The cross-references are by skill name and resolve once both skills are installed in the same Claude Code instance.

## License

MIT
