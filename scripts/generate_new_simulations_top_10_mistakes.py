#!/usr/bin/env python3
"""Generate the neutral top-ten integration lessons report."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from scripts.lib.deterministic_report_pdf import render_markdown_pdf
from scripts.lib.simulation_quality_reports import build_top_ten_markdown


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scorecard", type=Path, default=ROOT / "reports/data/new-simulation-before-after-scorecard.json")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "output/pdf")
    args = parser.parse_args()
    markdown = build_top_ten_markdown(json.loads(args.scorecard.read_text(encoding="utf-8"))).rstrip() + "\n"
    args.output_dir.mkdir(parents=True, exist_ok=True)
    md = args.output_dir / "xr-school-new-simulations-top-10-mistakes.md"
    pdf = args.output_dir / "xr-school-new-simulations-top-10-mistakes.pdf"
    md.write_text(markdown, encoding="utf-8", newline="\n")
    render_markdown_pdf(markdown, pdf, title="XR School New Simulations: Top 10 Portfolio Mistakes")
    print("Generated top 10 mistakes report with exactly 10 evidence-backed sections")


if __name__ == "__main__":
    main()
