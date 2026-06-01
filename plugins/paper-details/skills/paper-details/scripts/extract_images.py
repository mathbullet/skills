# /// script
# requires-python = ">=3.9"
# dependencies = ["pymupdf>=1.24"]
# ///
"""Extract figures and tables from a paper PDF as images, keyed by caption.

Usage:
    uv run extract_images.py <PDF path> [--out DIR] [--dpi N]

For each "Figure N" / "Table N" caption, the region directly above the caption
(the bounding box of vector drawings, rules, and embedded images) is clip-rendered
at the given DPI. Figures and tables are usually drawn as vectors with no embedded
raster, so this renders the region rather than pulling out an embedded image.

Output defaults to <CWD>/images-from-papers/ as {pdf-stem}-fig{N}.png /
{pdf-stem}-table{N}.png, plus a {pdf-stem}-manifest.json listing what was extracted.

Captions are accepted only as "<label> <number> <capitalised description>", and only
when figure/table-like content sits directly above them (a table needs horizontal
rules; a figure needs drawings or images). This rejects in-text mentions such as
"Table 1 is the main result matrix." When a page holds several floats, each caption's
upper bound is the bottom of the nearest caption above it on the same page.
"""
import argparse
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

CAPTION_RE = re.compile(r"^(Figure|Table)\s+(\d+)\s+[A-Z(]")


def _is_hrule(rect, page_width):
    return rect.width > min(40, page_width * 0.1) and rect.height < 3.0


def _meaningful_rects(page, y_top, y_bottom):
    page_rect = page.rect
    page_area = page_rect.width * page_rect.height
    rects = []
    hrules = 0
    for d in page.get_drawings():
        r = d["rect"]
        # Rules and box borders are zero-width/zero-height lines (is_empty == True),
        # but they are needed to bound the region, so only infinite rects are dropped.
        if r.is_infinite:
            continue
        if r.y0 < y_top - 1 or r.y1 > y_bottom + 1:
            continue
        if (r.width * r.height) > 0.8 * page_area:  # page-wide background fill
            continue
        rects.append(r)
        if _is_hrule(r, page_rect.width):
            hrules += 1
    for img in page.get_image_info():
        r = fitz.Rect(img["bbox"])
        if r.is_empty:
            continue
        if r.y0 < y_top - 1 or r.y1 > y_bottom + 1:
            continue
        rects.append(r)
    return rects, hrules


def find_captions(doc):
    caps = []
    for pno in range(len(doc)):
        for b in doc[pno].get_text("blocks"):
            m = CAPTION_RE.match(b[4].strip())
            if m:
                caps.append(
                    {
                        "label": m.group(1),
                        "num": int(m.group(2)),
                        "page_index": pno,
                        "rect": (b[0], b[1], b[2], b[3]),
                    }
                )
    return caps


def compute_region(page, cap, same_page_caps, pad=4.0):
    cx0, cy0, cx1, cy1 = cap["rect"]
    upper = 0.0
    for other in same_page_caps:
        oy1 = other["rect"][3]
        if oy1 <= cy0 - 1 and oy1 > upper:
            upper = oy1
    rects, hrules = _meaningful_rects(page, upper, cy0)
    if not rects:
        return None
    if cap["label"] == "Table" and hrules < 2:
        return None
    # Bound with min/max, not Rect union (|): the union drops zero-area lines, so a
    # rule-only table or a border-only figure box would yield an empty bounding box.
    x0 = min(r.x0 for r in rects)
    y0 = min(r.y0 for r in rects)
    x1 = max(r.x1 for r in rects)
    y1 = max(r.y1 for r in rects)
    clip = fitz.Rect(x0 - pad, y0 - pad, x1 + pad, y1 + pad) & page.rect
    if clip.width < 30 or clip.height < 10:
        return None
    return clip


def extract(pdf_path, out_dir, dpi):
    doc = fitz.open(pdf_path)
    base = Path(pdf_path).stem
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    mat = fitz.Matrix(dpi / 72.0, dpi / 72.0)

    caps = find_captions(doc)
    by_page = {}
    for c in caps:
        by_page.setdefault(c["page_index"], []).append(c)

    manifest = []
    seen = set()
    for c in sorted(caps, key=lambda c: (c["page_index"], c["rect"][1])):
        page = doc[c["page_index"]]
        clip = compute_region(page, c, by_page[c["page_index"]])
        if clip is None:
            continue
        key = (c["label"], c["num"])
        if key in seen:
            continue
        seen.add(key)
        kind = "fig" if c["label"] == "Figure" else "table"
        fname = f"{base}-{kind}{c['num']}.png"
        pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
        pix.save(str(out_dir / fname))
        manifest.append(
            {
                "label": c["label"],
                "num": c["num"],
                "page": c["page_index"] + 1,
                "file": fname,
                "clip": [round(v, 1) for v in (clip.x0, clip.y0, clip.x1, clip.y1)],
                "px": [pix.width, pix.height],
            }
        )
        print(
            f"{c['label']} {c['num']:>2}  page {c['page_index'] + 1:>2}  "
            f"-> {fname}  ({pix.width}x{pix.height})"
        )

    (out_dir / f"{base}-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2)
    )
    print(f"\n{len(manifest)} images written to {out_dir}/")
    return manifest


def main():
    ap = argparse.ArgumentParser(
        description="Extract figures and tables from a paper PDF as images"
    )
    ap.add_argument("pdf", help="input PDF path")
    ap.add_argument(
        "--out",
        default="images-from-papers",
        help="output directory (default: ./images-from-papers)",
    )
    ap.add_argument("--dpi", type=int, default=300, help="render resolution (default: 300)")
    args = ap.parse_args()
    if not Path(args.pdf).is_file():
        print(f"PDF not found: {args.pdf}", file=sys.stderr)
        sys.exit(1)
    extract(args.pdf, args.out, args.dpi)


if __name__ == "__main__":
    main()
