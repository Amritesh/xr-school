from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from scripts.lib.simulation_quality_reports import (
    ascii_text,
    build_aditya_markdown,
    build_portfolio_markdown,
    build_top_ten_markdown,
    quality_band,
    validate_report_inputs,
)

try:
    import pdfplumber
    from pypdf import PdfReader
except ImportError:  # The pinned requirements are installed by the report job.
    pdfplumber = None
    PdfReader = None


ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "scripts"
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
RUBRIC_LABELS = (
    "Educational effectiveness",
    "Content / scientific integrity",
    "Learner interactivity",
    "Visual and asset quality",
    "Narration and sound",
    "Usability, accessibility, comfort",
    "Performance and stability",
    "Deployment readiness",
)

CONTRIBUTION_IDENTITIES = (
    ("walls-tell-stories-ancient-fort-visit", "c5-ch10-a01-a-visit-of-ancient-fort", "new-class"),
    ("up-you-go-snow-mountain-climbing", "c5-ch09-a04-snow-mountain-climbing", "new-class"),
    ("up-you-go-camp-in-snow", "c5-ch09-a03-camp-in-the-snow", "new-class"),
    ("up-you-go-rock-climbing", "c5-ch09-a02-rock-climbing", "new-class"),
    ("up-you-go-river-crossing-adventure", "c5-ch09-a01-river-crossing-adventure", "new-class"),
    ("treat-for-mosquitoes-mosquito-life-cycle", "c5-ch08-a02-life-cycle-of-the-mosquito", "new-class"),
    ("treat-for-mosquitoes-malaria-diagnosis", "c5-ch08-a01-diagnosis-of-malaria", "new-class"),
    ("experiments-with-water-float-or-sink", "c5-ch07-a01-a-concept-about-what-floats-what-sinks", "new-class"),
    ("experiments-with-water-dead-sea-salt-water", "c5-ch07-a02-dead-sea-salt-water-and-its-effects", "new-class"),
    ("experiments-with-water-soluble-insoluble", "c5-ch07-a03-soluble-and-insoluble-substances", "existing-enhancement"),
    ("every-drop-counts-rainwater-storage", "c5-ch06-a01-the-storage-of-rainwater", "new-class"),
    ("every-drop-counts-stepwell-structure", "c5-ch06-a02-a-step-well-structure", "new-class"),
    ("seeds-and-seeds-seed-dispersal", "c5-ch05-a02-seed-dispersal", "new-class"),
    ("seeds-and-seeds-pitcher-plant", "c5-ch05-a01-pitcher-plant-the-insect-hunter", "new-class"),
    ("mangoes-round-the-year-aam-papad", "c5-ch04-a03-the-making-of-aam-papad", "new-class"),
    ("mangoes-round-the-year-milk-spoilage", "c5-ch04-a02-milk-spoilage", "new-class"),
    ("mangoes-round-the-year-food-spoilage", "c5-ch04-a01-food-spoilage", "new-class"),
    ("sorting-materials-by-shape", "c6-ch04-a01-sorting-materials-according-to-their-shape", "new-class"),
    ("fibre-to-fabric-cotton-farming", "c6-ch03-a01-cotton-farming", "new-class"),
    ("fibre-to-fabric-cotton-ginning", "c6-ch03-a02-the-process-of-cotton-ginning", "new-class"),
    ("components-of-food-mineral-sources", "c6-ch02-a05-the-sources-of-minerals-in-food", "new-class"),
    ("components-of-food-vitamins-deficiencies", "c6-ch02-a04-the-sources-of-vitamins-and-their-deficiencies", "new-class"),
    ("components-of-food-lipid-test", "c6-ch02-a03-test-the-presence-of-lipids", "new-class"),
)


def score_total(scores: dict[str, int]) -> int:
    return sum(scores.values())


def fixture_scores(index: int, *, improved: bool = False) -> dict[str, int]:
    base = {
        "education": 12,
        "integrity": 9,
        "interactivity": 8,
        "visuals": 8,
        "audio": 4,
        "usability": 6,
        "stability": 6,
        "deployment": 2,
    }
    if improved:
        base.update(
            education=17,
            integrity=13,
            interactivity=13,
            visuals=11,
            audio=8,
            usability=8,
            stability=8,
            deployment=3,
        )
    # Keep ranking non-uniform while staying inside each weighted maximum.
    base["education"] = min(WEIGHTS["education"], base["education"] + index % 3)
    return base


