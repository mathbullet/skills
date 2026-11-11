#!/usr/bin/env bash
# Convert a TikZ figure to a self-contained SVG for inline embedding in an HTML document.
#
# Usage:
#   tikz-to-svg.sh <figure.tex> [out.svg]
#
# <figure.tex> holds only a tikzpicture environment; this script supplies the preamble.
# The default output is <figure>.svg next to the input.
#
# Exit status:
#   0  converted
#   65 LaTeX or pdftocairo failed (the LaTeX log is printed to stderr)
#   69 lualatex or pdftocairo (poppler) not found

set -euo pipefail

INPUT="${1:-}"
if [[ -z "$INPUT" ]]; then
  echo "usage: $0 <figure.tex> [out.svg]" >&2
  exit 64
fi
if [[ ! -f "$INPUT" ]]; then
  echo "not found: $INPUT" >&2
  exit 66
fi
OUTPUT="${2:-${INPUT%.tex}.svg}"

for cmd in lualatex pdftocairo; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "$cmd not found" >&2
    exit 69
  fi
done

NAME="$(basename "${INPUT%.tex}")"
PREFIX="$(printf '%s' "$NAME" | tr -c 'A-Za-z0-9_-' '-')-"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cat >"$WORK/figure.tex" <<'EOF'
\documentclass[tikz,border=1pt]{standalone}
\usepackage{fontspec}
\usepackage{luatexja-fontspec}
\IfFontExistsTF{Ubuntu Sans}{\setmainfont{Ubuntu Sans}}{}
\IfFontExistsTF{Noto Sans JP}{\setmainjfont{Noto Sans JP}}{}
\usetikzlibrary{arrows.meta,positioning,calc,fit,shapes.geometric}
\tikzset{every picture/.style={line width=0.8pt, line cap=rect}}
\begin{document}
\input{body.tex}
\end{document}
EOF
cp "$INPUT" "$WORK/body.tex"

if ! (cd "$WORK" && lualatex -interaction=nonstopmode -halt-on-error figure.tex >/dev/null 2>&1); then
  cat "$WORK/figure.log" >&2 2>/dev/null || true
  exit 65
fi
if ! pdftocairo -svg "$WORK/figure.pdf" "$WORK/figure.svg" >/dev/null 2>&1; then
  echo "pdftocairo failed" >&2
  exit 65
fi

# Inline SVGs share one ID namespace per HTML document, so every ID gets a per-figure prefix.
# Sizes are scaled by 1.6 so that 10pt LaTeX text matches the 16px body text.
perl -0pe '
  s/<\?xml[^>]*\?>\s*//;
  s/(<svg\b[^>]*?)\bwidth="([\d.]+)(?:pt)?"/sprintf("%swidth=\"%.1f\"", $1, $2 * 1.6)/e;
  s/(<svg\b[^>]*?)\bheight="([\d.]+)(?:pt)?"/sprintf("%sheight=\"%.1f\"", $1, $2 * 1.6)/e;
  s/<!--.*?-->\s*//gs;
  s/\bid="([^"]+)"/id="'"$PREFIX"'$1"/g;
  s/\b((?:xlink:)?href)="#([^"]+)"/$1="#'"$PREFIX"'$2"/g;
  s/url\(#([^)]+)\)/url(#'"$PREFIX"'$1)/g;
' "$WORK/figure.svg" >"$OUTPUT"
