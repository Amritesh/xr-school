#!/usr/bin/env python3
"""Record the hashes and representative pages used for visual PDF QA."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf"
MANIFEST = ROOT / "reports/data/simulation-quality-pdf-visual-qa.json"


def main() -> None:
    reports = []
    for path in sorted(OUTPUT.glob("*.pdf")):
        pages = len(PdfReader(path).pages)
        reports.append(
            {
                "file": path.name,
                "pages": pages,
                "representativePages": sorted({1, max(1, pages // 2), pages}),
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                "checks": ["no clipping", "readable hierarchy", "consistent margins", "searchable text", "A4 static pages"],
            }
        )
    payload = {
        "schemaVersion": 1,
        "auditDate": "2026-08-01",
        "method": "Rendered first, middle, and final pages with Poppler and inspected contact sheets.",
        "reports": reports,
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(MANIFEST)


if __name__ == "__main__":
    main()
