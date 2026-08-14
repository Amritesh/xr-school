"""Shared deterministic primitives for XR School quality reports.

The TypeScript validators own audit semantics.  This module repeats the small
set of fail-closed structural checks needed to ensure a PDF can never be
generated from a partial portfolio or contribution scorecard.
"""

from __future__ import annotations

import re
import statistics
from html import escape
from pathlib import Path
from typing import Any, Mapping, Sequence


QUALITY_WEIGHTS: dict[str, int] = {
    "education": 20,
    "integrity": 15,
    "interactivity": 15,
    "visuals": 15,
    "audio": 10,
    "usability": 10,
    "stability": 10,
    "deployment": 5,
}

QUALITY_LABELS: dict[str, str] = {
    "education": "Educational effectiveness",
    "integrity": "Content / scientific integrity",
    "interactivity": "Learner interactivity",
    "visuals": "Visual and asset quality",
    "audio": "Narration and sound",
    "usability": "Usability, accessibility, comfort",
    "stability": "Performance and stability",
    "deployment": "Deployment readiness",
}

PR8_HEAD = "621dfb61b39a4c49e8abb46ce60c54ea3d044479"

_ASCII_REPLACEMENTS = str.maketrans(
    {
        "\u00a0": " ",
        "\u00d7": "x",
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2015": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "-",
        "\u2026": "...",
        "\u2212": "-",
        "\u2260": "!=",
    }
)


def ascii_text(value: object) -> str:
    """Return stable PDF-safe ASCII text without replacement glyphs."""

    translated = str(value).translate(_ASCII_REPLACEMENTS)
    return translated.encode("ascii", "replace").decode("ascii").replace("?", "?")


def quality_total(scores: Mapping[str, int]) -> int:
    return sum(scores[key] for key in QUALITY_WEIGHTS)


def quality_band(score: int) -> str:
    if score >= 85:
        return "Pilot candidate"
    if score >= 70:
        return "Promising internal QA"
    if score >= 55:
        return "Needs focused improvement"
    return "Rebuild before pilot"


def _require_mapping(value: object, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise ValueError(f"{label} must be an object")
    return value


def _require_sequence(value: object, label: str) -> Sequence[Any]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes, bytearray)):
        raise ValueError(f"{label} must be an array")
    return value


def _validate_scores(value: object, label: str) -> None:
    scores = _require_mapping(value, label)
    if set(scores) != set(QUALITY_WEIGHTS):
        raise ValueError(f"{label} must contain all eight rubric dimensions")
    for key, maximum in QUALITY_WEIGHTS.items():
        score = scores[key]
        if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= maximum:
            raise ValueError(f"{label}.{key} must be an integer from 0 to {maximum}")


def validate_report_inputs(
    cards_value: object,
    evidence_value: object,
    scorecard_value: object,
) -> None:
    """Fail closed unless the complete audited release datasets are present."""

    cards = _require_sequence(cards_value, "quality cards")
    if len(cards) != 36:
        raise ValueError(f"Expected 36 quality cards, found {len(cards)}")
    card_slugs: list[str] = []
    for index, item in enumerate(cards):
        card = _require_mapping(item, f"quality card {index + 1}")
        slug = card.get("slug")
        if not isinstance(slug, str) or not slug:
            raise ValueError(f"quality card {index + 1}.slug must be non-empty")
        card_slugs.append(slug)
        _validate_scores(card.get("scores"), f"quality card {slug}.scores")
    if len(set(card_slugs)) != 36:
        raise ValueError("Quality-card slugs must be unique")

    evidence = _require_mapping(evidence_value, "portfolio evidence")
    simulations = _require_sequence(evidence.get("simulations"), "portfolio evidence.simulations")
    if len(simulations) != 36:
        raise ValueError(f"Expected 36 evidence records, found {len(simulations)}")
    evidence_slugs = [
        _require_mapping(record, f"evidence record {index + 1}").get("slug")
        for index, record in enumerate(simulations)
    ]
    if set(evidence_slugs) != set(card_slugs) or len(set(evidence_slugs)) != 36:
        raise ValueError("Evidence records must match the 36 quality-card slugs exactly")

    scorecard = _require_mapping(scorecard_value, "contribution scorecard")
    if scorecard.get("pr") != 8 or scorecard.get("headSha") != PR8_HEAD:
        raise ValueError("Contribution scorecard must be pinned to immutable PR #8 evidence")
    comparisons = _require_sequence(scorecard.get("comparisons"), "contribution scorecard.comparisons")
    if len(comparisons) != 23:
        raise ValueError(f"Expected 23 contribution comparisons, found {len(comparisons)}")
    pr_slugs: list[str] = []
    canonical_slugs: list[str] = []
    integrations: list[str] = []
    for index, item in enumerate(comparisons):
        comparison = _require_mapping(item, f"contribution comparison {index + 1}")
        pr_slug = comparison.get("prSlug")
        canonical_slug = comparison.get("canonicalSlug")
        if not isinstance(pr_slug, str) or not pr_slug:
            raise ValueError(f"contribution comparison {index + 1}.prSlug must be non-empty")
        if not isinstance(canonical_slug, str) or canonical_slug not in card_slugs:
            raise ValueError(f"contribution comparison {pr_slug}.canonicalSlug must reference a released card")
        pr_slugs.append(pr_slug)
        canonical_slugs.append(canonical_slug)
        integrations.append(str(comparison.get("integration")))
        baseline = _require_mapping(comparison.get("baseline"), f"contribution comparison {pr_slug}.baseline")
        post = _require_mapping(comparison.get("postIntegration"), f"contribution comparison {pr_slug}.postIntegration")
        _validate_scores(baseline.get("scores"), f"contribution comparison {pr_slug}.baseline.scores")
        _validate_scores(post.get("scores"), f"contribution comparison {pr_slug}.postIntegration.scores")
    if len(set(pr_slugs)) != 23 or len(set(canonical_slugs)) != 23:
        raise ValueError("Contribution identities must be unique")
    if integrations.count("new-class") != 22 or integrations.count("existing-enhancement") != 1:
        raise ValueError("Contribution scorecard must contain 22 new classes and one existing enhancement")


