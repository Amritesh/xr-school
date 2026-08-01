#!/usr/bin/env python3
"""Render representative PDF pages into contact sheets for visual QA."""

from __future__ import annotations

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output/pdf"
TARGET = ROOT / "tmp/pdfs/quality-audit"


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    for pdf in sorted(SOURCE.glob("*.pdf")):
        page_count = len(PdfReader(pdf).pages)
        selections = sorted({1, max(1, page_count // 2), page_count})
        rendered: list[Image.Image] = []
        for number in selections:
            prefix = TARGET / f"{pdf.stem}-page-{number}"
            subprocess.run(
                ["pdftoppm", "-f", str(number), "-l", str(number), "-singlefile", "-scale-to", "900", "-png", str(pdf), str(prefix)],
                check=True,
                capture_output=True,
            )
            image = Image.open(prefix.with_suffix(".png")).convert("RGB")
            rendered.append(image)
        label_height = 34
        width = sum(image.width for image in rendered)
        height = max(image.height for image in rendered) + label_height
        sheet = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(sheet)
        x = 0
        for number, image in zip(selections, rendered, strict=True):
            sheet.paste(image, (x, label_height))
            draw.text((x + 8, 9), f"{pdf.name} - page {number}/{page_count}", fill="black")
            x += image.width
        result = TARGET / f"{pdf.stem}-contact-sheet.png"
        sheet.save(result)
        print(result)


if __name__ == "__main__":
    main()
