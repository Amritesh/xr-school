#!/usr/bin/env python3
"""Fail if committed quality reports are stale or structurally incomplete."""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf"
FILES = (
    "xr-school-implemented-simulations-quality-report.md",
    "xr-school-implemented-simulations-quality-report.pdf",
    "xr-school-new-simulations-top-10-mistakes.md",
    "xr-school-new-simulations-top-10-mistakes.pdf",
    "aditya-contribution-improvement-report.md",
    "aditya-contribution-improvement-report.pdf",
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory)
        commands = (
            [sys.executable, "scripts/generate_simulation_quality_report.py", "--output-dir", str(target)],
            [sys.executable, "scripts/generate_new_simulations_top_10_mistakes.py", "--output-dir", str(target)],
            [sys.executable, "scripts/generate_aditya_contribution_report.py", "--output-dir", str(target)],
        )
        for command in commands:
            subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
        stale = [name for name in FILES if not (OUTPUT / name).exists() or (OUTPUT / name).read_bytes() != (target / name).read_bytes()]
        if stale:
            raise SystemExit("Stale simulation quality reports: " + ", ".join(stale))

    for name in FILES:
        if name.endswith(".pdf"):
            reader = PdfReader(OUTPUT / name)
            if not reader.pages:
                raise SystemExit(f"Empty PDF: {name}")
            for page in reader.pages:
                if abs(float(page.mediabox.width) - 595.2756) > 0.02 or abs(float(page.mediabox.height) - 841.8898) > 0.02:
                    raise SystemExit(f"Non-A4 page in {name}")
                annotations = page.get("/Annots") or []
                if any(item.get_object().get("/Subtype") == "/Widget" for item in annotations):
                    raise SystemExit(f"Interactive widget in static report {name}")

    manifest_path = ROOT / "reports/data/simulation-quality-pdf-visual-qa.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    records = {item["file"]: item for item in manifest["reports"]}
    for name in (item for item in FILES if item.endswith(".pdf")):
        record = records.get(name)
        if not record or record.get("sha256") != digest(OUTPUT / name):
            raise SystemExit(f"Visual-QA record is missing or stale for {name}")
    print("All six report artifacts are deterministic, current, A4, static, and visually QA-recorded")


if __name__ == "__main__":
    main()
