"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  createYarnMakerWorld,
  type YarnMakerWorldSnapshot,
  type YarnQualityCheck,
  type YarnTwistLevel,
} from "../../lib/world-builder/yarnMakerWorld";
import {
  playNarration,
  stopNarration,
  unlockNarration,
} from "./narrationAudio";
import { createQuestVrControls } from "./questVrControls";
import styles from "./VirusInvasionViewer.module.css";

const STAGES = [
  {
    id: "fibre-vs-yarn",
    title: "Fibre or Yarn?",
    cue: "Pull a loose fibre, test finished yarn and inspect how twisted fibres grip one another.",
    detail:
      "A short loose fibre separates easily. Yarn is a long continuous strand made by drawing and twisting many fibres together.",
    action: "Inspect the next fibre sample",
  },
  {
    id: "carding",
    title: "Open the Tangled Wool",
    cue: "Feed the coloured wool, close the safety cover and keep the carding rollers in the green speed zone.",
    detail:
      "Carding opens tangled clumps, separates fibres and begins arranging them in the same direction.",
    action: "Complete the next carding step",
  },
  {
    id: "combing",
    title: "Comb and Straighten",
    cue: "Move the combing handle with the arrows until long fibres lie nearly parallel and short fibres leave the strand.",
    detail:
      "Combing aligns longer fibres more evenly. The resulting soft, untwisted rope-like strand is called a sliver.",
    action: "Move the comb through the next section",
  },
  {
    id: "drawing",
    title: "Draw the Sliver into Roving",
    cue: "Balance the second roller speed so the thick sliver becomes a thinner, even strand without breaking.",
    detail:
      "Drawing gradually makes a sliver thinner and more even. The prepared thinner strand is called roving.",
    action: "Set the drawing speed",
  },
  {
    id: "twist",
    title: "Discover the Power of Twist",
    cue: "Compare no twist, excessive twist and the correct twist by pulling each fibre strand.",
    detail:
      "Correct twist makes fibres grip one another to form strong, flexible yarn; too little separates, while too much becomes hard and kinked.",
    action: "Test the next twist level",
  },
  {
    id: "spinning",
    title: "Operate the Spinning Machine",
    cue: "Feed the roving, balance drawing speed, add the correct twist and keep yarn tension in the green zone.",
    detail:
      "Spinning combines drawing and twisting. Drawing controls thickness, while twist gives yarn strength.",
    action: "Complete the next spinning control",
  },
  {
    id: "winding",
    title: "Wind the Yarn Evenly",
    cue: "Attach the yarn, set a safe bobbin speed and move the guide from side to side for even layers.",
    detail:
      "Rolling or winding collects spun yarn onto a bobbin, spool, cone or yarn ball without tangling.",
    action: "Complete the next winding step",
  },
  {
    id: "quality",
    title: "Inspect Yarn Quality",
    cue: "Check thickness, strength, twist and winding before approving the finished bobbin.",
    detail:
      "Good yarn is continuous, sufficiently strong, evenly twisted, reasonably uniform and wound in neat layers.",
    action: "Run the next quality test",
  },
  {
    id: "products-summary",
    title: "From Yarn to Useful Products",
    cue: "Inspect four woollen products and rebuild the five-step journey from tangled fibre to wound yarn.",
    detail:
      "Carding, combing, drawing, spinning and winding turn loose wool into yarn for garments, cloth, scarves and rugs.",
    action: "Inspect products and build the process line",
  },
  {
    id: "final-challenge",
    title: "Make Yarn Without Guidance",
    cue: "Complete five independent engineering decisions and earn the 50-point Master Yarn Engineer score.",
    detail:
      "Apply the full process: correct carding, combing, drawing, twist and tension, then even winding.",
    action: "Complete the next engineering task",
  },
] as const;

const NARRATIONS = [
  "Welcome back, Junior Yarn Engineer. The wool has been cleaned, sorted and dyed, but loose fibres cannot yet be knitted or woven. Pull the single fibre, then pull the yarn. A fibre is short and separates easily. Yarn is a longer continuous strand made by joining and twisting many fibres, so the fibres grip one another.",
  "The dyed wool is still tangled. Carding uses guarded, wire-covered rollers to open the clumps, separate the fibres and begin arranging them in the same direction. Feed the wool, close the transparent safety cover and keep the speed in the green zone. The result is a broad, soft web, not finished yarn.",
  "Carding has opened the wool, but its fibres are not fully aligned. Follow the arrows through the protected combing station. Combing arranges the longer fibres more evenly in nearly parallel lines and separates some short fibres and small impurities. The aligned fibres form a soft, untwisted strand called a sliver.",
  "The sliver is still too thick for this yarn. Drawing gradually pulls it out so the strand becomes thinner and more even without breaking. Set the second rollers slightly faster than the first. In this model, the thinner strand prepared for spinning is called roving. School descriptions may also call this drawing or rolling fibres into a strand.",
  "Test how twist changes a fibre strand. With no twist, fibres slide apart easily. Excessive twist can make the strand hard, curled and uneven. A suitable amount of twist helps neighbouring fibres grip one another and produces yarn that is strong enough yet flexible.",
  "Spinning is the process of drawing and twisting fibres together to make yarn. Feed the roving, balance the drawing speed, choose a suitable twist and keep the tension in the green zone. Low tension can form loose loops, while excessive tension can break the strand. Correct settings produce continuous woollen yarn.",
  "The newly spun yarn must now be collected. Attach its end to the bobbin, start slowly and move the guide smoothly from side to side. Rolling or winding forms even layers on a bobbin, spool, cone or yarn ball. Even winding helps prevent tangles and lets the yarn unwind smoothly.",
  "Inspect the completed yarn. Good-quality yarn should be continuous, sufficiently strong for its intended use, evenly twisted and reasonably uniform in thickness. Check that the yarn is also distributed evenly across the bobbin. Approve it only after all four observations pass.",
  "Blue, red and green yarn can now be knitted or woven into products such as sweaters, scarves, cloth and rugs. Review the sequence: clean coloured wool, carding, combing, sliver, drawing, roving, spinning, winding and finished yarn. Carding opens, combing aligns, drawing thins, spinning adds twist and winding collects the yarn.",
  "Complete the mission without guidance. Card the wool at a safe speed, comb the longer fibres into alignment, draw an even strand, choose a suitable twist, balance the tension and wind the yarn evenly. Use the evidence from every station to turn loose fibres into a strong, continuous and neatly collected woollen yarn.",
] as const;

