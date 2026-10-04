export type PicnicPhase =
  | "welcome"
  | "fruit"
  | "paint"
  | "decorate"
  | "celebrate";
export type PicnicColour = "red" | "blue" | "yellow";
export type PicnicFruit = "red-apple" | "green-apple" | "banana";

export type PicnicState = {
  phase: PicnicPhase;
  heldFruit: PicnicFruit | null;
  packedFruit: boolean;
  brushColour: PicnicColour | null;
  paintedCells: number[];
  paintColours: Partial<Record<number, PicnicColour>>;
  flagColour: PicnicColour | null;
  plantedFlag: boolean;
  feedback: string;
  cue: string;
};

export type PicnicAction =
  | {
      type:
        | "start"
        | "place-fruit"
        | "put-down"
        | "plant-flag"
        | "next"
        | "restart";
    }
  | { type: "pick-fruit"; fruit: PicnicFruit }
  | { type: "select-paint"; colour: PicnicColour }
  | { type: "paint"; cell: number }
  | { type: "choose-flag"; colour: PicnicColour };

export const PICNIC_COLOURS: readonly {
  id: PicnicColour;
  name: string;
  hex: string;
}[] = [
  { id: "red", name: "Red", hex: "#e84e4e" },
  { id: "blue", name: "Blue", hex: "#337ce8" },
  { id: "yellow", name: "Yellow", hex: "#f7c843" },
];

export const PICNIC_FRUITS: readonly {
  id: PicnicFruit;
  name: string;
  colour: string;
}[] = [
  { id: "red-apple", name: "Red apple", colour: "red" },
  { id: "green-apple", name: "Green apple", colour: "green" },
  { id: "banana", name: "Banana", colour: "yellow" },
];

export const PICNIC_PAINT_CELL_COUNT = 24;
export const PICNIC_PAINT_REQUIRED = 6;

// IDs are shared by the on-screen teacher and optional recorded narration.
// Painting changes the cue only for a retry or the completion milestone.
export const PICNIC_NARRATION: Record<string, string> = {
  welcome:
    "Hello, friend! Let's make a colour picnic. We will pack, paint and decorate together.",
  "fruit-prompt":
    "First, pack a red fruit. Pick up a fruit and look at its colour.",
  "fruit-red": "This apple is red. Put it in the basket.",
  "fruit-green":
    "This apple is green. Have a look. We need a red fruit for our basket.",
  "fruit-yellow":
    "This banana is yellow. Have a look. We need a red fruit for our basket.",
  "fruit-correct":
    "Yes, this apple is red! Our fruit is packed. Choose Next when you are ready.",
  "fruit-try-green":
    "This apple is green. Back to the tray it goes. Look for the red fruit.",
  "fruit-try-yellow":
    "This banana is yellow. Back to the tray it goes. Look for the red fruit.",
  "fruit-empty": "Pick up a fruit first. Look for red.",
  "fruit-put-down":
    "Back on the tray. Take your time and look for the red fruit.",
  "paint-prompt":
    "Now, let us paint our picnic cup blue. Choose blue paint and brush the cup.",
  "paint-red": "This paint is red. We need blue for our cup.",
  "paint-blue": "This paint is blue. Move your brush over the cup.",
  "paint-yellow": "This paint is yellow. We need blue for our cup.",
  "paint-empty": "Choose a paint pot first. We are looking for blue.",
  "paint-try-red": "That is red paint. Choose blue and paint this patch again.",
  "paint-try-yellow":
    "That is yellow paint. Choose blue and paint this patch again.",
  "paint-done":
    "Lovely blue brush strokes! Our cup is ready. You can keep painting, or choose Next.",
  "decorate-prompt":
    "Make this picnic yours. Choose any colour for a flag, then plant it beside the cloth.",
  "flag-red": "A red flag. Your choice! Plant it beside the cloth.",
  "flag-blue": "A blue flag. Your choice! Plant it beside the cloth.",
  "flag-yellow": "A yellow flag. Your choice! Plant it beside the cloth.",
  "flag-empty":
    "Choose any flag colour first. Red, blue or yellow: you decide.",
  "flag-planted": "Your flag is planted! Choose Next to enjoy our picnic.",
  celebrate:
    "Our colour picnic is ready! You found red, painted blue and chose your own flag. Well done!",
};

function isColour(value: unknown): value is PicnicColour {
  return PICNIC_COLOURS.some((colour) => colour.id === value);
}

function isFruit(value: unknown): value is PicnicFruit {
  return PICNIC_FRUITS.some((fruit) => fruit.id === value);
}

function isPaintCell(value: number): boolean {
  return (
    Number.isInteger(value) && value >= 0 && value < PICNIC_PAINT_CELL_COUNT
  );
}

function paintedCount(state: PicnicState): number {
  return new Set(state.paintedCells.filter(isPaintCell)).size;
}

function say(state: PicnicState, cue: string): PicnicState {
  const feedback = PICNIC_NARRATION[cue];
  if (state.cue === cue && state.feedback === feedback) return state;
  return { ...state, cue, feedback };
}

export function createColourPicnicState(): PicnicState {
  return {
    phase: "welcome",
    heldFruit: null,
    packedFruit: false,
    brushColour: null,
    paintedCells: [],
    paintColours: {},
    flagColour: null,
    plantedFlag: false,
    feedback: PICNIC_NARRATION.welcome,
    cue: "welcome",
  };
}