def write_fixture_data(directory: Path) -> tuple[Path, Path, Path, list[dict], list[dict]]:
    cards: list[dict] = []
    evidence_records: list[dict] = []
    contribution_slugs = {canonical for _, canonical, _ in CONTRIBUTION_IDENTITIES}
    canonical_slugs = [canonical for _, canonical, _ in CONTRIBUTION_IDENTITIES]
    canonical_slugs.extend(f"existing-canonical-simulation-{index:02d}" for index in range(1, 13))
    for index, slug in enumerate(canonical_slugs, 1):
        title = f"Canonical Simulation {index:02d} - Evidence Lab"
        cards.append(
            {
                "slug": slug,
                "title": title,
                "route": f"/simulations/{slug}",
                "publicationStatus": "released",
                "evidenceMaturity": "internalQA",
                "legacyPaths": [],
                "grade": "Class 5" if index <= 23 else "Classes 6-10",
                "subject": "Science",
                "evidenceConfidence": "Internal QA evidence",
                "scores": fixture_scores(index, improved=True),
                "dimensionEvidence": {key: [f"evidence:{slug}:{key}"] for key in WEIGHTS},
                "summary": "A released curriculum simulation with repository and browser evidence, retained at internal QA maturity.",
                "strengths": [
                    "The lesson connects a prediction to an observable action.",
                    "The canonical definition keeps curriculum identity explicit.",
                    "Focused tests protect progression and feedback behavior.",
                ],
                "risks": [
                    "A signed physical Quest acceptance run is not available.",
                    "A controlled classroom study has not been completed.",
                    "The next pilot must verify teacher workflow and learner comprehension.",
                ],
                "action": "Run physical-device and teacher-led acceptance before advancing evidence maturity.",
            }
        )
        evidence_records.append(
            {
                "slug": slug,
                "title": title,
                "publicationStatus": "released",
                "evidenceMaturity": "internalQA",
                "route": f"/simulations/{slug}",
                "kind": "interactive" if slug in contribution_slugs else "guided",
                "contribution": slug in contribution_slugs,
                "counts": {"stages": 5, "actions": 5, "evidence": 5, "assessments": 1},
                "narration": {"cues": 7, "packagedAudio": 7, "captions": 7, "missingFiles": 0, "hashesValid": True},
                "assets": {"count": 4, "provenanceComplete": True, "fallback": True, "pathsValid": True},
                "tests": {"focusedIds": [f"test:{slug}"], "lastVerifiedCommand": "npm test"},
                "browser": {"status": "passed", "finding": "Canonical route mounted in browser acceptance."},
                "questDeviceEvidence": "not-run",
                "classroomEvidence": "not-run",
            }
        )

    comparisons: list[dict] = []
    for index, (pr_slug, canonical_slug, integration) in enumerate(CONTRIBUTION_IDENTITIES, 1):
        comparisons.append(
            {
                "prSlug": pr_slug,
                "canonicalSlug": canonical_slug,
                "integration": integration,
                "contributor": "GitHub @Adityakrpand",
                "baseline": {
                    "sourceRevision": "621dfb61b39a4c49e8abb46ce60c54ea3d044479",
                    "scores": fixture_scores(index),
                    "strengths": [
                        "Useful curriculum sequence and scene concept.",
                        "Relevant learner-facing narration was drafted.",
                        "The contribution established a concrete simulation starting point.",
                    ],
                    "defects": [
                        "The viewer duplicated renderer and progression infrastructure.",
                        "Source-text assertions did not execute learner behavior.",
                    ],
                    "evidence": [
                        {
                            "id": f"git:{index}",
                            "kind": "git",
                            "ref": f"git:621dfb61b39a4c49e8abb46ce60c54ea3d044479:viewer-{index}.tsx",
                            "finding": "Immutable contributed implementation inspected.",
                        }
                    ],
                },
                "postIntegration": {
                    "scores": fixture_scores(index, improved=True),
                    "remediation": [
                        f"packages/simulation-content/src/implemented/{canonical_slug}.ts defines the canonical class.",
                        "packages/simulation-runtime/src/experience provides shared progression and cleanup.",
                        "tests/unit verifies the integrated behavior.",
                    ],
                    "evidence": [
                        {"id": f"source:{index}", "kind": "source", "ref": f"packages/simulation-content/src/implemented/{canonical_slug}.ts", "finding": "Canonical definition is integrated."},
                        {"id": f"test:{index}", "kind": "test", "ref": "tests/unit", "finding": "Focused behavior checks pass."},
                    ],
                    "remainingRisks": [
                        "Physical Quest acceptance is not yet signed.",
                        "Classroom learning outcomes have not been measured.",
                    ],
                    "nextAction": "Run the authored device and teacher acceptance checklist.",
                },
            }
        )

    evidence = {
        "auditDate": "2026-08-01",
        "portfolio": {
            "publiclyLaunchableSimulations": 35,
            "evidenceMaturityDistribution": {"internalQA": 35},
            "schoolOutcomeStudies": 0,
            "signedQuestAcceptanceRuns": 0,
        },
        "simulations": evidence_records,
    }
    scorecard = {
        "pr": 8,
        "headSha": "621dfb61b39a4c49e8abb46ce60c54ea3d044479",
        "contributor": "GitHub @Adityakrpand",
        "comparisons": comparisons,
    }
    cards_path = directory / "cards.json"
    evidence_path = directory / "evidence.json"
    scorecard_path = directory / "scorecard.json"
    cards_path.write_text(json.dumps(cards), encoding="utf-8")
    evidence_path.write_text(json.dumps(evidence), encoding="utf-8")
    scorecard_path.write_text(json.dumps(scorecard), encoding="utf-8")
    return cards_path, evidence_path, scorecard_path, cards, comparisons


