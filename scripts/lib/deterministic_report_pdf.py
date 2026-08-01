"""Small deterministic Markdown-to-PDF renderer for checked-in audit reports."""

from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen.canvas import Canvas


PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT = 42
RIGHT = 42
TOP = 48
BOTTOM = 42
INK = HexColor("#10212D")
MUTED = HexColor("#536977")
NAVY = HexColor("#071723")
CYAN = HexColor("#0891B2")
LINE = HexColor("#D7E4EA")


def _plain_markdown(line: str) -> str:
    text = line.strip()
    text = re.sub(r"^[-*]\s+", "- ", text)
    text = re.sub(r"^\d+\.\s+", lambda match: match.group(0), text)
    text = text.replace("**", "").replace("`", "")
    if text.startswith("|") and text.endswith("|"):
        cells = [cell.strip() for cell in text.strip("|").split("|")]
        if cells and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            return ""
        text = "  |  ".join(cells)
    return text


def _wrap(text: str, font: str, size: float, width: float) -> list[str]:
    words = text.split()
    if not words:
        return []
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, font, size) <= width:
            current = candidate
            continue
        if current:
            lines.append(current)
            current = ""
        # Split only tokens that physically cannot fit (normally long paths).
        chunk = ""
        for character in word:
            candidate = chunk + character
            if chunk and stringWidth(candidate, font, size) > width:
                lines.append(chunk)
                chunk = character
            else:
                chunk = candidate
        current = chunk
    if current:
        lines.append(current)
    return lines


def render_markdown_pdf(markdown: str, output: Path, *, title: str) -> int:
    """Render stable A4 pages, returning the page count."""

    output.parent.mkdir(parents=True, exist_ok=True)
    pdf = Canvas(str(output), pagesize=A4, invariant=1, pageCompression=1)
    pdf.setTitle(title)
    pdf.setAuthor("XR School")
    page_number = 0
    y = 0.0
    in_quality_cards = False

    def begin_page() -> None:
        nonlocal page_number, y
        if page_number:
            pdf.showPage()
        page_number += 1
        pdf.setFillColor(NAVY)
        pdf.rect(0, PAGE_HEIGHT - 20, PAGE_WIDTH, 20, fill=1, stroke=0)
        pdf.setFillColor(MUTED)
        pdf.setFont("Helvetica", 7)
        pdf.drawString(LEFT, 20, "XR School - Simulation Quality Evidence")
        pdf.drawRightString(PAGE_WIDTH - RIGHT, 20, str(page_number))
        pdf.setStrokeColor(LINE)
        pdf.line(LEFT, 31, PAGE_WIDTH - RIGHT, 31)
        y = PAGE_HEIGHT - TOP

    def ensure_space(height: float) -> None:
        nonlocal y
        if y - height < BOTTOM:
            begin_page()

    begin_page()
    for raw in markdown.splitlines():
        heading = re.match(r"^(#{1,3})\s+(.+)$", raw)
        if heading:
            level = len(heading.group(1))
            text = _plain_markdown(heading.group(2))
            if level == 2:
                in_quality_cards = text == "Quality cards"
            # Page-oriented reports: every major section and quality/contribution
            # card is independently printable and reviewable.
            if y < PAGE_HEIGHT - TOP - 4 and (level <= 2 or (level == 3 and in_quality_cards)):
                begin_page()
            # Keep long audit headings on one line so copied/searchable PDF text
            # preserves exact section titles.
            size = {1: 18.0, 2: 11.5, 3: 10.0}[level]
            font = "Helvetica-Bold"
            color = NAVY if level < 3 else CYAN
            lines = _wrap(text, font, size, PAGE_WIDTH - LEFT - RIGHT)
            ensure_space(len(lines) * size * 1.25 + 12)
            pdf.setFillColor(color)
            pdf.setFont(font, size)
            for line in lines:
                pdf.drawString(LEFT, y, line)
                y -= size * 1.25
            y -= 8
            continue

        text = _plain_markdown(raw)
        if not text:
            y -= 5
            continue
        is_table = raw.lstrip().startswith("|")
        is_bullet = bool(re.match(r"^\s*(?:[-*]|\d+\.)\s+", raw))
        font = "Courier" if is_table else "Helvetica"
        size = 6.6 if is_table else 8.6
        indent = 10 if is_bullet else 0
        width = PAGE_WIDTH - LEFT - RIGHT - indent
        lines = _wrap(text, font, size, width)
        leading = size * 1.35
        ensure_space(len(lines) * leading + 4)
        pdf.setFillColor(INK)
        pdf.setFont(font, size)
        for line in lines:
            pdf.drawString(LEFT + indent, y, line)
            y -= leading
        y -= 3

    pdf.save()
    return page_number
