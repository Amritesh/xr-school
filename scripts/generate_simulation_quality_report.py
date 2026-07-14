#!/usr/bin/env python3
"""Generate the XR School implemented-simulation management quality report."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from reportlab.lib.colors import HexColor, Color
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
CARDS_PATH = ROOT / "reports/data/implemented-simulation-quality-cards.json"
OUTPUT_DIR = ROOT / "output/pdf"
PDF_PATH = OUTPUT_DIR / "xr-school-implemented-simulations-quality-report.pdf"
MARKDOWN_PATH = OUTPUT_DIR / "xr-school-implemented-simulations-quality-report.md"
SCREENSHOT_DIR = ROOT / "tmp/pdfs/quality-audit/screenshots"

PAGE_W, PAGE_H = A4
NAVY = HexColor("#071723")
NAVY_2 = HexColor("#0D2636")
CYAN = HexColor("#22D3EE")
BLUE = HexColor("#0EA5E9")
INK = HexColor("#10212D")
MUTED = HexColor("#536977")
PALE = HexColor("#EEF5F8")
LINE = HexColor("#D7E4EA")
WHITE = HexColor("#FFFFFF")
GREEN = HexColor("#16A34A")
AMBER = HexColor("#D97706")
RED = HexColor("#DC2626")

WEIGHTS = {
    "education": 20,
    "integrity": 15,
    "interactivity": 15,
    "visuals": 15,
    "audio": 10,
    "usability": 10,
    "stability": 10,
    "deployment": 5,
}

LABELS = {
    "education": "Educational effectiveness",
    "integrity": "Content / scientific integrity",
    "interactivity": "Learner interactivity",
    "visuals": "Visual and asset quality",
    "audio": "Narration and sound",
    "usability": "Usability, accessibility, comfort",
    "stability": "Performance and stability",
    "deployment": "Deployment readiness",
}


def total(card: dict) -> int:
    return sum(card["scores"].values())


def band(score: int) -> tuple[str, Color]:
    if score >= 85:
        return "Pilot candidate", GREEN
    if score >= 70:
        return "Promising Internal QA", BLUE
    if score >= 55:
        return "Needs focused improvement", AMBER
    return "Rebuild before pilot", RED


def validate(cards: list[dict]) -> None:
    if len(cards) != 13:
        raise ValueError(f"Expected 13 quality cards, found {len(cards)}")
    slugs = [card["slug"] for card in cards]
    if len(set(slugs)) != 13:
        raise ValueError("Quality-card slugs must be unique")
    for card in cards:
        if set(card["scores"]) != set(WEIGHTS):
            raise ValueError(f"Incomplete score dimensions for {card['slug']}")
        for key, value in card["scores"].items():
            if not isinstance(value, int) or not 0 <= value <= WEIGHTS[key]:
                raise ValueError(f"Invalid {key} score for {card['slug']}: {value}")
        if len(card["strengths"]) != 3 or len(card["risks"]) != 3:
            raise ValueError(f"Each card requires three strengths and risks: {card['slug']}")
        if not card["summary"] or not card["action"]:
            raise ValueError(f"Missing management writing for {card['slug']}")


def wrapped_lines(text: str, font: str, size: float, width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if not current or stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_text(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font: str = "Helvetica",
    size: float = 10,
    color: Color = INK,
    leading: float | None = None,
    max_lines: int | None = None,
) -> float:
    leading = leading or size * 1.35
    lines = wrapped_lines(text, font, size, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(
    pdf: canvas.Canvas,
    items: Iterable[str],
    x: float,
    y: float,
    width: float,
    size: float = 8.2,
    color: Color = INK,
) -> float:
    for item in items:
        lines = wrapped_lines(item, "Helvetica", size, width - 13)
        pdf.setFillColor(CYAN)
        pdf.circle(x + 2.5, y + 3, 2, fill=1, stroke=0)
        pdf.setFillColor(color)
        pdf.setFont("Helvetica", size)
        for index, line in enumerate(lines):
            pdf.drawString(x + 12, y, line)
            y -= size * 1.32
        y -= 5
    return y


def rounded_box(pdf: canvas.Canvas, x: float, y: float, width: float, height: float, fill: Color, stroke: Color | None = None) -> None:
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke or fill)
    pdf.roundRect(x, y, width, height, 10, fill=1, stroke=1 if stroke else 0)


def page_footer(pdf: canvas.Canvas, page_number: int, dark: bool = False) -> None:
    color = HexColor("#A9CBD8") if dark else MUTED
    pdf.setStrokeColor(HexColor("#234353") if dark else LINE)
    pdf.line(38, 31, PAGE_W - 38, 31)
    pdf.setFont("Helvetica", 7.5)
    pdf.setFillColor(color)
    pdf.drawString(38, 18, "XR School - Implemented Simulation Quality Audit - 14 July 2026")
    pdf.drawRightString(PAGE_W - 38, 18, str(page_number))


def section_header(pdf: canvas.Canvas, kicker: str, title: str, subtitle: str, page_number: int) -> None:
    pdf.setFillColor(WHITE)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(NAVY)
    pdf.rect(0, PAGE_H - 128, PAGE_W, 128, fill=1, stroke=0)
    pdf.setFillColor(CYAN)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(40, PAGE_H - 43, kicker.upper())
    draw_text(pdf, title, 40, PAGE_H - 69, PAGE_W - 80, "Helvetica-Bold", 24, WHITE, 27, 2)
    draw_text(pdf, subtitle, 40, PAGE_H - 112, PAGE_W - 80, "Helvetica", 9, HexColor("#B9D8E4"), 12, 2)
    page_footer(pdf, page_number)


def draw_cover(pdf: canvas.Canvas, cards: list[dict], page_number: int) -> None:
    pdf.setFillColor(NAVY)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(NAVY_2)
    pdf.circle(PAGE_W - 40, PAGE_H - 120, 180, fill=1, stroke=0)
    pdf.setFillColor(CYAN)
    pdf.circle(PAGE_W - 65, PAGE_H - 95, 68, fill=1, stroke=0)
    pdf.setFillColor(NAVY)
    pdf.circle(PAGE_W - 65, PAGE_H - 95, 49, fill=1, stroke=0)

    pdf.setFillColor(CYAN)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(42, PAGE_H - 86, "XR SCHOOL / MANAGEMENT QUALITY AUDIT")
    draw_text(pdf, "Implemented Simulation Quality Report", 42, PAGE_H - 145, 455, "Helvetica-Bold", 34, WHITE, 38, 3)
    draw_text(
        pdf,
        "A conservative, evidence-backed portfolio assessment of educational value, real-time visual quality, narration, interactivity, accessibility, stability and deployment readiness.",
        42,
        PAGE_H - 268,
        450,
        "Helvetica",
        12,
        HexColor("#C8E0E9"),
        17,
    )

    average = sum(total(card) for card in cards) / len(cards)
    stats = [
        ("13", "launchable simulations"),
        (f"{average:.1f}", "portfolio average / 100"),
        ("612", "repository tests passing"),
        ("85", "packaged narration clips"),
    ]
    x = 42
    for value, label in stats:
        rounded_box(pdf, x, 300, 118, 82, NAVY_2, HexColor("#23495B"))
        pdf.setFillColor(WHITE)
        pdf.setFont("Helvetica-Bold", 24)
        pdf.drawString(x + 14, 344, value)
        draw_text(pdf, label, x + 14, 326, 92, "Helvetica", 8, HexColor("#AFCEDA"), 10, 2)
        x += 128

    rounded_box(pdf, 42, 154, PAGE_W - 84, 94, HexColor("#0B2130"), HexColor("#214556"))
    pdf.setFillColor(CYAN)
    pdf.setFont("Helvetica-Bold", 9)
    pdf.drawString(58, 225, "AUDIT POSITION")
    draw_text(
        pdf,
        "All simulations remain Internal QA. Scores are product-readiness indicators based on repository and live-deployment evidence; they are not proof of classroom learning outcomes or signed Quest acceptance.",
        58,
        205,
        PAGE_W - 116,
        "Helvetica",
        10.5,
        WHITE,
        15,
        4,
    )
    page_footer(pdf, page_number, dark=True)


def draw_executive_summary(pdf: canvas.Canvas, cards: list[dict], page_number: int) -> None:
    section_header(
        pdf,
        "Executive view",
        "Strong learning architecture; uneven production readiness",
        "The portfolio has meaningful educational interactions, but visual delivery, narration consistency and release verification are not yet uniform.",
        page_number,
    )
    average = sum(total(card) for card in cards) / len(cards)
    counts = {"Pilot candidate": 0, "Promising Internal QA": 0, "Needs focused improvement": 0, "Rebuild before pilot": 0}
    for card in cards:
        counts[band(total(card))[0]] += 1

    x = 40
    summary_stats = [
        (f"{average:.1f}", "Average score", BLUE),
        (str(counts["Pilot candidate"]), "Pilot candidate", GREEN),
        (str(counts["Promising Internal QA"]), "Promising Internal QA", BLUE),
        (str(counts["Needs focused improvement"]), "Needs focused improvement", AMBER),
    ]
    for value, label, color in summary_stats:
        rounded_box(pdf, x, 620, 122, 78, PALE, LINE)
        pdf.setFillColor(color)
        pdf.setFont("Helvetica-Bold", 24)
        pdf.drawString(x + 13, 662, value)
        draw_text(pdf, label, x + 13, 644, 96, "Helvetica", 8, MUTED, 10, 2)
        x += 130

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(40, 580, "What management should know")
    positives = [
        "Educational design is the strongest layer: prediction, action, evidence and assessment are present across most lessons.",
        "The shared WebXR framework, comfort controls and 612-test repository provide a credible engineering base.",
        "Solubility is the clearest controlled-pilot candidate; pollination and states of matter are next in line after rendering acceptance.",
    ]
    concerns = [
        "Solar System is currently blocked in production by a runtime error before the 3D canvas mounts.",
        "Digestive System requests 11 organ GLBs that all return 404, forcing a lower-fidelity procedural fallback.",
        "Only five simulations have packaged narration; eight depend on device-specific browser speech.",
        "No simulation has school outcome evidence or signed Quest acceptance, and Colour Adventure is missing from the canonical release registry.",
    ]
    rounded_box(pdf, 40, 360, 245, 195, HexColor("#F0FDF4"), HexColor("#BBE8C6"))
    pdf.setFillColor(GREEN)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(55, 530, "PORTFOLIO STRENGTHS")
    draw_bullets(pdf, positives, 55, 507, 212, 8.7)
    rounded_box(pdf, 305, 360, 250, 195, HexColor("#FFF7ED"), HexColor("#F2D2A7"))
    pdf.setFillColor(AMBER)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(320, 530, "RELEASE RISKS")
    draw_bullets(pdf, concerns, 320, 507, 218, 8.3)

    rounded_box(pdf, 40, 95, PAGE_W - 80, 230, NAVY, NAVY)
    pdf.setFillColor(CYAN)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(56, 299, "RECOMMENDED PORTFOLIO DECISION")
    draw_text(
        pdf,
        "Do not present the complete portfolio as school-ready. Fix the two release blockers, verify the blank post-entry frames on real browsers and Quest, standardise narration, then pilot Solubility and Pollination in a controlled teacher-led setting.",
        56,
        275,
        PAGE_W - 112,
        "Helvetica-Bold",
        12,
        WHITE,
        16,
        4,
    )
    draw_text(
        pdf,
        "A staged release protects trust: one or two validated flagship lessons are more valuable than thirteen uneven experiences promoted at the same maturity.",
        56,
        198,
        PAGE_W - 112,
        "Helvetica",
        10,
        HexColor("#BBD6E1"),
        14,
        3,
    )


def draw_ranked_portfolio(pdf: canvas.Canvas, cards: list[dict], page_number: int) -> None:
    section_header(
        pdf,
        "Portfolio comparison",
        "Ranked management scorecard",
        "Scores combine eight weighted dimensions. A high educational score cannot fully offset a broken live route or missing production assets.",
        page_number,
    )
    ranked = sorted(cards, key=total, reverse=True)
    x_positions = [40, 68, 338, 390, 520]
    headers = ["#", "Simulation", "Score", "Band", "Evidence"]
    pdf.setFillColor(NAVY)
    pdf.rect(40, 666, PAGE_W - 80, 30, fill=1, stroke=0)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.setFillColor(WHITE)
    for x, header in zip(x_positions, headers):
        pdf.drawString(x, 677, header)

    y = 638
    for index, card in enumerate(ranked, 1):
        row_fill = WHITE if index % 2 else HexColor("#F5F9FB")
        pdf.setFillColor(row_fill)
        pdf.rect(40, y - 21, PAGE_W - 80, 40, fill=1, stroke=0)
        pdf.setStrokeColor(LINE)
        pdf.line(40, y - 21, PAGE_W - 40, y - 21)
        score = total(card)
        label, color = band(score)
        pdf.setFillColor(MUTED)
        pdf.setFont("Helvetica-Bold", 8)
        pdf.drawString(43, y, str(index))
        draw_text(pdf, card["title"], 68, y + 5, 250, "Helvetica-Bold", 8, INK, 10, 2)
        pdf.setFillColor(color)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawString(340, y - 1, str(score))
        draw_text(pdf, label, 390, y + 4, 115, "Helvetica", 7.5, color, 9, 2)
        draw_text(pdf, card["evidenceConfidence"].replace(" internal evidence", ""), 520, y + 4, 40, "Helvetica", 7, MUTED, 9, 2)
        y -= 40

    rounded_box(pdf, 40, 75, PAGE_W - 80, 55, PALE, LINE)
    draw_text(
        pdf,
        "Interpretation: 85+ = controlled-pilot candidate; 70-84 = promising Internal QA; 55-69 = focused improvement; below 55 = rebuild before pilot.",
        55,
        105,
        PAGE_W - 110,
        "Helvetica",
        8.5,
        MUTED,
        12,
        3,
    )


def draw_priorities(pdf: canvas.Canvas, page_number: int) -> None:
    section_header(
        pdf,
        "Management action plan",
        "Sequence investment by trust and learning impact",
        "Resolve release blockers first, then standardise shared quality, then invest in richer assets and outcome validation.",
        page_number,
    )
    priorities = [
        ("P0", "Restore broken production experiences", "Fix Solar System's roundRect runtime failure and 403 resources. Restore all 11 Digestive System GLBs. Re-audit both routes before any demonstration.", RED),
        ("P0", "Verify real rendering across devices", "Reproduce the blank automated post-entry frames for Pollination, Breathing, Force and Acid/Base on Chrome, classroom PCs and Quest. Treat visibility as a release gate.", RED),
        ("P1", "Standardise narration", "Create packaged, curriculum-reviewed voice assets for the eight simulations using browser speech. Keep the singleton sound manager as the global playback owner.", AMBER),
        ("P1", "Repair release governance", "Register Colour Adventure in the canonical module contracts or remove it from the launchable list. One source of truth must determine what management can call implemented.", AMBER),
        ("P1", "Pilot two flagships", "After Quest acceptance, run teacher-led pilots for Solubility and Pollination. Capture completion, misconception correction, teacher effort and student engagement evidence.", BLUE),
        ("P2", "Raise asset richness selectively", "Invest first where realism teaches: anatomy, laboratory glassware/liquids, respiratory mechanics and deformation. Avoid decorative assets that do not improve understanding.", BLUE),
    ]
    y = 675
    for code, title, body, color in priorities:
        rounded_box(pdf, 40, y - 82, PAGE_W - 80, 72, WHITE, LINE)
        rounded_box(pdf, 54, y - 49, 43, 27, color, color)
        pdf.setFillColor(WHITE)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawCentredString(75.5, y - 40, code)
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(112, y - 29, title)
        draw_text(pdf, body, 112, y - 47, PAGE_W - 170, "Helvetica", 8.5, MUTED, 11, 3)
        y -= 88


def draw_card(pdf: canvas.Canvas, card: dict, index: int, page_number: int) -> None:
    score = total(card)
    label, band_color = band(score)
    pdf.setFillColor(WHITE)
    pdf.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    pdf.setFillColor(NAVY)
    pdf.rect(0, PAGE_H - 132, PAGE_W, 132, fill=1, stroke=0)
    pdf.setFillColor(CYAN)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(40, PAGE_H - 40, f"QUALITY CARD {index:02d} / 13   |   {card['grade']}   |   {card['subject']}".upper())
    draw_text(pdf, card["title"], 40, PAGE_H - 72, 410, "Helvetica-Bold", 22, WHITE, 25, 2)
    pdf.setFillColor(band_color)
    pdf.circle(PAGE_W - 72, PAGE_H - 70, 39, fill=1, stroke=0)
    pdf.setFillColor(WHITE)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawCentredString(PAGE_W - 72, PAGE_H - 68, str(score))
    pdf.setFont("Helvetica", 7)
    pdf.drawCentredString(PAGE_W - 72, PAGE_H - 82, "OUT OF 100")

    rounded_box(pdf, 40, 656, 157, 25, band_color, band_color)
    pdf.setFillColor(WHITE)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawCentredString(118.5, 665, label.upper())
    rounded_box(pdf, 208, 656, 164, 25, PALE, LINE)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica-Bold", 7.5)
    pdf.drawCentredString(290, 665, card["evidenceConfidence"].upper())
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 7.5)
    pdf.drawRightString(PAGE_W - 40, 665, "Release maturity: INTERNAL QA")

    rounded_box(pdf, 40, 579, PAGE_W - 80, 61, PALE, LINE)
    pdf.setFillColor(BLUE)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(54, 622, "MANAGEMENT SUMMARY")
    draw_text(pdf, card["summary"], 54, 605, PAGE_W - 108, "Helvetica", 9.2, INK, 12.5, 3)

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(40, 548, "Weighted quality dimensions")
    bar_x = 40
    bar_w = 230
    y = 520
    for key in WEIGHTS:
        value = card["scores"][key]
        maximum = WEIGHTS[key]
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica", 7.6)
        pdf.drawString(bar_x, y + 9, LABELS[key])
        pdf.setFillColor(MUTED)
        pdf.setFont("Helvetica-Bold", 7.6)
        pdf.drawRightString(bar_x + bar_w, y + 9, f"{value} / {maximum}")
        pdf.setFillColor(HexColor("#E7EFF3"))
        pdf.roundRect(bar_x, y - 2, bar_w, 6, 3, fill=1, stroke=0)
        ratio = value / maximum
        color = GREEN if ratio >= 0.85 else BLUE if ratio >= 0.7 else AMBER if ratio >= 0.5 else RED
        pdf.setFillColor(color)
        pdf.roundRect(bar_x, y - 2, bar_w * ratio, 6, 3, fill=1, stroke=0)
        y -= 39

    right_x = 302
    right_w = PAGE_W - right_x - 40
    pdf.setFillColor(GREEN)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(right_x, 548, "WHAT IS WORKING")
    y_right = draw_bullets(pdf, card["strengths"], right_x, 528, right_w, 8.3)
    pdf.setStrokeColor(LINE)
    pdf.line(right_x, y_right - 1, PAGE_W - 40, y_right - 1)
    pdf.setFillColor(RED)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(right_x, y_right - 24, "GAPS AND RISKS")
    draw_bullets(pdf, card["risks"], right_x, y_right - 45, right_w, 8.3)

    rounded_box(pdf, 40, 61, PAGE_W - 80, 82, NAVY, NAVY)
    pdf.setFillColor(CYAN)
    pdf.setFont("Helvetica-Bold", 8)
    pdf.drawString(55, 119, "NEXT MANAGEMENT ACTION")
    draw_text(pdf, card["action"], 55, 99, PAGE_W - 110, "Helvetica-Bold", 9.4, WHITE, 13, 4)
    page_footer(pdf, page_number)


def draw_methodology(pdf: canvas.Canvas, page_number: int) -> None:
    section_header(
        pdf,
        "Method and limitations",
        "How to interpret these quality scores",
        "This audit is deliberately conservative: absent evidence is treated as unverified, and live failures override implementation ambition.",
        page_number,
    )
    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, 676, "Weighted rubric")
    y = 650
    for key, weight in WEIGHTS.items():
        pdf.setFillColor(PALE if int(y) % 2 else WHITE)
        pdf.rect(40, y - 17, 300, 25, fill=1, stroke=0)
        pdf.setFillColor(INK)
        pdf.setFont("Helvetica", 8.3)
        pdf.drawString(50, y - 2, LABELS[key])
        pdf.setFont("Helvetica-Bold", 8.3)
        pdf.drawRightString(328, y - 2, f"{weight} points")
        y -= 27

    pdf.setFillColor(INK)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(370, 676, "Evidence used")
    evidence = [
        "Production route, canvas, console and screenshot audit",
        "Launch registry and canonical simulation modules",
        "Viewer, lesson, world and scientific-model source",
        "Packaged audio and public asset inventory",
        "Dedicated regression, pedagogy and model tests",
        "Current release maturity and deployment status",
    ]
    draw_bullets(pdf, evidence, 370, 650, 180, 8.3)

    rounded_box(pdf, 40, 292, PAGE_W - 80, 115, HexColor("#FFF7ED"), HexColor("#F0D3AA"))
    pdf.setFillColor(AMBER)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(55, 382, "LIMITATIONS")
    limitations = [
        "No controlled classroom learning outcomes, teacher workload data or signed Quest acceptance runs were available.",
        "Automated headless rendering can expose cross-browser problems but does not replace physical-headset inspection.",
        "Narration technical quality was measurable; voice naturalness and child comprehension were not formally listener-tested.",
        "Scores compare the current portfolio and should be recalculated after fixes, asset delivery and field evidence.",
    ]
    draw_bullets(pdf, limitations, 55, 360, PAGE_W - 110, 8.5)

    rounded_box(pdf, 40, 92, PAGE_W - 80, 165, NAVY, NAVY)
    pdf.setFillColor(CYAN)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(56, 231, "AUDIT-SPECIFIC FINDINGS")
    findings = [
        "The public launch list contains 13 simulations, while canonical release contracts recognise 12; Colour Adventure is the unmatched entry.",
        "The solar production route stops with 'roundRect is not a function' before mounting the 3D canvas.",
        "The digestive production route returns 404 for all 11 authored GLB requests and uses procedural fallback geometry.",
        "Packaged narration exists for Pollination, Circuit, States of Matter, Food Sources and Solubility; the remaining eight use device speech fallback.",
    ]
    draw_bullets(pdf, findings, 56, 208, PAGE_W - 112, 8.6, WHITE)


def write_markdown(cards: list[dict]) -> None:
    ranked = sorted(cards, key=total, reverse=True)
    average = sum(total(card) for card in cards) / len(cards)
    lines = [
        "# XR School Implemented Simulation Quality Report",
        "",
        "**Audit date:** 14 July 2026",
        "",
        "**Scope:** 13 launchable simulations",
        "",
        "**Release position:** All experiences are Internal QA; none is school-validated.",
        "",
        "## Executive summary",
        "",
        f"The portfolio average is **{average:.1f}/100**. One simulation is a controlled-pilot candidate, eleven are promising Internal QA experiences, and one requires focused improvement before release.",
        "",
        "The strongest layer is educational architecture: most lessons require action and evidence rather than passive viewing. The largest risks are the broken Solar System production route, 11 missing Digestive System GLBs, inconsistent narration coverage, unverified blank post-entry frames in automated rendering, and the mismatch between 13 public launch entries and 12 canonical modules.",
        "",
        "## Ranked portfolio",
        "",
        "| Rank | Simulation | Score | Band |",
        "|---:|---|---:|---|",
    ]
    for index, card in enumerate(ranked, 1):
        lines.append(f"| {index} | {card['title']} | {total(card)} | {band(total(card))[0]} |")
    lines.extend([
        "",
        "## Quality cards",
        "",
    ])
    for card in ranked:
        lines.extend([
            f"### {card['title']} - {total(card)}/100",
            "",
            f"**Band:** {band(total(card))[0]}",
            "",
            f"**Audience:** {card['grade']} - {card['subject']}",
            "",
            f"**Evidence confidence:** {card['evidenceConfidence']}",
            "",
            card["summary"],
            "",
            "| Dimension | Score | Maximum |",
            "|---|---:|---:|",
        ])
        for key, maximum in WEIGHTS.items():
            lines.append(f"| {LABELS[key]} | {card['scores'][key]} | {maximum} |")
        lines.extend(["", "**Strengths**", ""])
        lines.extend(f"- {item}" for item in card["strengths"])
        lines.extend(["", "**Gaps and risks**", ""])
        lines.extend(f"- {item}" for item in card["risks"])
        lines.extend(["", f"**Management action:** {card['action']}", ""])
    lines.extend([
        "## Method and limitations",
        "",
        "Scores combine educational effectiveness (20), content/scientific integrity (15), learner interactivity (15), visual and asset quality (15), narration and sound (10), usability/accessibility/comfort (10), performance and stability (10), and deployment readiness (5).",
        "",
        "The requested video-quality category was omitted because these are real-time simulations, not pre-rendered videos. Its useful intent is covered by visual and asset quality.",
        "",
        "No controlled classroom outcomes, teacher workload studies or signed Quest acceptance runs were available. These are internal product-readiness scores, not evidence of measured learning gain.",
    ])
    MARKDOWN_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_pdf(cards: list[dict]) -> None:
    pdf = canvas.Canvas(str(PDF_PATH), pagesize=A4, pageCompression=1, invariant=1)
    pdf.setTitle("XR School Implemented Simulation Quality Report")
    pdf.setAuthor("XR School / OpenAI Codex quality audit")
    page = 1
    draw_cover(pdf, cards, page)
    pdf.showPage(); page += 1
    draw_executive_summary(pdf, cards, page)
    pdf.showPage(); page += 1
    draw_ranked_portfolio(pdf, cards, page)
    pdf.showPage(); page += 1
    draw_priorities(pdf, page)
    pdf.showPage(); page += 1
    for index, card in enumerate(sorted(cards, key=total, reverse=True), 1):
        draw_card(pdf, card, index, page)
        pdf.showPage(); page += 1
    draw_methodology(pdf, page)
    pdf.save()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    cards = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
    validate(cards)
    write_markdown(cards)
    write_pdf(cards)
    print(f"Generated {PDF_PATH}")
    print(f"Generated {MARKDOWN_PATH}")


if __name__ == "__main__":
    main()
