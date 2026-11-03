#!/usr/bin/env bash
# Lint an HTML document against the html skill rules using headless Chrome.
#
# Usage:
#   run-lint.sh <html-file>
#
# Output:
#   Writes a JSON report to stdout:
#   {"file":...,"errors":N,"warnings":N,"violations":[{"rule","severity","line","message"}]}
#
# Exit status:
#   0  no errors (warnings may exist)
#   1  one or more errors
#   69 Chrome / Chromium not found (set CHROME to override)
#   70 the lint script failed to run inside Chrome

set -euo pipefail

INPUT="${1:-}"
if [[ -z "$INPUT" ]]; then
  echo "usage: $0 <html-file>" >&2
  exit 64
fi
if [[ ! -f "$INPUT" ]]; then
  echo "not found: $INPUT" >&2
  exit 66
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DESIGN_DIR="$SCRIPT_DIR/../design-system"

CHROME_CANDIDATES=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
  "$(command -v google-chrome || true)"
  "$(command -v chromium || true)"
  "$(command -v chromium-browser || true)"
)
if [[ -n "${CHROME:-}" ]]; then
  CHROME_CANDIDATES=("$CHROME")
fi
CHROME_BIN=""
for c in "${CHROME_CANDIDATES[@]}"; do
  if [[ -n "$c" && -x "$c" ]]; then
    CHROME_BIN="$c"
    break
  fi
done
if [[ -z "$CHROME_BIN" ]]; then
  echo "Chrome / Chromium not found. Looked at:" >&2
  for c in "${CHROME_CANDIDATES[@]}"; do
    [[ -n "$c" ]] && echo "  $c" >&2
  done
  exit 69
fi

b64() { base64 < "$1" | tr -d '\n'; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

NAME_FILE="$WORK/name"
printf '%s' "$(basename "$INPUT")" > "$NAME_FILE"

RUNNER="$WORK/runner.html"
{
  echo '<!DOCTYPE html><meta charset="utf-8"><body><script>'
  echo "window.__LINT_INPUT__ = {"
  echo "  fileName: \"$(b64 "$NAME_FILE")\","
  echo "  html: \"$(b64 "$INPUT")\","
  echo "  documentCss: \"$(b64 "$DESIGN_DIR/document.css")\","
  echo "  mathCopyJs: \"$(b64 "$DESIGN_DIR/math-copy.js")\""
  echo "};"
  echo '</script><script>'
  cat "$SCRIPT_DIR/lint-rules.js"
  echo '</script><script>LintRules.runFromInput();</script></body>'
} > "$RUNNER"

DOM="$("$CHROME_BIN" --headless=new --disable-gpu --dump-dom "file://$RUNNER" 2>/dev/null || true)"

RESULT="$(grep -oE 'LINTRESULT:[A-Za-z0-9+/=]+' <<<"$DOM" | head -n 1 | cut -d: -f2 || true)"
ERRORS="$(grep -oE 'LINTERRORS:[0-9]+' <<<"$DOM" | head -n 1 | cut -d: -f2 || true)"
if [[ -z "$RESULT" || -z "$ERRORS" ]]; then
  echo "lint script failed to run in Chrome" >&2
  exit 70
fi

printf '%s' "$RESULT" | base64 --decode
echo
[[ "$ERRORS" -eq 0 ]]