const FIBRE_CHECKS = [
  ["loose-fibre", "Loose fibre · short and separates easily"],
  ["finished-yarn", "Finished yarn · longer and remains together"],
  ["magnified-twist", "Magnified twist · fibres grip one another"],
] as const;

const CARDING_STEPS = [
  "Place coloured wool on the feed conveyor",
  "Close the transparent safety cover",
  "Start the protected wire-covered rollers",
  "Set roller speed inside the green zone",
] as const;

const COMBING_STEPS = [
  "Follow the direction arrows",
  "Comb the first fibre section",
  "Align the remaining long fibres",
  "Collect short fibres in the separate tray",
] as const;

const SPINNING_STEPS = [
  "Feed the roving through the rollers",
  "Set drawing speed inside the green zone",
  "Set the correct twist level",
  "Balance the yarn tension",
] as const;

const WINDING_STEPS = [
  "Attach the yarn end to the bobbin",
  "Start the bobbin at a safe speed",
  "Move the guide smoothly across the bobbin",
  "Fill the bobbin in neat, even layers",
] as const;

const QUALITY_CHECKS: readonly [YarnQualityCheck, string][] = [
  ["thickness", "Thickness · reasonably even"],
  ["strength", "Strength · remains intact when gently pulled"],
  ["twist", "Twist · fibres wrap evenly"],
  ["winding", "Winding · neat layers across the bobbin"],
];

const PRODUCTS = [
  ["sweater", "Knitted sweater"],
  ["cloth", "Woven woollen cloth"],
  ["scarf", "Warm scarf"],
  ["rug", "Thick woollen rug"],
] as const;

const PROCESS_ORDER = [
  "Carding",
  "Combing",
  "Drawing",
  "Spinning",
  "Winding",
] as const;
const PROCESS_CHOICES = [
  "Winding",
  "Drawing",
  "Carding",
  "Spinning",
  "Combing",
] as const;
const CHALLENGE_TASKS = [
  "carding",
  "combing",
  "drawing",
  "spinning",
  "winding",
] as const;

type YarnWorld = ReturnType<typeof createYarnMakerWorld>;
type FibreCheckId = (typeof FIBRE_CHECKS)[number][0];
type ProductId = (typeof PRODUCTS)[number][0];
type ProcessName = (typeof PROCESS_ORDER)[number];
type ChallengeTask = (typeof CHALLENGE_TASKS)[number];

function emptyCompletion() {
  return STAGES.map(() => false);
}

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function findInteractionId(object?: THREE.Object3D | null) {
  let current = object;
  while (current) {
    const interaction = current.userData.interaction;
    if (typeof interaction === "string") return interaction;
    current = current.parent;
  }
  return undefined;
}

