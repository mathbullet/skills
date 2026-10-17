# /// script
# requires-python = ">=3.9"
# dependencies = ["pymupdf>=1.24"]
# ///
import argparse
import json
import re
import sys
from pathlib import Path

import fitz

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
        if r.is_infinite:
            continue
        if r.y0 < y_top - 1 or r.y1 > y_bottom + 1:
            continue
        if (r.width * r.height) > 0.8 * page_area:
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
        page = doc[pno]
        for b in page.get_text("blocks"):
            x0, y0, x1, y1, txt = b[0], b[1], b[2], b[3], b[4]
            m = CAPTION_RE.match(txt.strip())
            if not m:
                continue
            caps.append(
                {
                    "label": m.group(1),
                    "num": int(m.group(2)),
                    "page_index": pno,
                    "rect": (x0, y0, x1, y1),
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
    is_table = cap["label"] == "Table"
    if is_table and hrules < 2:
        return None
    x0 = min(r.x0 for r in rects)
    y0 = min(r.y0 for r in rects)
    x1 = max(r.x1 for r in rects)
    y1 = max(r.y1 for r in rects)
    clip = fitz.Rect(x0 - pad, y0 - pad, x1 + pad, y1 + pad)
    clip = clip & page.rect
    if clip.width < 30 or clip.height < 10:
        return None
    return clip


def extract(pdf_path, out_dir, dpi):
    doc = fitz.open(pdf_path)
    base = Path(pdf_path).stem
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)

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
        rec = {
            "label": c["label"],
            "num": c["num"],
            "page": c["page_index"] + 1,
            "file": fname,
            "clip": [round(v, 1) for v in (clip.x0, clip.y0, clip.x1, clip.y1)],
            "px": [pix.width, pix.height],
        }
        manifest.append(rec)
        print(
            f"{c['label']} {c['num']:>2}  page {rec['page']:>2}  "
            f"-> {fname}  ({pix.width}x{pix.height})"
        )

    (out_dir / f"{base}-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2)
    )
    print(f"\n{len(manifest)} images written to {out_dir}/")
    print(f"manifest: {out_dir / (base + '-manifest.json')}")
    return manifest


def main():
    ap = argparse.ArgumentParser(description="論文PDFから図・表を画像として抽出する")
    ap.add_argument("pdf", help="入力PDFのパス")
    ap.add_argument(
        "--out",
        default="images-from-papers",
        help="出力ディレクトリ(既定: ./images-from-papers)",
    )
    ap.add_argument("--dpi", type=int, default=300, help="描画解像度(既定: 300)")
    args = ap.parse_args()
    if not Path(args.pdf).is_file():
        print(f"PDF が見つかりません: {args.pdf}", file=sys.stderr)
        sys.exit(1)
    extract(args.pdf, args.out, args.dpi)


if __name__ == "__main__":
    main()
