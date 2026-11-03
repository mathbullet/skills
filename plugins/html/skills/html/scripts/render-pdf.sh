#!/usr/bin/env bash
# Render an HTML file (typically under html-expl/) to PDF using headless Chrome.
#
# Usage:
#   render-pdf.sh <html-file>
#
# Output:
#   Writes <basename>.pdf next to the input HTML.
#
# Requirements:
#   - macOS with Google Chrome (or Chrome Canary / Chromium) installed in
#     /Applications/.
#   - Chrome 132+ recommended for --no-pdf-header-footer; older builds will
#     simply ignore the flag and may include automatic headers/footers.

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

INPUT_ABS="$(cd "$(dirname "$INPUT")" && pwd)/$(basename "$INPUT")"
OUTPUT="${INPUT_ABS%.html}.pdf"

CHROME_CANDIDATES=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
)
CHROME=""
for c in "${CHROME_CANDIDATES[@]}"; do
  if [[ -x "$c" ]]; then
    CHROME="$c"
    break
  fi
done
if [[ -z "$CHROME" ]]; then
  echo "Chrome / Chromium not found in standard macOS locations." >&2
  echo "Looked at:" >&2
  for c in "${CHROME_CANDIDATES[@]}"; do
    echo "  $c" >&2
  done
  exit 69
fi

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="$OUTPUT" \
  "file://$INPUT_ABS"

echo "rendered: $OUTPUT"
