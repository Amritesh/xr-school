#!/usr/bin/env python3
"""Generate Aditya's contribution-by-contribution improvement assessment."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.lib.deterministic_report_pdf import render_markdown_pdf
from scripts.lib.simulation_quality_reports import build_aditya_markdown


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scorecard", type=Path, default=ROOT / "reports/data/new-simulation-before-after-scorecard.json")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "output/pdf")
    args = parser.parse_args()
    markdown = build_aditya_markdown(json.loads(args.scorecard.read_text(encoding="utf-8"))).rstrip() + "\n"
    args.output_dir.mkdir(parents=True, exist_ok=True)
    md = args.output_dir / "aditya-contribution-improvement-report.md"
    pdf = args.output_dir / "aditya-contribution-improvement-report.pdf"
    md.write_text(markdown, encoding="utf-8", newline="\n")
    render_markdown_pdf(markdown, pdf, title="Aditya Contribution Improvement Assessment")
    print("Generated contribution improvement report for all 23 contributions")


if __name__ == "__main__":
    main()
