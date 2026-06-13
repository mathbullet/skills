---
name: hermes-tweet
description: Use when the user asks for X/Twitter social-signal research, launch monitoring, trend analysis, account or post evidence, creator research, support triage, or a sourced Markdown report powered by Hermes Tweet. Follow documenting-with-sources and writing-quotation conventions when writing reports.
---

# Hermes Tweet

Use Hermes Tweet when the user needs X/Twitter evidence inside a sourced Markdown deliverable.

The default output is a social-signal report: a compact Markdown document that ties each claim to a returned post, account, trend, or endpoint result. Treat X/Twitter data as evidence, not as a source of truth by itself.

## Installation and Runtime Checks

Before live use:

1. Confirm the native Hermes Tweet plugin is installed and enabled in the Hermes runtime.
2. Confirm `XQUIK_API_KEY` is configured before live reads or actions.
3. Keep `HERMES_TWEET_ENABLE_ACTIONS` unset or false for read-only research.
4. Require `HERMES_TWEET_ENABLE_ACTIONS=true` and explicit approval for account-changing actions.

Useful install commands:

```bash
hermes plugins install Xquik-dev/hermes-tweet --enable
uv pip install --python ~/.hermes/hermes-agent/venv/bin/python hermes-tweet
```

## Workflow

1. Clarify the topic, window, language, and whether the user needs a Markdown report or a short answer.
2. Use `tweet_explore` first to find the endpoint, capability, or route.
3. Use `tweet_read` only for catalog-listed public read-only endpoints.
4. Use `tweet_action` only after the user approves the exact endpoint, method, payload, and reason.
5. Preserve returned URLs, timestamps, and handles exactly. Write "URL not verified" when a link is absent.
6. For sourced reports, follow `documenting-with-sources` for citation shape and `writing-quotation` for any quotation blocks.

## Report Shape

Use this structure unless the user asks for another one:

```markdown
# Social-Signal Report: <topic>

## Scope

- Query:
- Window:
- Source surface:

## Findings

1. <claim stated in one sentence>
   - Evidence: <source label and URL>
   - Why it matters: <one sentence>

## Caveats

- <coverage, ambiguity, or missing-data note>

## Source List

- <label>: <URL or endpoint result summary>
```

## Safety Rules

- Never ask for or reveal API keys, passwords, cookies, or TOTP secrets.
- Never pass credentials in tool arguments or write them into reports.
- Do not guess endpoint paths. Use the catalog returned by `tweet_explore`.
- Do not invent handles, post URLs, metrics, account state, trend strength, or source relationships.
- Do not use account connection, re-authentication, API key, billing, credit top-up, or support-ticket endpoints.
- Do not retry writes through alternate routes after policy, auth, or account-state errors.
- Summarize any account-changing action before calling `tweet_action`.

## Common Mistakes

- Treating a viral post as representative market evidence without caveats.
- Copying a quote without the source URL and position.
- Turning missing links into guessed profile URLs.
- Using `tweet_action` for research when `tweet_read` is enough.
- Leaving `HERMES_TWEET_ENABLE_ACTIONS=true` enabled for unattended reporting.
