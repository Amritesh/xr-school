#!/usr/bin/env python3
"""Generate the complete 36-class portfolio report from audited data."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.lib.deterministic_report_pdf import render_markdown_pdf
from scripts.lib.simulation_quality_reports import build_portfolio_markdown


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cards", type=Path, default=ROOT / "reports/data/implemented-simulation-quality-cards.json")
    parser.add_argument("--evidence", type=Path, default=ROOT / "reports/data/implemented-simulation-quality-evidence.json")
    parser.add_argument("--scorecard", type=Path, default=ROOT / "reports/data/new-simulation-before-after-scorecard.json")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "output/pdf")
    args = parser.parse_args()

    cards = json.loads(args.cards.read_text(encoding="utf-8"))
    evidence = json.loads(args.evidence.read_text(encoding="utf-8"))
    scorecard = json.loads(args.scorecard.read_text(encoding="utf-8"))
    markdown = build_portfolio_markdown(cards, evidence, scorecard).rstrip() + "\n"
    args.output_dir.mkdir(parents=True, exist_ok=True)
    markdown_path = args.output_dir / "xr-school-implemented-simulations-quality-report.md"
    pdf_path = args.output_dir / "xr-school-implemented-simulations-quality-report.pdf"
    markdown_path.write_text(markdown, encoding="utf-8", newline="\n")
    pages = render_markdown_pdf(markdown, pdf_path, title="XR School Implemented Simulation Quality Report")
    print(f"Generated {pages}-page portfolio report from 36 quality cards and 23 contribution rows")


if __name__ == "__main__":
    main()