def safe_filename_part(value: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", ascii_text(value).lower()).strip("-")


def _markdown_cell(value: object) -> str:
    return ascii_text(value).replace("|", "\\|").replace("\n", " ")


def _strings(value: object, label: str) -> list[str]:
    values = _require_sequence(value, label)
    result = [ascii_text(item).strip() for item in values]
    if not result or any(not item for item in result):
        raise ValueError(f"{label} must contain non-empty text")
    return result


def _evidence_reference_paths(comparison: Mapping[str, Any]) -> list[str]:
    post = _require_mapping(comparison.get("postIntegration"), "postIntegration")
    evidence = _require_sequence(post.get("evidence"), "postIntegration.evidence")
    references: list[str] = []
    for item in evidence:
        reference = _require_mapping(item, "postIntegration.evidence item").get("ref")
        if isinstance(reference, str) and reference and reference not in references:
            references.append(ascii_text(reference))
    return references


def _format_delta(delta: int) -> str:
    return f"+{delta}" if delta >= 0 else str(delta)


def _band_counts(cards: Sequence[Mapping[str, Any]]) -> dict[str, int]:
    result = {
        "Pilot candidate": 0,
        "Promising internal QA": 0,
        "Needs focused improvement": 0,
        "Rebuild before pilot": 0,
    }
    for card in cards:
        result[quality_band(quality_total(_require_mapping(card["scores"], "scores")))] += 1
    return result


def build_portfolio_markdown(
    cards_value: object,
    evidence_value: object,
    scorecard_value: object,
) -> str:
    validate_report_inputs(cards_value, evidence_value, scorecard_value)
    cards = [dict(_require_mapping(item, "quality card")) for item in _require_sequence(cards_value, "quality cards")]
    evidence = _require_mapping(evidence_value, "portfolio evidence")
    portfolio = _require_mapping(evidence.get("portfolio"), "portfolio evidence.portfolio")
    scorecard = _require_mapping(scorecard_value, "contribution scorecard")
    comparisons = [
        _require_mapping(item, "contribution comparison")
        for item in _require_sequence(scorecard.get("comparisons"), "contribution scorecard.comparisons")
    ]
    ranked = sorted(
        cards,
        key=lambda card: (-quality_total(_require_mapping(card["scores"], "scores")), ascii_text(card["title"]).lower()),
    )
    totals = [quality_total(_require_mapping(card["scores"], "scores")) for card in cards]
    average = statistics.fmean(totals)
    bands = _band_counts(cards)
    maturity = _require_mapping(portfolio.get("evidenceMaturityDistribution"), "evidence maturity distribution")
    dimension_averages = {
        key: statistics.fmean(_require_mapping(card["scores"], "scores")[key] for card in cards)
        for key in QUALITY_WEIGHTS
    }
    priority_dimensions = sorted(
        QUALITY_WEIGHTS,
        key=lambda key: (dimension_averages[key] / QUALITY_WEIGHTS[key], key),
    )[:3]
    audit_date = ascii_text(evidence.get("auditDate", "not recorded"))
    lines = [
        "# XR School Implemented Simulation Quality Report",
        "",
        f"**Audit date:** {audit_date}",
        "",
        "**Scope:** 36 released simulations",
        "",
        f"**Portfolio average:** {average:.1f}/100",
        "",
        f"**Evidence maturity:** {int(maturity.get('internalQA', 0))} internal QA; {int(maturity.get('deviceVerified', 0))} device verified; {int(maturity.get('classroomVerified', 0))} classroom verified",
        "",
        "**Audit position:** Released means publicly launchable. Released does not mean school-validated, Quest-verified, classroom-verified, or proven to improve learning outcomes.",
        "",
        "## Executive summary",
        "",
        f"The released portfolio contains 36 canonical simulations. Its evidence-backed product-indicator average is **{average:.1f}/100**: {bands['Pilot candidate']} pilot candidates, {bands['Promising internal QA']} promising internal-QA classes, {bands['Needs focused improvement']} needing focused improvement, and {bands['Rebuild before pilot']} requiring rebuild before pilot.",
        "",
        f"Repository evidence records {int(portfolio.get('narrationCues', 0))} narration cues, {int(portfolio.get('packagedNarrationClips', 0))} packaged narration clips, {int(portfolio.get('missingNarrationFiles', 0))} missing narration files, and {int(portfolio.get('assets', 0))} declared assets. These are implementation indicators, not learner-outcome measurements.",
        "",
        "Quest and classroom evidence are absent: no signed physical-device acceptance runs or controlled classroom studies are represented in this audit. Every class therefore remains at internal QA evidence maturity.",
        "",
        "## Ranked portfolio",
        "",
        "| Rank | Simulation | Canonical slug | Score | Band | Evidence maturity |",
        "|---:|---|---|---:|---|---|",
    ]
    for index, card in enumerate(ranked, 1):
        score = quality_total(_require_mapping(card["scores"], "scores"))
        lines.append(
            f"| {index} | {_markdown_cell(card['title'])} | `{_markdown_cell(card['slug'])}` | {score} | {quality_band(score)} | {_markdown_cell(card.get('evidenceMaturity', 'internalQA'))} |"
        )
    lines.extend(
        [
            "",
            "## Portfolio priorities",
            "",
            "Priorities are derived from the three lowest average rubric attainment ratios across the complete 36-card dataset.",
            "",
        ]
    )
    for index, key in enumerate(priority_dimensions, 1):
        lines.append(
            f"{index}. **{QUALITY_LABELS[key]}:** portfolio mean {dimension_averages[key]:.1f}/{QUALITY_WEIGHTS[key]}. Address the card-level evidence gaps and next actions before raising evidence maturity."
        )
    lines.extend(
        [
            "4. **Physical-device acceptance:** run the documented Quest comfort, controller, narration, cleanup, and performance checks; current signed run count is 0.",
            "5. **Classroom evidence:** collect teacher workflow and learner-comprehension evidence without converting internal QA scores into outcome claims; current study count is 0.",
            "",
            "## Quality cards",
            "",
        ]
    )
    for card in ranked:
        scores = _require_mapping(card["scores"], "scores")
        score = quality_total(scores)
        lines.extend(
            [
                f"### {ascii_text(card['title'])} - {score}/100",
                "",
                f"**Canonical slug:** `{ascii_text(card['slug'])}`",
                "",
                f"**Route:** `{ascii_text(card.get('route', ''))}`",
                "",
                f"**Publication status:** {ascii_text(card.get('publicationStatus', 'released'))}",
                "",
                f"**Evidence maturity:** {ascii_text(card.get('evidenceMaturity', 'internalQA'))}",
                "",
                f"**Band:** {quality_band(score)}",
                "",
                f"**Audience:** {ascii_text(card.get('grade', ''))} - {ascii_text(card.get('subject', ''))}",
                "",
                ascii_text(card.get("summary", "")),
                "",
                "| Dimension | Score | Maximum |",
                "|---|---:|---:|",
            ]
        )
        for key, maximum in QUALITY_WEIGHTS.items():
            lines.append(f"| {QUALITY_LABELS[key]} | {scores[key]} | {maximum} |")
        lines.extend(["", "**Strengths**", ""])
        lines.extend(f"- {item}" for item in _strings(card.get("strengths"), f"{card['slug']}.strengths"))
        lines.extend(["", "**Gaps and risks**", ""])
        lines.extend(f"- {item}" for item in _strings(card.get("risks"), f"{card['slug']}.risks"))
        lines.extend(["", f"**Next action:** {ascii_text(card.get('action', ''))}", ""])

    lines.extend(
        [
            "## Contribution appendix",
            "",
            "This appendix maps every PR #8 contribution to its canonical released class. Scores compare the immutable PR head with the integrated internal-QA implementation.",
            "",
            "| PR slug | Canonical slug | Before | After | Delta | Main remediation | Remaining risk |",
            "|---|---|---:|---:|---:|---|---|",
        ]
    )
    for comparison in comparisons:
        baseline = _require_mapping(comparison["baseline"], "baseline")
        post = _require_mapping(comparison["postIntegration"], "postIntegration")
        before = quality_total(_require_mapping(baseline["scores"], "baseline.scores"))
        after = quality_total(_require_mapping(post["scores"], "postIntegration.scores"))
        remediations = _strings(post.get("remediation"), "postIntegration.remediation")
        risks = _strings(post.get("remainingRisks"), "postIntegration.remainingRisks")
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{_markdown_cell(comparison['prSlug'])}`",
                    f"`{_markdown_cell(comparison['canonicalSlug'])}`",
                    str(before),
                    str(after),
                    _format_delta(after - before),
                    _markdown_cell(remediations[0]),
                    _markdown_cell(risks[0]),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Rubric, evidence method, and limitations",
            "",
            "### Weighted rubric",
            "",
            "| Dimension | Weight |",
            "|---|---:|",
        ]
    )
    lines.extend(f"| {QUALITY_LABELS[key]} | {weight} |" for key, weight in QUALITY_WEIGHTS.items())
    lines.extend(
        [
            "",
            "### Evidence method",
            "",
            "Scores are computed from canonical definitions, declared stage/action/evidence/assessment counts, narration and asset manifests, focused behavior tests, production-build inclusion, browser-contract observations, and immutable PR-head evidence references.",
            "",
            "### Limitations",
            "",
            "- Scores are product indicators, not grades for a contributor and not evidence of measured learning gain.",
            "- Released does not mean school-validated. Publication status and evidence maturity are separate fields.",
            "- Quest and classroom evidence are absent. Browser/build evidence cannot replace physical-headset or teacher-led acceptance.",
            "- Scores must be recalculated after material implementation changes or new signed evidence.",
            "",
        ]
    )
    return "\n".join(lines)


TOP_TEN_MISTAKES: tuple[dict[str, str], ...] = (
    {
        "title": "Unsupported release and evidence claims",
        "example": "At immutable PR head 621dfb61, apps/api/src/index.ts assigned status: 'released' and evidenceConfidenceLevel: 'expertDesigned' without a separate maturity record.",
        "impact": "All 23 contributions appeared release-ready despite 0 signed Quest runs and 0 classroom studies.",
        "remediation": "The integrated registry and quality datasets store publicationStatus and evidenceMaturity separately, and every released contribution remains internalQA.",
        "prevention": "Store and display publicationStatus and evidenceMaturity independently.",
    },
    {
        "title": "Competing sources of truth",
        "example": "PR-local SIMULATIONS in apps/api/src/index.ts, route pages, homepage lists, and viewerNameMap in scripts/validate-simulations.mjs could each define different identities.",
        "impact": "Titles, routes, release claims, and supported classes could drift across API, web, validators, and reports.",
        "remediation": "packages/simulation-content/src/implemented/registry.ts now supplies canonical identities and routes to API, web, classroom, validation, and reporting consumers.",
        "prevention": "Derive every consumer from IMPLEMENTED_SIMULATIONS.",
    },
    {
        "title": "Source-text tests instead of behavior tests",
        "example": "tests/unit/ancient-fort-visit-viewer.test.ts and tests/unit/float-or-sink-viewer.test.ts read TSX and asserted toContain strings.",
        "impact": "A string can remain present while progression, input, rendering, narration, cleanup, or feedback behavior is broken.",
        "remediation": "Integrated tests execute registry resolution, guided controllers, investigation sessions, scientific models, shared host lifecycles, assets, narration, and route loading.",
        "prevention": "Exercise domain/runtime behavior; reserve source-string checks for narrow static policy.",
    },
    {
        "title": "Incomplete narration assets",
        "example": "The immutable PR head referenced 189 narration requests but tracked only 16 clips.",
        "impact": "173 referenced requests had no committed clip and could silently fall back or fail at runtime.",
        "remediation": "scripts/validate-narration-manifests.ts now validates committed manifests while packages/simulation-web/src/audio/createNarrationController.ts owns playback and fallback.",
        "prevention": "Validate stable IDs, content hashes, committed files, captions, and an explicit fallback policy.",
    },
    {
        "title": "Network-dependent production builds",
        "example": "apps/web/package.json added a prebuild that installed Python dependencies and invoked edge_tts.",
        "impact": "Clean builds required package, network, and provider availability and could mutate public assets while releasing.",
        "remediation": "Narration authoring is an explicit human command; production builds only validate committed manifests and never call a voice provider.",
        "prevention": "Keep narration generation author-only; builds validate committed manifests offline.",
    },
    {
        "title": "Dead Quest narration wiring",
        "example": "apps/web/components/simulations/questVrControls.ts accepted onNarrate as _onNarrate and never called it.",
        "impact": "The advertised controller narration action could not work even though a callback appeared in the API.",
        "remediation": "packages/simulation-web/src/input/createWebInputRouter.ts normalizes input and the shared narration controller is the single playback owner.",
        "prevention": "Route a tested normalized narration action through one audio owner.",
    },
    {
        "title": "Controller shortcuts bypass learning",
        "example": "Contributed viewers wired onPrimary: performAction directly.",
        "impact": "A controller button could advance without the declared choice, observation, evidence, or assessment step.",
        "remediation": "Shared guided and investigation controllers gate forward progress through declared lesson actions and evidence.",
        "prevention": "Gate every input through the lesson session and its declared evidence contract.",
    },
    {
        "title": "Slideshow progression instead of meaningful interaction",
        "example": "Guided viewers exposed generic Next buttons that called goToStage(stage + 1).",
        "impact": "Scene presence could be mistaken for evidence that a learner predicted, acted, observed, or explained.",
        "remediation": "Canonical definitions declare required stage actions and evidence; Previous revisits completed stages without bypassing forward gates.",
        "prevention": "Forward progression requires the declared stage action; Previous only revisits completed stages.",
    },
    {
        "title": "Clone-and-modify architecture",
        "example": "23 large viewers repeated renderer, animation loop, environment, controls, cards, audio, and disposal logic.",
        "impact": "The contributed viewers added 16,846 lines and multiplied defect surfaces for every later class.",
        "remediation": "Definitions in simulation-content, sessions/models in simulation-runtime, and one simulation-web host replace viewer-local infrastructure.",
        "prevention": "Compose definition + domain + scene adapter over shared runtime and web packages.",
    },
    {
        "title": "Unverified performance, cleanup, comfort, accessibility, and provenance",
        "example": "Source-string checks asserted helper names while panorama PNGs lacked a complete source/license record.",
        "impact": "Performance, lifecycle, comfort, accessibility, and asset claims were not auditable; physical-device risk remained unknown.",
        "remediation": "Shared host lifecycle tests, bounded locomotion, caption/input contracts, asset manifests with hashes/credits, browser acceptance, and separate device evidence fields make gaps visible.",
        "prevention": "Require manifests, budgets, behavioral cleanup tests, browser acceptance, and signed device/classroom evidence.",
    },
)


def build_top_ten_markdown(scorecard_value: object) -> str:
    scorecard = _require_mapping(scorecard_value, "contribution scorecard")
    comparisons = _require_sequence(scorecard.get("comparisons"), "contribution scorecard.comparisons")
    if scorecard.get("pr") != 8 or scorecard.get("headSha") != PR8_HEAD or len(comparisons) != 23:
        raise ValueError("Top-ten report requires all 23 comparisons at the immutable PR #8 head")
    before = [quality_total(_require_mapping(_require_mapping(item, "comparison")["baseline"], "baseline")["scores"]) for item in comparisons]
    after = [quality_total(_require_mapping(_require_mapping(item, "comparison")["postIntegration"], "postIntegration")["scores"]) for item in comparisons]
    lines = [
        "# XR School New Simulations: Top 10 Portfolio Mistakes",
        "",
        "**Review scope:** 23 PR #8 contributions at immutable head `621dfb61b39a4c49e8abb46ce60c54ea3d044479`",
        "",
        f"**Before/after indicator:** {statistics.fmean(before):.1f}/100 baseline to {statistics.fmean(after):.1f}/100 integrated internal QA",
        "",
        "This is a neutral portfolio-learning report. It identifies repeatable system and authoring mistakes so future classes can preserve useful curriculum ideas while meeting a consistent library contract.",
        "",
        "The immutable baseline contained 23 contributed viewers and 16,846 viewer lines. It referenced 189 narration requests, tracked 16 clips, and therefore left 173 requests without committed clips.",
        "",
        "Internal/browser evidence does not replace signed Quest acceptance or controlled classroom evidence.",
        "",
    ]
    for index, mistake in enumerate(TOP_TEN_MISTAKES, 1):
        lines.extend(
            [
                f"## {index}. {mistake['title']}",
                "",
                "### Examples",
                "",
                mistake["example"],
                "",
                "### Measurable impact",
                "",
                mistake["impact"],
                "",
                "### Remediation",
                "",
                mistake["remediation"],
                "",
                "### Prevention rule",
                "",
                mistake["prevention"],
                "",
            ]
        )
    lines.extend(
        [
            "## How to use this report",
            "",
            "Apply the prevention rules during class planning, require behavioral evidence before merge, and keep release publication separate from device/classroom maturity. These findings describe an integration baseline and shared engineering responsibilities; they are not personality judgments or a performance review.",
            "",
        ]
    )
    return "\n".join(ascii_text(line) for line in lines)


def build_aditya_markdown(scorecard_value: object) -> str:
    scorecard = _require_mapping(scorecard_value, "contribution scorecard")
    comparisons = [
        _require_mapping(item, "contribution comparison")
        for item in _require_sequence(scorecard.get("comparisons"), "contribution scorecard.comparisons")
    ]
    if scorecard.get("pr") != 8 or scorecard.get("headSha") != PR8_HEAD or len(comparisons) != 23:
        raise ValueError("Aditya report requires all 23 comparisons at the immutable PR #8 head")
    contributor = ascii_text(scorecard.get("contributor", ""))
    if contributor != "GitHub @Adityakrpand":
        raise ValueError("Aditya report must preserve the audited contributor credit")
    new_classes = sum(item.get("integration") == "new-class" for item in comparisons)
    enhancements = sum(item.get("integration") == "existing-enhancement" for item in comparisons)
    if (new_classes, enhancements) != (22, 1):
        raise ValueError("Aditya report requires 22 new classes and one existing enhancement")
    before_scores = [quality_total(_require_mapping(item["baseline"], "baseline")["scores"]) for item in comparisons]
    after_scores = [quality_total(_require_mapping(item["postIntegration"], "postIntegration")["scores"]) for item in comparisons]
    lines = [
        "# Aditya Contribution Improvement Assessment",
        "",
        f"**Contributor credit:** {contributor}",
        "",
        "**Reviewed source:** PR #8 at immutable head `621dfb61b39a4c49e8abb46ce60c54ea3d044479`",
        "",
        f"**Contribution outcome:** {new_classes} contributions became new canonical released classes; {enhancements} contribution improved the existing Solubility class.",
        "",
        f"**Portfolio indicator movement:** {statistics.fmean(before_scores):.1f}/100 baseline to {statistics.fmean(after_scores):.1f}/100 integrated internal QA.",
        "",
        "This assessment credits the curriculum, scene, narration, and panorama work supported by evidence. It explains what the integration system changed and what future classes should do from the start. It is a contribution-improvement assessment, not a performance review.",
        "",
        "Publication and evidence maturity remain separate: all classes are released at internal QA. Repository and browser evidence do not replace physical Quest acceptance or controlled classroom evidence.",
        "",
        "## What to keep doing",
        "",
        "- Start from a specific curriculum concept and turn it into a visible learner journey.",
        "- Preserve useful scene ideas, narration writing, and locally owned panorama work with explicit provenance.",
        "- Make the intended student action and observation concrete enough for reviewers to test.",
        "- Contribute in reviewable curriculum slices so the class can be mapped to one canonical identity.",
        "",
        "## How to read each contribution card",
        "",
        "Baseline scores use only the immutable PR head. Integrated scores use the remediated canonical library. A positive delta measures product-contract improvement, not an individual grade. Remaining risks keep absent device and classroom evidence visible.",
        "",
    ]
    for index, comparison in enumerate(comparisons, 1):
        baseline = _require_mapping(comparison["baseline"], "baseline")
        post = _require_mapping(comparison["postIntegration"], "postIntegration")
        before = quality_total(_require_mapping(baseline["scores"], "baseline.scores"))
        after = quality_total(_require_mapping(post["scores"], "postIntegration.scores"))
        lines.extend(
            [
                f"## Contribution {index:02d}: {ascii_text(comparison['prSlug'])}",
                "",
                f"**Title:** {ascii_text(comparison.get('title', comparison['canonicalSlug']))}",
                "",
                f"**Canonical class:** `{ascii_text(comparison['canonicalSlug'])}`",
                "",
                f"**Integration:** {ascii_text(comparison['integration'])}",
                "",
                f"**Baseline score:** {before}/100",
                "",
                f"**Integrated score:** {after}/100",
                "",
                f"**Score delta:** {_format_delta(after - before)}",
                "",
                "### Baseline strengths",
                "",
            ]
        )
        lines.extend(f"- {item}" for item in _strings(baseline.get("strengths"), "baseline.strengths"))
        lines.extend(["", "### Baseline defects", ""])
        lines.extend(f"- {item}" for item in _strings(baseline.get("defects"), "baseline.defects"))
        lines.extend(["", "### Implemented remediation", ""])
        lines.extend(f"- {item}" for item in _strings(post.get("remediation"), "postIntegration.remediation"))
        evidence_paths = _evidence_reference_paths(comparison)
        if evidence_paths:
            lines.extend(["", "### Remediation evidence paths", ""])
            lines.extend(f"- `{path}`" for path in evidence_paths)
        lines.extend(["", "### Remaining risk", ""])
        lines.extend(f"- {item}" for item in _strings(post.get("remainingRisks"), "postIntegration.remainingRisks"))
        lines.extend(["", "### Next action", "", ascii_text(post.get("nextAction", "")), ""])
    lines.extend(
        [
            "## Authoring checklist for the next contribution",
            "",
            "Use `docs/simulation-design/simulation-authoring-standard.md` as the normative class contract.",
            "",
            "- Register one canonical identity, route, legacy aliases, publication status, and evidence maturity.",
            "- Compose a definition, domain/session model, and scene adapter over shared runtime and web packages.",
            "- Require an explicit learner action and evidence before forward progression.",
            "- Test behavior, scientific invariants, cleanup, input parity, narration ownership, and fallback behavior.",
            "- Commit narration manifests and assets with stable IDs, hashes, captions, credits, and licenses.",
            "- Keep production builds offline; narration generation is an explicit authoring action.",
            "- Record browser, physical-device, and classroom evidence separately; never infer one from another.",
            "",
            "## Closing position",
            "",
            "The contribution set supplied substantial curriculum coverage and concrete simulation ideas. The integrated library demonstrates how those ideas become maintainable released classes: one registry, shared lifecycles, declared evidence gates, reproducible assets, behavior tests, and honest evidence maturity. The next contribution should begin with those contracts instead of retrofitting them after a viewer is complete.",
            "",
        ]
    )
    return "\n".join(ascii_text(line) for line in lines)


class PdfReportBuilder:
    """Small ReportLab/Platypus facade with deterministic A4 pagination."""

    def __init__(self, *, title: str, footer_label: str, audit_date: str) -> None:
        try:
            from reportlab.lib import colors
            from reportlab.lib.enums import TA_CENTER, TA_LEFT
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
            from reportlab.platypus import (
                HRFlowable,
                PageBreak,
                Paragraph,
                Spacer,
                Table,
                TableStyle,
            )
        except ImportError as error:  # pragma: no cover - exercised in report CI
            raise RuntimeError(
                "PDF generation requires the packages pinned in requirements-report.txt"
            ) from error

        self.colors = colors
        self.a4 = A4
        self.HRFlowable = HRFlowable
        self.PageBreak = PageBreak
        self.Paragraph = Paragraph
        self.Spacer = Spacer
        self.Table = Table
        self.TableStyle = TableStyle
        self.story: list[Any] = []
        self.title = ascii_text(title)
        self.footer_label = ascii_text(footer_label)
        self.audit_date = ascii_text(audit_date)
        self.navy = colors.HexColor("#071723")
        self.navy_2 = colors.HexColor("#0D2636")
        self.cyan = colors.HexColor("#22D3EE")
        self.blue = colors.HexColor("#0EA5E9")
        self.ink = colors.HexColor("#10212D")
        self.muted = colors.HexColor("#536977")
        self.pale = colors.HexColor("#EEF5F8")
        self.line = colors.HexColor("#D7E4EA")
        self.green = colors.HexColor("#15803D")
        self.amber = colors.HexColor("#B45309")
        self.red = colors.HexColor("#B91C1C")
        sample = getSampleStyleSheet()
        self.styles = {
            "title": ParagraphStyle(
                "XRTitle", parent=sample["Title"], fontName="Helvetica-Bold",
                fontSize=27, leading=31, textColor=colors.white,
                alignment=TA_LEFT, spaceAfter=15,
            ),
            "cover_body": ParagraphStyle(
                "XRCoverBody", parent=sample["BodyText"], fontName="Helvetica",
                fontSize=11, leading=16, textColor=colors.HexColor("#D4E7EE"),
                spaceAfter=9,
            ),
            "kicker": ParagraphStyle(
                "XRKicker", parent=sample["BodyText"], fontName="Helvetica-Bold",
                fontSize=7.4, leading=9, textColor=self.blue, spaceAfter=5,
                keepWithNext=True,
            ),
            "h1": ParagraphStyle(
                "XRH1", parent=sample["Heading1"], fontName="Helvetica-Bold",
                fontSize=21, leading=25, textColor=self.navy, spaceAfter=9,
                keepWithNext=True,
            ),
            "h2": ParagraphStyle(
                "XRH2", parent=sample["Heading2"], fontName="Helvetica-Bold",
                fontSize=13, leading=16, textColor=self.navy, spaceBefore=7,
                spaceAfter=5, keepWithNext=True,
            ),
            "h3": ParagraphStyle(
                "XRH3", parent=sample["Heading3"], fontName="Helvetica-Bold",
                fontSize=9.5, leading=12, textColor=self.blue, spaceBefore=5,
                spaceAfter=3, keepWithNext=True,
            ),
            "body": ParagraphStyle(
                "XRBody", parent=sample["BodyText"], fontName="Helvetica",
                fontSize=8.7, leading=12.3, textColor=self.ink, spaceAfter=5,
                splitLongWords=True,
            ),
            "compact": ParagraphStyle(
                "XRCompact", parent=sample["BodyText"], fontName="Helvetica",
                fontSize=7.2, leading=9.2, textColor=self.ink, spaceAfter=2,
                splitLongWords=True,
            ),
            "small": ParagraphStyle(
                "XRSmall", parent=sample["BodyText"], fontName="Helvetica",
                fontSize=6.2, leading=7.6, textColor=self.ink,
                splitLongWords=True,
            ),
            "table_header": ParagraphStyle(
                "XRTableHeader", parent=sample["BodyText"], fontName="Helvetica-Bold",
                fontSize=6.5, leading=7.8, textColor=colors.white,
                splitLongWords=True,
            ),
            "metric": ParagraphStyle(
                "XRMetric", parent=sample["BodyText"], fontName="Helvetica-Bold",
                fontSize=19, leading=21, textColor=colors.white,
                alignment=TA_CENTER,
            ),
            "metric_label": ParagraphStyle(
                "XRMetricLabel", parent=sample["BodyText"], fontName="Helvetica",
                fontSize=6.5, leading=8, textColor=colors.HexColor("#B9D8E4"),
                alignment=TA_CENTER,
            ),
        }

    def _paragraph(self, text: object, style: str) -> Any:
        return self.Paragraph(escape(ascii_text(text)), self.styles[style])

    def spacer(self, points: float = 6) -> None:
        self.story.append(self.Spacer(1, points))

    def page_break(self) -> None:
        self.story.append(self.PageBreak())

    def cover(
        self,
        *,
        kicker: str,
        title: str,
        subtitle: str,
        metrics: Sequence[tuple[str, str]],
        position: str,
    ) -> None:
        hero = self.Table(
            [[self._paragraph(kicker.upper(), "kicker")], [self._paragraph(title, "title")], [self._paragraph(subtitle, "cover_body")]],
            colWidths=[519],
        )
        hero.setStyle(self.TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.navy),
            ("LEFTPADDING", (0, 0), (-1, -1), 22),
            ("RIGHTPADDING", (0, 0), (-1, -1), 22),
            ("TOPPADDING", (0, 0), (-1, 0), 18),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 22),
        ]))
        self.story.extend([self.Spacer(1, 35), hero, self.Spacer(1, 22)])
        metric_cells = [
            self.Table(
                [[self._paragraph(value, "metric")], [self._paragraph(label, "metric_label")]],
                colWidths=[118], rowHeights=[27, 25],
            )
            for value, label in metrics
        ]
        metrics_table = self.Table([metric_cells], colWidths=[129.75] * 4)
        metrics_table.setStyle(self.TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.navy_2),
            ("BOX", (0, 0), (-1, -1), 0.6, self.cyan),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, self.colors.HexColor("#23495B")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        self.story.extend([metrics_table, self.Spacer(1, 23)])
        position_table = self.Table(
            [[self._paragraph("AUDIT POSITION", "kicker")], [self._paragraph(position, "cover_body")]],
            colWidths=[519],
        )
        position_table.setStyle(self.TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.navy),
            ("BOX", (0, 0), (-1, -1), 0.5, self.cyan),
            ("LEFTPADDING", (0, 0), (-1, -1), 16),
            ("RIGHTPADDING", (0, 0), (-1, -1), 16),
            ("TOPPADDING", (0, 0), (-1, 0), 12),
            ("BOTTOMPADDING", (0, -1), (-1, -1), 14),
        ]))
        self.story.append(position_table)

    def section(self, kicker: str, title: str, subtitle: str | None = None) -> None:
        self.story.extend([self._paragraph(kicker.upper(), "kicker"), self._paragraph(title, "h1")])
        if subtitle:
            self.story.append(self._paragraph(subtitle, "body"))
        self.story.append(self.HRFlowable(width="100%", thickness=1.2, color=self.cyan, spaceAfter=8))

    def h2(self, text: str) -> None:
        self.story.append(self._paragraph(text, "h2"))

    def h3(self, text: str) -> None:
        self.story.append(self._paragraph(text, "h3"))

    def body(self, text: object, *, compact: bool = False) -> None:
        self.story.append(self._paragraph(text, "compact" if compact else "body"))

    def bullets(self, items: Sequence[str], *, compact: bool = False) -> None:
        style = "compact" if compact else "body"
        for item in items:
            self.story.append(self._paragraph(f"- {ascii_text(item)}", style))

    def callout(self, title: str, body: str, *, color: str = "blue") -> None:
        palette = {"blue": self.blue, "green": self.green, "amber": self.amber, "red": self.red}
        accent = palette[color]
        table = self.Table(
            [[self._paragraph(title.upper(), "h3")], [self._paragraph(body, "body")]],
            colWidths=[519],
        )
        table.setStyle(self.TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.pale),
            ("BOX", (0, 0), (-1, -1), 0.8, accent),
            ("LINEBEFORE", (0, 0), (0, -1), 4, accent),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        self.story.extend([table, self.Spacer(1, 7)])

    def table(
        self,
        headers: Sequence[str],
        rows: Sequence[Sequence[object]],
        *,
        widths: Sequence[float],
        compact: bool = False,
    ) -> None:
        style_name = "small" if compact else "compact"
        data = [[self._paragraph(value, "table_header") for value in headers]]
        data.extend([[self._paragraph(value, style_name) for value in row] for row in rows])
        table = self.Table(data, colWidths=list(widths), repeatRows=1, hAlign="LEFT", splitByRow=1)
        commands: list[tuple[Any, ...]] = [
            ("BACKGROUND", (0, 0), (-1, 0), self.navy),
            ("BOX", (0, 0), (-1, -1), 0.5, self.line),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, self.line),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]
        for index in range(1, len(data)):
            if index % 2 == 0:
                commands.append(("BACKGROUND", (0, index), (-1, index), self.pale))
        table.setStyle(self.TableStyle(commands))
        self.story.extend([table, self.Spacer(1, 7)])

    def metrics(self, values: Sequence[tuple[str, str]]) -> None:
        cells = []
        for value, label in values:
            block = self.Table(
                [[self._paragraph(value, "metric")], [self._paragraph(label, "metric_label")]],
                colWidths=[120], rowHeights=[25, 22],
            )
            block.setStyle(self.TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), self.navy_2),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]))
            cells.append(block)
        table = self.Table([cells], colWidths=[129.75] * len(cells))
        table.setStyle(self.TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, self.cyan),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, self.cyan),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        self.story.extend([table, self.Spacer(1, 8)])

    def score_table(self, scores: Mapping[str, int]) -> None:
        rows = [
            [QUALITY_LABELS[key], f"{scores[key]} / {maximum}", f"{scores[key] / maximum * 100:.0f}%"]
            for key, maximum in QUALITY_WEIGHTS.items()
        ]
        self.table(["Weighted dimension", "Score", "Attainment"], rows, widths=[354, 78, 87], compact=True)

    def write(self, path: Path) -> None:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.pdfgen.canvas import Canvas
            from reportlab.platypus import SimpleDocTemplate
        except ImportError as error:  # pragma: no cover - exercised in report CI
            raise RuntimeError(
                "PDF generation requires the packages pinned in requirements-report.txt"
            ) from error

        path.parent.mkdir(parents=True, exist_ok=True)
        title = self.title
        footer_label = self.footer_label
        audit_date = self.audit_date
        line = self.line
        muted = self.muted
        navy = self.navy

        class DeterministicCanvas(Canvas):
            def __init__(self, *args: Any, **kwargs: Any) -> None:
                kwargs["invariant"] = 1
                kwargs["pageCompression"] = 1
                super().__init__(*args, **kwargs)

        def decorate(pdf: Any, document: Any) -> None:
            pdf.saveState()
            pdf.setTitle(title)
            pdf.setAuthor("XR School quality audit")
            pdf.setSubject("Evidence-backed simulation quality reporting")
            if document.page > 1:
                pdf.setFillColor(navy)
                pdf.setFont("Helvetica-Bold", 6.7)
                pdf.drawString(38, A4[1] - 24, title[:92])
            pdf.setStrokeColor(line)
            pdf.line(38, 32, A4[0] - 38, 32)
            pdf.setFillColor(muted)
            pdf.setFont("Helvetica", 6.5)
            pdf.drawString(38, 19, f"{footer_label} - {audit_date}")
            pdf.drawRightString(A4[0] - 38, 19, f"Page {document.page}")
            pdf.restoreState()

        document = SimpleDocTemplate(
            str(path), pagesize=A4, leftMargin=38, rightMargin=38,
            topMargin=42, bottomMargin=46, allowSplitting=1,
            title=title, author="XR School quality audit",
            subject="Evidence-backed simulation quality reporting",
        )
        document.build(
            self.story, onFirstPage=decorate, onLaterPages=decorate,
            canvasmaker=DeterministicCanvas,
        )