export function picnicCanContinue(state: PicnicState): boolean {
  switch (state.phase) {
    case "fruit":
      return state.packedFruit;
    case "paint":
      return state.packedFruit && paintedCount(state) >= PICNIC_PAINT_REQUIRED;
    case "decorate":
      return (
        state.packedFruit &&
        paintedCount(state) >= PICNIC_PAINT_REQUIRED &&
        state.plantedFlag &&
        isColour(state.flagColour)
      );
    default:
      return false;
  }
}

export function picnicPrompt(state: PicnicState): string {
  switch (state.phase) {
    case "welcome":
      return "Ready for a colour picnic?";
    case "fruit":
      if (state.packedFruit) return "The red apple is packed. Ready to paint?";
      if (state.heldFruit === "red-apple")
        return "Put this red apple in the basket.";
      return "Find a red fruit and put it in the basket.";
    case "paint":
      if (paintedCount(state) >= PICNIC_PAINT_REQUIRED)
        return "Our blue cup is ready. Keep painting, or choose Next.";
      if (!state.brushColour) return "Choose blue paint for our picnic cup.";
      return `Paint six patches blue. ${paintedCount(state)} of ${PICNIC_PAINT_REQUIRED} ready.`;
    case "decorate":
      if (state.plantedFlag)
        return `Your ${state.flagColour} flag is planted. Ready for our picnic?`;
      if (state.flagColour)
        return `Plant your ${state.flagColour} flag beside the cloth.`;
      return "Choose any colour for your flag. You decide!";
    case "celebrate":
      return "Our colour picnic is ready!";
  }
}

export function reduceColourPicnic(
  state: PicnicState,
  action: PicnicAction,
): PicnicState {
  // Pointer and controller events may arrive after a phase transition.
  // Runtime IDs are checked here, not only by the visible buttons.
  if (!action || typeof action !== "object") return state;

  switch (action.type) {
    case "restart":
      return createColourPicnicState();
    case "start":
      return state.phase === "welcome"
        ? say({ ...state, phase: "fruit" }, "fruit-prompt")
        : state;
    case "next":
      if (!picnicCanContinue(state)) return state;
      if (state.phase === "fruit")
        return say({ ...state, phase: "paint" }, "paint-prompt");
      if (state.phase === "paint")
        return say({ ...state, phase: "decorate" }, "decorate-prompt");
      if (state.phase === "decorate")
        return say({ ...state, phase: "celebrate" }, "celebrate");
      return state;
    case "pick-fruit":
      if (
        state.phase !== "fruit" ||
        state.packedFruit ||
        !isFruit(action.fruit)
      )
        return state;
      if (state.heldFruit === action.fruit) return state;
      return say(
        { ...state, heldFruit: action.fruit },
        {
          "red-apple": "fruit-red",
          "green-apple": "fruit-green",
          banana: "fruit-yellow",
        }[action.fruit],
      );
    case "put-down":
      if (state.phase !== "fruit" || state.packedFruit || !state.heldFruit)
        return state;
      return say({ ...state, heldFruit: null }, "fruit-put-down");
    case "place-fruit":
      if (state.phase !== "fruit" || state.packedFruit) return state;
      if (!state.heldFruit) return say(state, "fruit-empty");
      if (!isFruit(state.heldFruit)) return state;
      if (state.heldFruit === "red-apple") {
        return say(
          { ...state, heldFruit: null, packedFruit: true },
          "fruit-correct",
        );
      }
      return say(
        { ...state, heldFruit: null },
        state.heldFruit === "green-apple"
          ? "fruit-try-green"
          : "fruit-try-yellow",
      );
    case "select-paint":
      if (state.phase !== "paint" || !isColour(action.colour)) return state;
      if (state.brushColour === action.colour) return state;
      return say(
        { ...state, brushColour: action.colour },
        `paint-${action.colour}`,
      );
    case "paint": {
      if (state.phase !== "paint" || !isPaintCell(action.cell)) return state;
      if (!state.brushColour) return say(state, "paint-empty");
      if (!isColour(state.brushColour)) return state;
      // Keep the actual visible colour as well as the blue-only mastery tally.
      const coloured =
        state.paintColours?.[action.cell] === state.brushColour
          ? state
          : {
              ...state,
              paintColours: {
                ...state.paintColours,
                [action.cell]: state.brushColour,
              },
            };
      if (state.brushColour !== "blue") {
        // A wrong-colour overpaint removes that patch from the blue tally.
        // This also re-locks Next if the child drops below six blue patches.
        const corrected = state.paintedCells.includes(action.cell)
          ? {
              ...coloured,
              paintedCells: state.paintedCells.filter(
                (cell) => cell !== action.cell,
              ),
            }
          : coloured;
        return say(corrected, `paint-try-${state.brushColour}`);
      }
      if (state.paintedCells.includes(action.cell)) return coloured;
      const painted = {
        ...coloured,
        paintedCells: [...state.paintedCells, action.cell],
      };
      if (
        paintedCount(state) < PICNIC_PAINT_REQUIRED &&
        paintedCount(painted) >= PICNIC_PAINT_REQUIRED
      ) {
        return say(painted, "paint-done");
      }
      return painted;
    }
    case "choose-flag":
      if (state.phase !== "decorate" || !isColour(action.colour)) return state;
      if (state.flagColour === action.colour) return state;
      // Changing a planted design is welcome, but the new flag must be planted.
      return say(
        { ...state, flagColour: action.colour, plantedFlag: false },
        `flag-${action.colour}`,
      );
    case "plant-flag":
      if (state.phase !== "decorate" || state.plantedFlag) return state;
      if (!state.flagColour) return say(state, "flag-empty");
      if (!isColour(state.flagColour)) return state;
      return say({ ...state, plantedFlag: true }, "flag-planted");
    default:
      return state;
  }
}