function isHierarchyVisible(object?: THREE.Object3D | null) {
  let current = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

export default function YarnMakerViewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldRef = useRef<YarnWorld | null>(null);
  const stageRef = useRef(0);
  const primaryActionRef = useRef<() => void>(() => undefined);
  const interactionActionRef = useRef<(interactionId: string) => void>(
    () => undefined,
  );
  const backActionRef = useRef<() => void>(() => undefined);
  const lessonStartedAtRef = useRef<number | null>(null);

  const [started, setStarted] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [stage, setStage] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>(emptyCompletion);
  const [feedback, setFeedback] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [fibreYarnChecks, setFibreYarnChecks] = useState<FibreCheckId[]>([]);
  const [cardingStep, setCardingStep] = useState(0);
  const [cardingSpeed, setCardingSpeed] = useState(0);
  const [combingProgress, setCombingProgress] = useState(0);
  const [drawingSpeed, setDrawingSpeed] = useState(0);
  const [drawingProgress, setDrawingProgress] = useState(0);
  const [twistLevel, setTwistLevel] = useState<YarnTwistLevel>();
  const [twistChecks, setTwistChecks] = useState<YarnTwistLevel[]>([]);
  const [spinningStep, setSpinningStep] = useState(0);
  const [spinningDrawingSpeed, setSpinningDrawingSpeed] = useState(0);
  const [spinningTwist, setSpinningTwist] = useState(0);
  const [yarnTension, setYarnTension] = useState(0);
  const [windingStep, setWindingStep] = useState(0);
  const [windingProgress, setWindingProgress] = useState(0);
  const [windingSpeed, setWindingSpeed] = useState(0);
  const [guidePosition, setGuidePosition] = useState(0);
  const [qualityChecks, setQualityChecks] = useState<YarnQualityCheck[]>([]);
  const [productChecks, setProductChecks] = useState<ProductId[]>([]);
  const [processSequence, setProcessSequence] = useState<ProcessName[]>([]);
  const [challengeStep, setChallengeStep] = useState(0);
  const [challengeScore, setChallengeScore] = useState(0);
  const [challengeChecks, setChallengeChecks] = useState<ChallengeTask[]>([]);

  const speakStage = useCallback((index: number) => {
    unlockNarration();
    playNarration(NARRATIONS[index]);
  }, []);

  const completeStage = useCallback((index: number, message: string) => {
    setCompleted((current) =>
      current.map((value, position) => (position === index ? true : value)),
    );
    setFeedback(message);
  }, []);

  const goToStage = useCallback(
    (next: number) => {
      const safeStage = THREE.MathUtils.clamp(next, 0, STAGES.length - 1);
      stageRef.current = safeStage;
      setStage(safeStage);
      setFeedback("");
      speakStage(safeStage);
    },
    [speakStage],
  );

  const inspectFibre = useCallback(
    (checkId?: FibreCheckId) => {
      setFibreYarnChecks((current) => {
        const nextCheck =
          checkId ?? FIBRE_CHECKS.find(([id]) => !current.includes(id))?.[0];
        if (!nextCheck || current.includes(nextCheck)) return current;
        const next = [...current, nextCheck];
        const label =
          FIBRE_CHECKS.find(([id]) => id === nextCheck)?.[1] ?? nextCheck;
        if (next.length === FIBRE_CHECKS.length) {
          completeStage(
            0,
            "Comparison complete: twisting many short fibres creates a longer, stronger strand of yarn.",
          );
        } else {
          setFeedback(
            `${label} inspected · ${next.length} of ${FIBRE_CHECKS.length} samples.`,
          );
        }
        return next;
      });
    },
    [completeStage],
  );

  const completeCardingStep = useCallback(() => {
    setCardingStep((current) => {
      const next = Math.min(CARDING_STEPS.length, current + 1);
      if (next === CARDING_STEPS.length) {
        setCardingSpeed(0.65);
        completeStage(
          1,
          "Carding complete: tangled clumps opened into a broad soft web of partly aligned fibres.",
        );
      } else {
        setFeedback(
          `${CARDING_STEPS[next - 1]} complete · ${next} of ${CARDING_STEPS.length} steps.`,
        );
      }
      return next;
    });
  }, [completeStage]);

  const completeCombingStep = useCallback(() => {
    setCombingProgress((current) => {
      const next = Math.min(COMBING_STEPS.length, current + 1);
      if (next === COMBING_STEPS.length) {
        completeStage(
          2,
          "Combing complete: the long fibres are nearly parallel and form a soft untwisted sliver.",
        );
      } else {
        setFeedback(
          `${COMBING_STEPS[next - 1]} complete · ${next} of ${COMBING_STEPS.length} steps.`,
        );
      }
      return next;
    });
  }, [completeStage]);

  const chooseDrawingSpeed = useCallback(
    (speed: "slow" | "correct" | "fast") => {
      if (speed === "slow") {
        setDrawingSpeed(0.45);
        setDrawingProgress(35);
        setFeedback(
          "The strand is still too thick and uneven. Increase the second roller speed slightly.",
        );
        return;
      }
      if (speed === "fast") {
        setDrawingSpeed(1.6);
        setDrawingProgress(70);
        setFeedback(
          "The strand broke because the fibres were pulled too quickly. Reduce the speed.",
        );
        return;
      }
      setDrawingSpeed(1);
      setDrawingProgress(100);
      completeStage(
        3,
        "Correct: the thick sliver is now a thinner, continuous and even roving.",
      );
    },
    [completeStage],
  );

  const testTwist = useCallback(
    (level?: YarnTwistLevel) => {
      setTwistChecks((current) => {
        const order: YarnTwistLevel[] = ["none", "high", "correct"];
        const nextLevel =
          level ?? order.find((item) => !current.includes(item));
        if (!nextLevel || current.includes(nextLevel)) return current;
        setTwistLevel(nextLevel);
        const next = [...current, nextLevel];
        if (next.length === order.length) {
          completeStage(
            4,
            "Twist experiment complete: correct twist produces yarn that is strong, flexible and even.",
          );
        } else if (nextLevel === "none") {
          setFeedback("No twist: the fibres slide apart immediately.");
        } else {
          setFeedback(
            "Too much twist: the yarn becomes hard, curled and kinked.",
          );
        }
        return next;
      });
    },
    [completeStage],
  );

  const completeSpinningStep = useCallback(() => {
    setSpinningStep((current) => {
      const next = Math.min(SPINNING_STEPS.length, current + 1);
      if (next >= 2) setSpinningDrawingSpeed(0.68);
      if (next >= 3) setSpinningTwist(0.64);
      if (next >= 4) setYarnTension(0.58);
      if (next === SPINNING_STEPS.length) {
        completeStage(
          5,
          "Spinning balanced: drawing controls thickness while correct twist and tension create continuous yarn.",
        );
      } else {
        setFeedback(
          `${SPINNING_STEPS[next - 1]} complete · ${next} of ${SPINNING_STEPS.length} controls.`,
        );
      }
      return next;
    });
  }, [completeStage]);

  const completeWindingStep = useCallback(() => {
    setWindingStep((current) => {
      const next = Math.min(WINDING_STEPS.length, current + 1);
      setWindingSpeed(next >= 2 ? 0.58 : 0.25);
      setGuidePosition(next >= 3 ? 0.9 : 0);
      setWindingProgress((next / WINDING_STEPS.length) * 100);
      if (next === WINDING_STEPS.length) {
        completeStage(
          6,
          "Winding complete: the yarn forms neat, even layers and will unwind without tangling.",
        );
      } else {
        setFeedback(
          `${WINDING_STEPS[next - 1]} complete · ${next} of ${WINDING_STEPS.length} steps.`,
        );
      }
      return next;
    });
  }, [completeStage]);

  const runQualityCheck = useCallback(
    (check?: YarnQualityCheck) => {
      setQualityChecks((current) => {
        const nextCheck =
          check ?? QUALITY_CHECKS.find(([id]) => !current.includes(id))?.[0];
        if (!nextCheck || current.includes(nextCheck)) return current;
        const next = [...current, nextCheck];
        const label =
          QUALITY_CHECKS.find(([id]) => id === nextCheck)?.[1] ?? nextCheck;
        if (next.length === QUALITY_CHECKS.length) {
          completeStage(
            7,
            "Yarn quality approved: continuous, strong, evenly twisted, uniform and neatly wound.",
          );
        } else {
          setFeedback(
            `${label} approved · ${next.length} of ${QUALITY_CHECKS.length} tests.`,
          );
        }
        return next;
      });
    },
    [completeStage],
  );

  const inspectProduct = useCallback((product?: ProductId) => {
    setProductChecks((current) => {
      const nextProduct =
        product ?? PRODUCTS.find(([id]) => !current.includes(id))?.[0];
      if (!nextProduct || current.includes(nextProduct)) return current;
      const next = [...current, nextProduct];
      const label =
        PRODUCTS.find(([id]) => id === nextProduct)?.[1] ?? nextProduct;
      setFeedback(
        `${label} inspected · ${next.length} of ${PRODUCTS.length} products.`,
      );
      return next;
    });
  }, []);

  const placeProcess = useCallback(
    (process?: ProcessName) => {
      setProcessSequence((current) => {
        const expected = PROCESS_ORDER[current.length];
        const selection = process ?? expected;
        if (!expected || !selection) return current;
        if (selection !== expected) {
          setFeedback(
            `Not yet. ${selection} is not the next step after ${current.at(-1) ?? "loose fibres"}.`,
          );
          return current;
        }
        const next = [...current, selection];
        if (
          next.length === PROCESS_ORDER.length &&
          productChecks.length === PRODUCTS.length
        ) {
          completeStage(
            8,
            "Journey complete: card, comb, draw, spin and wind the yarn before using it in woollen products.",
          );
        } else if (next.length === PROCESS_ORDER.length) {
          setFeedback(
            "Process line complete. Inspect each woollen product to finish this mission.",
          );
        } else {
          setFeedback(
            `${selection} placed correctly · ${next.length} of ${PROCESS_ORDER.length} processes.`,
          );
        }
        return next;
      });
    },
    [completeStage, productChecks.length],
  );

  useEffect(() => {
    if (
      stage === 8 &&
      processSequence.length === PROCESS_ORDER.length &&
      productChecks.length === PRODUCTS.length &&
      !completed[8]
    ) {
      completeStage(
        8,
        "Journey complete: card, comb, draw, spin and wind the yarn before using it in woollen products.",
      );
    }
  }, [
    completeStage,
    completed,
    processSequence.length,
    productChecks.length,
    stage,
  ]);

  const answerChallenge = useCallback(
    (task: ChallengeTask, correct: boolean, wrongMessage: string) => {
      const expected = CHALLENGE_TASKS[challengeStep];
      if (task !== expected) return;
      if (!correct) {
        setFeedback(wrongMessage);
        return;
      }
      const nextChecks = challengeChecks.includes(task)
        ? challengeChecks
        : [...challengeChecks, task];
      const nextStep = Math.min(CHALLENGE_TASKS.length, challengeStep + 1);
      const nextScore = Math.min(50, nextChecks.length * 10);
      setChallengeChecks(nextChecks);
      setChallengeStep(nextStep);
      setChallengeScore(nextScore);
      if (nextStep === CHALLENGE_TASKS.length) {
        completeStage(
          9,
          "Mission accomplished: 50 out of 50. Three bobbins are ready for knitting and weaving!",
        );
      } else {
        setFeedback(
          `Correct · ${nextScore}/50 points · ${CHALLENGE_TASKS.length - nextStep} engineering tasks remaining.`,
        );
      }
    },
    [challengeChecks, challengeStep, completeStage],
  );

  const performPrimary = useCallback(() => {
    if (completed[stage]) {
      if (stage < STAGES.length - 1) goToStage(stage + 1);
      else speakStage(stage);
      return;
    }
    switch (stage) {
      case 0:
        inspectFibre();
        break;
      case 1:
        completeCardingStep();
        break;
      case 2:
        completeCombingStep();
        break;
      case 3:
        setFeedback(
          "Choose a roller speed and use the strand evidence before continuing.",
        );
        break;
      case 4:
        testTwist();
        break;
      case 5:
        completeSpinningStep();
        break;
      case 6:
        completeWindingStep();
        break;
      case 7:
        runQualityCheck();
        break;
      case 8:
        setFeedback(
          "Inspect a woollen product or choose the next machine in the process line.",
        );
        break;
      case 9:
        setFeedback(
          "Choose the correct engineering decision for the active station.",
        );
        break;
    }
  }, [
    completeCardingStep,
    completeCombingStep,
    completeSpinningStep,
    completeWindingStep,
    completed,
    goToStage,
    inspectFibre,
    runQualityCheck,
    speakStage,
    stage,
    testTwist,
  ]);

  const performInteraction = useCallback(
    (interactionId: string) => {
      if (interactionId === "yarn-maker-primary-action") {
        performPrimary();
        return;
      }

      if (stage === 0) {
        const fibreInteraction: Record<string, FibreCheckId> = {
          "yarn-maker-loose-fibre-sample": "loose-fibre",
          "yarn-maker-finished-yarn-sample": "finished-yarn",
          "yarn-maker-magnified-twist": "magnified-twist",
        };
        const sample = fibreInteraction[interactionId];
        if (sample) inspectFibre(sample);
        return;
      }

      if (stage === 1) {
        const sequence = [
          "yarn-maker-carding-feed",
          "yarn-maker-carding-cover",
          "yarn-maker-carding-start",
          "yarn-maker-carding-speed",
        ];
        if (interactionId === sequence[cardingStep]) completeCardingStep();
        else
          setFeedback(
            `Use the station in order: ${CARDING_STEPS[cardingStep] ?? "inspect the carded web"}.`,
          );
        return;
      }

      if (stage === 2 && interactionId === "yarn-maker-combing-handle") {
        completeCombingStep();
        return;
      }

      if (
        stage === 3 &&
        (interactionId === "yarn-maker-drawing-speed" ||
          interactionId === "yarn-maker-drawing-rollers")
      ) {
        chooseDrawingSpeed("correct");
        return;
      }

      if (stage === 4 && interactionId.startsWith("yarn-maker-twist-")) {
        const level = interactionId.replace(
          "yarn-maker-twist-",
          "",
        ) as YarnTwistLevel;
        testTwist(level);
        return;
      }

      if (stage === 5) {
        const sequence = [
          "yarn-maker-spinning-feed",
          "yarn-maker-spinning-drawing-control",
          "yarn-maker-spinning-twist-control",
          "yarn-maker-spinning-tension-control",
        ];
        if (interactionId === sequence[spinningStep]) completeSpinningStep();
        else
          setFeedback(
            `Complete the spinning controls in order: ${SPINNING_STEPS[spinningStep] ?? "inspect the yarn"}.`,
          );
        return;
      }

      if (stage === 6) {
        const sequence = [
          "yarn-maker-winding-bobbin",
          "yarn-maker-winding-speed",
          "yarn-maker-winding-guide",
          "yarn-maker-winding-bobbin",
        ];
        if (interactionId === sequence[windingStep]) completeWindingStep();
        else
          setFeedback(
            `Complete the winding controls in order: ${WINDING_STEPS[windingStep] ?? "inspect the finished bobbin"}.`,
          );
        return;
      }

      if (stage === 7 && interactionId.startsWith("yarn-maker-quality-")) {
        const check = interactionId.replace(
          "yarn-maker-quality-",
          "",
        ) as YarnQualityCheck;
        runQualityCheck(check);
        return;
      }

      if (stage === 8) {
        if (interactionId.startsWith("yarn-maker-product-")) {
          inspectProduct(
            interactionId.replace("yarn-maker-product-", "") as ProductId,
          );
          return;
        }
        if (interactionId.startsWith("yarn-maker-process-")) {
          const process = interactionId.replace("yarn-maker-process-", "");
          const processName = PROCESS_ORDER.find(
            (item) => item.toLowerCase() === process,
          );
          if (processName) placeProcess(processName);
          else
            setFeedback(
              "Select the five machine stages: carding, combing, drawing, spinning and winding.",
            );
        }
        return;
      }

      if (stage === 9 && interactionId.startsWith("yarn-maker-challenge-")) {
        const task = interactionId.replace(
          "yarn-maker-challenge-",
          "",
        ) as ChallengeTask;
        const expected = CHALLENGE_TASKS[challengeStep];
        if (CHALLENGE_TASKS.includes(task)) {
          answerChallenge(
            task,
            task === expected,
            `That station is not next. Read the fibre evidence and choose the next process.`,
          );
        }
      }
    },
    [
      answerChallenge,
      cardingStep,
      challengeStep,
      chooseDrawingSpeed,
      completeCardingStep,
      completeCombingStep,
      completeSpinningStep,
      completeWindingStep,
      inspectFibre,
      inspectProduct,
      performPrimary,
      placeProcess,
      runQualityCheck,
      spinningStep,
      stage,
      testTwist,
      windingStep,
    ],
  );

  const restart = useCallback(() => {
    stopNarration();
    stageRef.current = 0;
    lessonStartedAtRef.current = performance.now();
    setStage(0);
    setCompleted(emptyCompletion());
    setFeedback("");
    setElapsedSeconds(0);
    setFibreYarnChecks([]);
    setCardingStep(0);
    setCardingSpeed(0);
    setCombingProgress(0);
    setDrawingSpeed(0);
    setDrawingProgress(0);
    setTwistLevel(undefined);
    setTwistChecks([]);
    setSpinningStep(0);
    setSpinningDrawingSpeed(0);
    setSpinningTwist(0);
    setYarnTension(0);
    setWindingStep(0);
    setWindingProgress(0);
    setWindingSpeed(0);
    setGuidePosition(0);
    setQualityChecks([]);
    setProductChecks([]);
    setProcessSequence([]);
    setChallengeStep(0);
    setChallengeScore(0);
    setChallengeChecks([]);
    speakStage(0);
  }, [speakStage]);

  useEffect(() => {
    primaryActionRef.current = performPrimary;
    interactionActionRef.current = performInteraction;
    backActionRef.current = () => goToStage(stageRef.current - 1);
  }, [goToStage, performInteraction, performPrimary]);

  useEffect(() => {
    if (!started) return;
    if (lessonStartedAtRef.current === null)
      lessonStartedAtRef.current = performance.now();
    const timer = window.setInterval(() => {
      const startedAt = lessonStartedAtRef.current;
      if (startedAt !== null)
        setElapsedSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("xr" in navigator)) return;
    (
      navigator as Navigator & {
        xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
      }
    ).xr
      ?.isSessionSupported?.("immersive-vr")
      .then(setVrSupported)
      .catch(() => setVrSupported(false));
  }, []);

  const actionLabel = completed[stage]
    ? stage === STAGES.length - 1
      ? "Replay final summary"
      : "Continue to next mission"
    : stage === 0
      ? `${STAGES[stage].action} · ${fibreYarnChecks.length}/${FIBRE_CHECKS.length}`
      : stage === 1
        ? `${STAGES[stage].action} · ${cardingStep}/${CARDING_STEPS.length}`
        : stage === 2
          ? `${STAGES[stage].action} · ${combingProgress}/${COMBING_STEPS.length}`
          : stage === 4
            ? `${STAGES[stage].action} · ${twistChecks.length}/3`
            : stage === 5
              ? `${STAGES[stage].action} · ${spinningStep}/${SPINNING_STEPS.length}`
              : stage === 6
                ? `${STAGES[stage].action} · ${windingStep}/${WINDING_STEPS.length}`
                : stage === 7
                  ? `${STAGES[stage].action} · ${qualityChecks.length}/${QUALITY_CHECKS.length}`
                  : stage === 8
                    ? `${STAGES[stage].action} · ${productChecks.length + processSequence.length}/9`
                    : stage === 9
                      ? `${STAGES[stage].action} · ${challengeScore}/50 points`
                      : STAGES[stage].action;

  const snapshot = useMemo<YarnMakerWorldSnapshot>(
    () => ({
      stage,
      fibreYarnChecks,
      cardingStep,
      cardingSpeed,
      combingProgress,
      drawingSpeed,
      drawingProgress,
      twistLevel,
      twistChecks,
      spinningStep,
      spinningDrawingSpeed,
      spinningTwist,
      yarnTension,
      windingStep,
      windingProgress,
      windingSpeed,
      guidePosition,
      qualityChecks,
      productChecks,
      sequenceCount: processSequence.length,
      challengeStep,
      challengeScore,
      challengeChecks,
      completed: completed[stage],
      feedback,
      actionLabel,
      title: STAGES[stage].title,
      cue: STAGES[stage].cue,
    }),
    [
      actionLabel,
      cardingSpeed,
      cardingStep,
      challengeChecks,
      challengeScore,
      challengeStep,
      combingProgress,
      completed,
      drawingProgress,
      drawingSpeed,
      feedback,
      fibreYarnChecks,
      guidePosition,
      processSequence.length,
      productChecks,
      qualityChecks,
      spinningDrawingSpeed,
      spinningStep,
      spinningTwist,
      stage,
      twistChecks,
      twistLevel,
      windingProgress,
      windingSpeed,
      windingStep,
      yarnTension,
    ],
  );

  useEffect(() => {
    worldRef.current?.setSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.05,
      100,
    );
    camera.position.set(0, 2.05, 6.3);
    camera.lookAt(0, 1.3, 0);
    const world = createYarnMakerWorld(scene, renderer);
    worldRef.current = world;
    world.setSnapshot(snapshot);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.3, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 2.2;
    controls.maxDistance = 10;
    controls.minPolarAngle = 0.24;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;

    const raycaster = new THREE.Raycaster();
    const onControllerSelect = (event: Event) => {
      const controller = event.target as unknown as THREE.XRTargetRaySpace;
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      raycaster.ray.direction
        .set(0, 0, -1)
        .applyQuaternion(controller.quaternion);
      const hit = raycaster
        .intersectObjects(world.interactables, true)
        .find(({ object }) => isHierarchyVisible(object));
      const interactionId = findInteractionId(hit?.object);
      if (interactionId) interactionActionRef.current(interactionId);
    };
    const controllers = [
      renderer.xr.getController(0),
      renderer.xr.getController(1),
    ];
    controllers.forEach((controller) => {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.006, 1.9, 6),
        new THREE.MeshBasicMaterial({
          color: 0xbdd4ff,
          transparent: true,
          opacity: 0.88,
        }),
      );
      beam.rotation.x = Math.PI / 2;
      beam.position.z = -0.95;
      controller.add(beam);
      controller.addEventListener("selectstart", onControllerSelect as any);
    });

    const questVr = createQuestVrControls({
      renderer,
      scene,
      camera,
      controllers,
      onPrimary: () => primaryActionRef.current(),
      onBack: () => backActionRef.current(),
      onNarrate: () => speakStage(stageRef.current),
      startPosition: new THREE.Vector3(0, 0, 2.8),
      movementBounds: new THREE.Box2(
        new THREE.Vector2(-6.4, -5.4),
        new THREE.Vector2(6.4, 5.6),
      ),
    });

    const pointer = new THREE.Vector2();
    const onPointerUp = (event: PointerEvent) => {
      if (renderer.xr.isPresenting || event.button !== 0) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster
        .intersectObjects(world.interactables, true)
        .find(({ object }) => isHierarchyVisible(object));
      const interactionId = findInteractionId(hit?.object);
      if (interactionId) interactionActionRef.current(interactionId);
    };
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const elapsed = clock.getElapsedTime();
      questVr.update();
      if (!renderer.xr.isPresenting) controls.update();
      const activeCamera = renderer.xr.isPresenting
        ? renderer.xr.getCamera()
        : camera;
      world.update(elapsed, activeCamera);
      renderer.render(scene, camera);
    });

    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controllers.forEach((controller) =>
        controller.removeEventListener(
          "selectstart",
          onControllerSelect as any,
        ),
      );
      controls.dispose();
      questVr.dispose();
      world.dispose();
      renderer.dispose();
      stopNarration();
      worldRef.current = null;
      rendererRef.current = null;
      if (mount.contains(renderer.domElement))
        mount.removeChild(renderer.domElement);
    };
    // The world is created once; mission state is projected through setSnapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speakStage]);

  const enterVR = useCallback(async () => {
    const xr = (
      navigator as Navigator & {
        xr?: {
          requestSession?: (
            mode: string,
            options: object,
          ) => Promise<XRSession>;
        };
      }
    ).xr;
    if (!rendererRef.current || !xr?.requestSession) return;
    try {
      unlockNarration();
      const session = await xr.requestSession("immersive-vr", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["bounded-floor", "hand-tracking"],
      });
      await rendererRef.current.xr.setSession(session);
      lessonStartedAtRef.current ??= performance.now();
      setStarted(true);
      window.setTimeout(() => speakStage(stageRef.current), 700);
    } catch {
      setVrSupported(false);
      setFeedback(
        "VR could not start. Continue in browser mode, then check the headset browser permissions.",
      );
    }
  }, [speakStage]);

  const startBrowser = useCallback(() => {
    unlockNarration();
    lessonStartedAtRef.current = performance.now();
    setStarted(true);
    speakStage(stageRef.current);
  }, [speakStage]);

  const renderChallenge = () => {
    const task = CHALLENGE_TASKS[challengeStep];
    if (task === "carding")
      return (
        <div
          className={styles.choiceGrid}
          aria-label="Independent carding decision"
        >
          <button
            className={styles.choice}
            onClick={() => answerChallenge(task, true, "")}
          >
            Feed wool, close cover, use green-zone roller speed
          </button>
          <button
            className={styles.choice}
            onClick={() =>
              answerChallenge(
                task,
                false,
                "Carding needs a closed safety cover and controlled roller speed.",
              )
            }
          >
            Run uncovered rollers at maximum speed
          </button>
        </div>
      );
    if (task === "combing")
      return (
        <div
          className={styles.choiceGrid}
          aria-label="Independent combing decision"
        >
          <button
            className={styles.choice}
            onClick={() =>
              answerChallenge(
                task,
                false,
                "Combing follows the arrows so longer fibres become parallel.",
              )
            }
          >
            Move against the arrows and cross the fibres
          </button>
          <button
            className={styles.choice}
            onClick={() => answerChallenge(task, true, "")}
          >
            Follow arrows and separate short fibres
          </button>
        </div>
      );
    if (task === "drawing")
      return (
        <div
          className={styles.choiceGrid}
          aria-label="Independent drawing decision"
        >
          <button
            className={styles.choice}
            onClick={() =>
              answerChallenge(
                task,
                false,
                "Too little speed leaves the sliver thick and uneven.",
              )
            }
          >
            Keep both roller pairs at the same slow speed
          </button>
          <button
            className={styles.choice}
            onClick={() => answerChallenge(task, true, "")}
          >
            Use a slightly faster second roller pair
          </button>
          <button
            className={styles.choice}
            onClick={() =>
              answerChallenge(
                task,
                false,
                "Excessive drawing speed breaks the strand.",
              )
            }
          >
            Pull the strand at maximum speed
          </button>
        </div>
      );
    if (task === "spinning")
      return (
        <div
          className={styles.choiceGrid}
          aria-label="Independent spinning decision"
        >
          <button
            className={styles.choice}
            onClick={() => answerChallenge(task, true, "")}
          >
            Correct twist with balanced green-zone tension
          </button>
          <button
            className={styles.choice}
            onClick={() =>
              answerChallenge(task, false, "No twist lets fibres slide apart.")
            }
          >
            No twist and very low tension
          </button>
          <button
            className={styles.choice}
            onClick={() =>
              answerChallenge(
                task,
                false,
                "Excessive twist and tension make yarn kink or break.",
              )
            }
          >
            Maximum twist and maximum tension
          </button>
        </div>
      );
    if (task === "winding")
      return (
        <div
          className={styles.choiceGrid}
          aria-label="Independent winding decision"
        >
          <button
            className={styles.choice}
            onClick={() =>
              answerChallenge(
                task,
                false,
                "A stationary guide creates a bulge in one place.",
              )
            }
          >
            Hold the guide in the centre at high speed
          </button>
          <button
            className={styles.choice}
            onClick={() => answerChallenge(task, true, "")}
          >
            Moderate speed with smooth side-to-side guiding
          </button>
        </div>
      );
    return null;
  };

  const renderStageControls = () => {
    if (stage === 0)
      return (
        <div
          className={styles.choiceGrid}
          aria-label="Fibre and yarn comparison"
        >
          {FIBRE_CHECKS.map(([id, label]) => (
            <button
              key={id}
              className={styles.choice}
              data-selected={fibreYarnChecks.includes(id)}
              disabled={fibreYarnChecks.includes(id)}
              onClick={() => inspectFibre(id)}
            >
              {fibreYarnChecks.includes(id) ? "✓" : "◉"} {label}
            </button>
          ))}
        </div>
      );
    if (stage === 1)
      return (
        <ul className={styles.stepList}>
          {CARDING_STEPS.map((label, index) => (
            <li key={label} data-done={index < cardingStep}>
              {index < cardingStep ? "✓" : index + 1} {label}
            </li>
          ))}
        </ul>
      );
    if (stage === 2)
      return (
        <ul className={styles.stepList}>
          {COMBING_STEPS.map((label, index) => (
            <li key={label} data-done={index < combingProgress}>
              {index < combingProgress ? "✓" : index + 1} {label}
            </li>
          ))}
        </ul>
      );
    if (stage === 3)
      return (
        <div className={styles.choiceGrid} aria-label="Drawing roller speed">
          <button
            className={styles.choice}
            onClick={() => chooseDrawingSpeed("slow")}
          >
            Too slow · strand remains thick
          </button>
          <button
            className={styles.choice}
            onClick={() => chooseDrawingSpeed("correct")}
          >
            Balanced · thinner even roving
          </button>
          <button
            className={styles.choice}
            onClick={() => chooseDrawingSpeed("fast")}
          >
            Too fast · strand breaks
          </button>
        </div>
      );
    if (stage === 4)
      return (
        <div className={styles.choiceGrid} aria-label="Twist experiment">
          {(["none", "high", "correct"] as YarnTwistLevel[]).map((level) => (
            <button
              key={level}
              className={styles.choice}
              data-selected={twistChecks.includes(level)}
              disabled={twistChecks.includes(level)}
              onClick={() => testTwist(level)}
            >
              {twistChecks.includes(level) ? "✓" : "↻"}{" "}
              {level === "none"
                ? "No twist · fibres separate"
                : level === "high"
                  ? "Too much twist · hard and kinked"
                  : "Correct twist · strong and flexible"}
            </button>
          ))}
        </div>
      );
    if (stage === 5)
      return (
        <ul className={styles.stepList}>
          {SPINNING_STEPS.map((label, index) => (
            <li key={label} data-done={index < spinningStep}>
              {index < spinningStep ? "✓" : index + 1} {label}
            </li>
          ))}
        </ul>
      );
    if (stage === 6)
      return (
        <ul className={styles.stepList}>
          {WINDING_STEPS.map((label, index) => (
            <li key={label} data-done={index < windingStep}>
              {index < windingStep ? "✓" : index + 1} {label}
            </li>
          ))}
        </ul>
      );
    if (stage === 7)
      return (
        <div className={styles.choiceGrid} aria-label="Yarn quality tests">
          {QUALITY_CHECKS.map(([id, label]) => (
            <button
              key={id}
              className={styles.choice}
              data-selected={qualityChecks.includes(id)}
              disabled={qualityChecks.includes(id)}
              onClick={() => runQualityCheck(id)}
            >
              {qualityChecks.includes(id) ? "✓" : "◎"} {label}
            </button>
          ))}
        </div>
      );
    if (stage === 8)
      return (
        <>
          <div className={styles.choiceGrid} aria-label="Woollen yarn products">
            {PRODUCTS.map(([id, label]) => (
              <button
                key={id}
                className={styles.choice}
                data-selected={productChecks.includes(id)}
                disabled={productChecks.includes(id)}
                onClick={() => inspectProduct(id)}
              >
                {productChecks.includes(id) ? "✓" : "◉"} {label}
              </button>
            ))}
          </div>
          <div className={styles.matchHeading}>
            Process: {processSequence.join(" → ") || "Choose the first machine"}
          </div>
          <div className={styles.choiceGrid} aria-label="Yarn process sequence">
            {PROCESS_CHOICES.map((process) => (
              <button
                key={process}
                className={styles.choice}
                data-selected={processSequence.includes(process)}
                disabled={processSequence.includes(process)}
                onClick={() => placeProcess(process)}
              >
                {processSequence.includes(process) ? "✓" : "→"} {process}
              </button>
            ))}
          </div>
        </>
      );
    if (stage === 9) return renderChallenge();
    return null;
  };

  const completionPercent =
    ((stage + (completed[stage] ? 1 : 0)) / STAGES.length) * 100;

  return (
    <main className={styles.root} data-yarn-stage={STAGES[stage].id}>
      <div
        ref={mountRef}
        className={styles.canvas}
        data-testid="simulation-canvas"
        aria-label="Interactive wool spinning and yarn winding factory"
      />

      {!started && (
        <section
          className={styles.launch}
          style={{
            background:
              'linear-gradient(90deg, rgba(12, 24, 48, .95), rgba(24, 33, 58, .35) 58%, rgba(33, 20, 41, .82)), url("/simulations/c7-ch03-a03-spinning-and-rolling-of-wool/environment.webp") center / cover no-repeat',
          }}
        >
          <div className={styles.launchCard}>
            <div className={styles.eyebrow}>
              Class 7 · Science · Chapter 3 · Activity 3
            </div>
            <h1 className={styles.launchTitle}>The Yarn Maker Mission</h1>
            <p className={styles.launchCopy}>
              Enter a realistic 360° wool factory and transform loose blue, red
              and green fibres into strong, evenly wound yarn.
            </p>
            <div className={styles.launchFacts}>
              <span>6-minute factory mission</span>
              <span>Ten evidence-based activities</span>
              <span>Indian English narration</span>
              <span>Browser + Meta Quest</span>
            </div>
            <div className={styles.launchActions}>
              <button
                data-testid="simulation-launch"
                className={styles.primary}
                onClick={startBrowser}
              >
                Begin yarn mission
              </button>
              {vrSupported && (
                <button className={styles.secondary} onClick={enterVR}>
                  Enter immersive VR
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {started && (
        <div className={styles.hud}>
          <header className={styles.topbar}>
            <div className={styles.missionName}>
              <strong>Junior Yarn Engineer</strong>
              <span>{formatClock(elapsedSeconds)} / 06:00</span>
            </div>
            <div className={styles.topActions}>
              <button
                data-testid="narration-replay"
                className={styles.iconButton}
                onClick={() => speakStage(stage)}
              >
                🔊 <span>Replay</span>
              </button>
              <button
                data-testid="restart"
                className={styles.iconButton}
                onClick={restart}
              >
                ↻ <span>Restart</span>
              </button>
              {vrSupported && (
                <button className={styles.iconButton} onClick={enterVR}>
                  🥽 <span>VR</span>
                </button>
              )}
            </div>
          </header>

          <aside className={styles.panel} aria-label="Yarn Maker lesson panel">
            <div className={styles.panelProgress}>
              <span style={{ width: `${completionPercent}%` }} />
            </div>
            <div className={styles.panelScroll}>
              <div className={styles.stageEyebrow}>
                Mission {stage + 1} of {STAGES.length}
              </div>
              <h2 data-testid="stage-title" className={styles.stageTitle}>
                {STAGES[stage].title}
              </h2>
              <p data-testid="stage-cue" className={styles.cue}>
                {STAGES[stage].cue}
              </p>
              <p className={styles.detail}>{STAGES[stage].detail}</p>
              {feedback && (
                <p role="status" className={styles.feedback}>
                  {feedback}
                </p>
              )}
              {renderStageControls()}
              {completed[9] && (
                <div className={styles.complete}>
                  <div>🧶</div>
                  <strong>Master Yarn Engineer</strong>
                  <span>
                    50/50 · Three coloured bobbins are ready for knitting and
                    weaving.
                  </span>
                </div>
              )}
              <button
                data-testid="primary-action"
                className={`${styles.primary} ${styles.primaryAction}`}
                onClick={performPrimary}
              >
                {actionLabel}
              </button>
              <div
                className={styles.badges}
                aria-label="Yarn engineering evidence badges"
              >
                <span data-earned={completed[1]}>◉ Carding</span>
                <span data-earned={completed[3]}>◉ Roving</span>
                <span data-earned={completed[5]}>◉ Spinning</span>
                <span data-earned={completed[9]}>◉ Master engineer</span>
              </div>
            </div>
            <footer className={styles.panelFooter}>
              <button
                className={styles.navButton}
                disabled={stage === 0}
                onClick={() => goToStage(stage - 1)}
              >
                ← Previous
              </button>
              <button
                className={styles.navButton}
                disabled={!completed[stage] || stage === STAGES.length - 1}
                onClick={() => goToStage(stage + 1)}
              >
                Next mission →
              </button>
            </footer>
          </aside>

          <div className={styles.controllerHint}>
            Browser: drag to orbit · right-drag to pan · scroll to zoom · Quest:
            trigger selects · A performs/continues · left back returns · B or
            right grip exits VR · joysticks move and turn
          </div>
        </div>
      )}
    </main>
  );
}