def run_generator(script: str, arguments: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPTS / script), *arguments],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )


def assert_success(testcase: unittest.TestCase, result: subprocess.CompletedProcess[str]) -> None:
    testcase.assertEqual(
        result.returncode,
        0,
        f"generator failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}",
    )


def pdf_text(path: Path) -> str:
    assert pdfplumber is not None
    with pdfplumber.open(path) as document:
        return "\n".join(page.extract_text() or "" for page in document.pages)


class ReportPrimitiveTests(unittest.TestCase):
    def test_ascii_normalization_replaces_problematic_dashes_and_symbols(self) -> None:
        self.assertEqual(
            ascii_text("Evidence‑backed – released ≠ school‑validated — 35×23"),
            "Evidence-backed - released != school-validated - 35x23",
        )
        self.assertNotIn("\ufffd", ascii_text("learner’s • evidence…"))

    def test_quality_bands_use_the_release_rubric_thresholds(self) -> None:
        self.assertEqual(quality_band(85), "Pilot candidate")
        self.assertEqual(quality_band(84), "Promising internal QA")
        self.assertEqual(quality_band(70), "Promising internal QA")
        self.assertEqual(quality_band(69), "Needs focused improvement")
        self.assertEqual(quality_band(55), "Needs focused improvement")
        self.assertEqual(quality_band(54), "Rebuild before pilot")

    def test_report_inputs_fail_closed_until_all_35_and_23_records_exist(self) -> None:
        with tempfile.TemporaryDirectory() as fixture_tmp:
            cards_path, evidence_path, scorecard_path, cards, comparisons = write_fixture_data(Path(fixture_tmp))
            evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
            scorecard = json.loads(scorecard_path.read_text(encoding="utf-8"))
            validate_report_inputs(cards, evidence, scorecard)
            with self.assertRaisesRegex(ValueError, "Expected 35 quality cards"):
                validate_report_inputs(cards[:-1], evidence, scorecard)
            with self.assertRaisesRegex(ValueError, "Expected 23 contribution comparisons"):
                validate_report_inputs(cards, evidence, {**scorecard, "comparisons": comparisons[:-1]})

    def test_portfolio_markdown_derives_counts_rankings_and_appendix_from_data(self) -> None:
        with tempfile.TemporaryDirectory() as fixture_tmp:
            _, evidence_path, scorecard_path, cards, comparisons = write_fixture_data(Path(fixture_tmp))
            evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
            scorecard = json.loads(scorecard_path.read_text(encoding="utf-8"))
            markdown = build_portfolio_markdown(cards, evidence, scorecard)
            self.assertIn("**Scope:** 35 released simulations", markdown)
            self.assertEqual(len(re.findall(r"^### .+ - \d+/100$", markdown, re.MULTILINE)), 35)
            ranked = markdown.split("## Ranked portfolio", 1)[1].split("## Portfolio priorities", 1)[0]
            for card in cards:
                self.assertEqual(ranked.count(f"| {card['title']} |"), 1)
            appendix = markdown.split("## Contribution appendix", 1)[1]
            for comparison in comparisons:
                self.assertIn(comparison["prSlug"], appendix)
                self.assertIn(comparison["canonicalSlug"], appendix)

    def test_companion_markdown_is_complete_neutral_and_evidence_honest(self) -> None:
        with tempfile.TemporaryDirectory() as fixture_tmp:
            _, _, scorecard_path, _, comparisons = write_fixture_data(Path(fixture_tmp))
            scorecard = json.loads(scorecard_path.read_text(encoding="utf-8"))
            mistakes = build_top_ten_markdown(scorecard)
            self.assertEqual(
                [int(value) for value in re.findall(r"^## (\d+)\.", mistakes, re.MULTILINE)],
                list(range(1, 11)),
            )
            for section in re.split(r"^## \d+\. .+$", mistakes, flags=re.MULTILINE)[1:]:
                for required in ("### Examples", "### Measurable impact", "### Remediation", "### Prevention rule"):
                    self.assertIn(required, section)
            aditya = build_aditya_markdown(scorecard)
            self.assertEqual(len(re.findall(r"^## Contribution \d{2}:", aditya, re.MULTILINE)), 23)
            self.assertIn("GitHub @Adityakrpand", aditya)
            self.assertIn("## What to keep doing", aditya)
            self.assertIn("## Authoring checklist for the next contribution", aditya)
            for comparison in comparisons:
                self.assertIn(comparison["prSlug"], aditya)
                self.assertIn(comparison["canonicalSlug"], aditya)
                before = score_total(comparison["baseline"]["scores"])
                after = score_total(comparison["postIntegration"]["scores"])
                self.assertIn(f"**Baseline score:** {before}/100", aditya)
                self.assertIn(f"**Integrated score:** {after}/100", aditya)
                self.assertIn(f"**Score delta:** +{after - before}", aditya)


@unittest.skipIf(PdfReader is None or pdfplumber is None, "install requirements-report.txt")
class SimulationQualityReportTests(unittest.TestCase):
    maxDiff = None

    def test_portfolio_report_is_complete_a4_and_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as fixture_tmp, tempfile.TemporaryDirectory() as first_tmp, tempfile.TemporaryDirectory() as second_tmp:
            cards_path, evidence_path, scorecard_path, cards, comparisons = write_fixture_data(Path(fixture_tmp))
            common = ["--cards", str(cards_path), "--evidence", str(evidence_path), "--scorecard", str(scorecard_path)]
            first = run_generator("generate_simulation_quality_report.py", [*common, "--output-dir", first_tmp])
            second = run_generator("generate_simulation_quality_report.py", [*common, "--output-dir", second_tmp])
            assert_success(self, first)
            assert_success(self, second)
            self.assertIn("35 quality cards and 23 contribution rows", first.stdout)

            markdown_name = "xr-school-implemented-simulations-quality-report.md"
            pdf_name = "xr-school-implemented-simulations-quality-report.pdf"
            first_markdown = Path(first_tmp, markdown_name).read_bytes()
            second_markdown = Path(second_tmp, markdown_name).read_bytes()
            first_pdf = Path(first_tmp, pdf_name).read_bytes()
            second_pdf = Path(second_tmp, pdf_name).read_bytes()
            self.assertEqual(first_markdown, second_markdown)
            self.assertEqual(hashlib.sha256(first_pdf).digest(), hashlib.sha256(second_pdf).digest())

            markdown = first_markdown.decode("utf-8")
            self.assertIn("**Scope:** 35 released simulations", markdown)
            quality_card_block = markdown.split("## Quality cards", 1)[1].split("## Contribution appendix", 1)[0]
            self.assertEqual(len(re.findall(r"^### ", quality_card_block, re.MULTILINE)), 35)
            ranked = markdown.split("## Ranked portfolio", 1)[1].split("## Portfolio priorities", 1)[0]
            for card in cards:
                self.assertEqual(ranked.count(f"| {card['title']} |"), 1)
            appendix = markdown.split("## Contribution appendix", 1)[1]
            for comparison in comparisons:
                self.assertIn(comparison["prSlug"], appendix)
                self.assertIn(comparison["canonicalSlug"], appendix)
            expected_average = sum(score_total(card["scores"]) for card in cards) / len(cards)
            self.assertIn(f"**Portfolio average:** {expected_average:.1f}/100", markdown)

            reader = PdfReader(Path(first_tmp, pdf_name))
            self.assertGreaterEqual(len(reader.pages), 42)
            for page in reader.pages:
                self.assertAlmostEqual(float(page.mediabox.width), 595.2756, places=2)
                self.assertAlmostEqual(float(page.mediabox.height), 841.8898, places=2)
                annotations = page.get("/Annots") or []
                self.assertFalse(any(item.get_object().get("/Subtype") == "/Widget" for item in annotations))
            extracted = pdf_text(Path(first_tmp, pdf_name))
            for card in cards:
                self.assertIn(card["title"], extracted)
            for label in RUBRIC_LABELS:
                self.assertIn(label, extracted)
            for comparison in comparisons:
                self.assertIn(comparison["prSlug"], extracted)
                self.assertIn(comparison["canonicalSlug"], extracted)
            self.assertIn("Released does not mean school-validated", extracted)
            self.assertIn("Quest and classroom evidence are absent", extracted)
            self.assertNotIn("\ufffd", extracted)

    def test_top_ten_report_has_exact_order_and_required_sections(self) -> None:
        with tempfile.TemporaryDirectory() as fixture_tmp, tempfile.TemporaryDirectory() as first_tmp, tempfile.TemporaryDirectory() as second_tmp:
            _, _, scorecard_path, _, _ = write_fixture_data(Path(fixture_tmp))
            first = run_generator("generate_new_simulations_top_10_mistakes.py", ["--scorecard", str(scorecard_path), "--output-dir", first_tmp])
            second = run_generator("generate_new_simulations_top_10_mistakes.py", ["--scorecard", str(scorecard_path), "--output-dir", second_tmp])
            assert_success(self, first)
            assert_success(self, second)
            self.assertIn("10 mistakes", first.stdout)

            markdown_name = "xr-school-new-simulations-top-10-mistakes.md"
            pdf_name = "xr-school-new-simulations-top-10-mistakes.pdf"
            markdown = Path(first_tmp, markdown_name).read_text(encoding="utf-8")
            headings = re.findall(r"^## (\d+)\. (.+)$", markdown, re.MULTILINE)
            self.assertEqual([int(number) for number, _ in headings], list(range(1, 11)))
            self.assertEqual(
                [title for _, title in headings],
                [
                    "Unsupported release and evidence claims",
                    "Competing sources of truth",
                    "Source-text tests instead of behavior tests",
                    "Incomplete narration assets",
                    "Network-dependent production builds",
                    "Dead Quest narration wiring",
                    "Controller shortcuts bypass learning",
                    "Slideshow progression instead of meaningful interaction",
                    "Clone-and-modify architecture",
                    "Unverified performance, cleanup, comfort, accessibility, and provenance",
                ],
            )
            sections = re.split(r"^## \d+\. .+$", markdown, flags=re.MULTILINE)[1:]
            self.assertEqual(len(sections), 10)
            for section in sections:
                for required in ("### Examples", "### Measurable impact", "### Remediation", "### Prevention rule"):
                    self.assertIn(required, section)
            self.assertEqual(Path(first_tmp, markdown_name).read_bytes(), Path(second_tmp, markdown_name).read_bytes())
            self.assertEqual(Path(first_tmp, pdf_name).read_bytes(), Path(second_tmp, pdf_name).read_bytes())
            extracted = pdf_text(Path(first_tmp, pdf_name))
            for _, title in headings:
                self.assertIn(title, extracted)
            self.assertNotIn("\ufffd", extracted)
            self.assert_all_a4_and_static(Path(first_tmp, pdf_name))
            self.assert_neutral_and_evidence_honest(markdown)

    def test_aditya_report_has_one_complete_card_per_contribution(self) -> None:
        with tempfile.TemporaryDirectory() as fixture_tmp, tempfile.TemporaryDirectory() as first_tmp, tempfile.TemporaryDirectory() as second_tmp:
            _, _, scorecard_path, _, comparisons = write_fixture_data(Path(fixture_tmp))
            first = run_generator("generate_aditya_contribution_report.py", ["--scorecard", str(scorecard_path), "--output-dir", first_tmp])
            second = run_generator("generate_aditya_contribution_report.py", ["--scorecard", str(scorecard_path), "--output-dir", second_tmp])
            assert_success(self, first)
            assert_success(self, second)
            self.assertIn("23 contributions", first.stdout)

            markdown_name = "aditya-contribution-improvement-report.md"
            pdf_name = "aditya-contribution-improvement-report.pdf"
            markdown = Path(first_tmp, markdown_name).read_text(encoding="utf-8")
            self.assertIn("GitHub @Adityakrpand", markdown)
            sections = re.findall(r"^## Contribution \d{2}: (.+)$", markdown, re.MULTILINE)
            self.assertEqual(len(sections), 23)
            for comparison in comparisons:
                self.assertEqual(sections.count(comparison["prSlug"]), 1)
                contribution = markdown.split(f"## Contribution {comparisons.index(comparison) + 1:02d}: {comparison['prSlug']}", 1)[1]
                contribution = contribution.split("\n## Contribution ", 1)[0]
                for label in ("**Canonical class:**", "**Baseline score:**", "**Integrated score:**", "**Score delta:**", "### Baseline strengths", "### Baseline defects", "### Implemented remediation", "### Remaining risk", "### Next action"):
                    self.assertIn(label, contribution)
                self.assertIn(comparison["canonicalSlug"], contribution)
            self.assertIn("## What to keep doing", markdown)
            self.assertIn("## Authoring checklist for the next contribution", markdown)
            self.assertIn("docs/simulation-design/simulation-authoring-standard.md", markdown)
            self.assertEqual(Path(first_tmp, markdown_name).read_bytes(), Path(second_tmp, markdown_name).read_bytes())
            self.assertEqual(Path(first_tmp, pdf_name).read_bytes(), Path(second_tmp, pdf_name).read_bytes())
            extracted = pdf_text(Path(first_tmp, pdf_name))
            for comparison in comparisons:
                self.assertIn(comparison["prSlug"], extracted)
                self.assertIn(comparison["canonicalSlug"], extracted)
            self.assertNotIn("\ufffd", extracted)
            self.assert_all_a4_and_static(Path(first_tmp, pdf_name))
            self.assert_neutral_and_evidence_honest(markdown)

    def assert_all_a4_and_static(self, path: Path) -> None:
        reader = PdfReader(path)
        self.assertGreater(len(reader.pages), 0)
        for page in reader.pages:
            self.assertAlmostEqual(float(page.mediabox.width), 595.2756, places=2)
            self.assertAlmostEqual(float(page.mediabox.height), 841.8898, places=2)
            annotations = page.get("/Annots") or []
            self.assertFalse(any(item.get_object().get("/Subtype") == "/Widget" for item in annotations))

    def assert_neutral_and_evidence_honest(self, text: str) -> None:
        lowered = text.lower()
        for personality_judgment in ("lazy", "careless person", "incompetent", "poor performer", "bad developer"):
            self.assertNotIn(personality_judgment, lowered)
        for unsupported_claim in ("quest-verified", "quest verified", "classroom-validated", "classroom validated", "school proven"):
            self.assertNotIn(unsupported_claim, lowered)


if __name__ == "__main__":
    unittest.main()
