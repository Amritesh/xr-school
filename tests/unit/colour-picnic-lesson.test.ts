import { describe, expect, it } from "vitest";
import {
  PICNIC_COLOURS,
  PICNIC_FRUITS,
  PICNIC_NARRATION,
  PICNIC_PAINT_CELL_COUNT,
  PICNIC_PAINT_REQUIRED,
  createColourPicnicState,
  picnicCanContinue,
  picnicPrompt,
  reduceColourPicnic,
  type PicnicAction,
  type PicnicColour,
  type PicnicState,
} from "../../apps/web/lib/colourPicnicLesson";

function apply(state: PicnicState, ...actions: PicnicAction[]): PicnicState {
  return actions.reduce(reduceColourPicnic, state);
}

function fruitState(): PicnicState {
  return reduceColourPicnic(createColourPicnicState(), { type: "start" });
}

function paintState(): PicnicState {
  return apply(
    fruitState(),
    { type: "pick-fruit", fruit: "red-apple" },
    { type: "place-fruit" },
    { type: "next" },
  );
}

function paintedState(): PicnicState {
  const state = reduceColourPicnic(paintState(), {
    type: "select-paint",
    colour: "blue",
  });
  return Array.from(
    { length: PICNIC_PAINT_REQUIRED },
    (_, cell) => cell,
  ).reduce(
    (progress, cell) => reduceColourPicnic(progress, { type: "paint", cell }),
    state,
  );
}

function decorateState(): PicnicState {
  return reduceColourPicnic(paintedState(), { type: "next" });
}

describe("two-minute Colour Picnic lesson model", () => {
  it("starts fresh, with three paint choices and three honestly labelled fruits", () => {
    const state = createColourPicnicState();
    expect(state).toEqual({
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
    });
    expect(PICNIC_COLOURS.map((colour) => colour.id)).toEqual([
      "red",
      "blue",
      "yellow",
    ]);
    expect(PICNIC_FRUITS.map((fruit) => [fruit.id, fruit.colour])).toEqual([
      ["red-apple", "red"],
      ["green-apple", "green"],
      ["banana", "yellow"],
    ]);
    expect(PICNIC_PAINT_CELL_COUNT).toBe(24);
    expect(PICNIC_PAINT_REQUIRED).toBe(6);
    expect(picnicCanContinue(state)).toBe(false);
  });

  it("completes the sequence, keeping each activity until explicit Next", () => {
    let state = fruitState();
    expect(state.phase).toBe("fruit");
    state = apply(
      state,
      { type: "pick-fruit", fruit: "red-apple" },
      { type: "place-fruit" },
    );
    expect(state.phase).toBe("fruit");
    expect(state.heldFruit).toBeNull();
    expect(state.packedFruit).toBe(true);
    expect(picnicCanContinue(state)).toBe(true);
    state = reduceColourPicnic(state, { type: "next" });
    expect(state.phase).toBe("paint");
    state = reduceColourPicnic(state, { type: "select-paint", colour: "blue" });
    for (let cell = 0; cell < PICNIC_PAINT_REQUIRED; cell++) {
      expect(picnicCanContinue(state)).toBe(false);
      state = reduceColourPicnic(state, { type: "paint", cell });
    }
    expect(state.phase).toBe("paint");
    expect(picnicCanContinue(state)).toBe(true);
    state = reduceColourPicnic(state, { type: "next" });
    expect(state.phase).toBe("decorate");
    state = apply(
      state,
      { type: "choose-flag", colour: "yellow" },
      { type: "plant-flag" },
    );
    expect(state.phase).toBe("decorate");
    expect(picnicCanContinue(state)).toBe(true);
    state = reduceColourPicnic(state, { type: "next" });
    expect(state.phase).toBe("celebrate");
    expect(state.packedFruit).toBe(true);
    expect(state.paintedCells).toEqual([0, 1, 2, 3, 4, 5]);
    expect(state.paintColours).toEqual({
      0: "blue",
      1: "blue",
      2: "blue",
      3: "blue",
      4: "blue",
      5: "blue",
    });
    expect(state.flagColour).toBe("yellow");
    expect(state.plantedFlag).toBe(true);
    expect(state.cue).toBe("celebrate");
    expect(picnicCanContinue(state)).toBe(false);
  });

  it.each([
    ["green-apple", "green"],
    ["banana", "yellow"],
  ] as const)(
    "allows inspecting %s and gently returns a wrong match to the tray",
    (fruit, colour) => {
      const held = reduceColourPicnic(fruitState(), {
        type: "pick-fruit",
        fruit,
      });
      expect(held.heldFruit).toBe(fruit);
      expect(held.feedback).toContain(colour);
      const retry = reduceColourPicnic(held, { type: "place-fruit" });
      expect(retry.heldFruit).toBeNull();
      expect(retry.packedFruit).toBe(false);
      expect(retry.phase).toBe("fruit");
      expect(retry.feedback).toContain(colour);
      expect(retry.feedback).not.toMatch(/bad|fail|wrong|all apples/i);
      expect(picnicCanContinue(retry)).toBe(false);
      const packed = apply(
        retry,
        { type: "pick-fruit", fruit: "red-apple" },
        { type: "place-fruit" },
      );
      expect(packed.packedFruit).toBe(true);
    },
  );

  it("supports putting down a fruit and explains an empty basket action", () => {
    const empty = reduceColourPicnic(fruitState(), { type: "place-fruit" });
    expect(empty.cue).toBe("fruit-empty");
    expect(empty.packedFruit).toBe(false);
    const held = reduceColourPicnic(empty, {
      type: "pick-fruit",
      fruit: "red-apple",
    });
    expect(picnicPrompt(held)).toContain("Put");
    const returned = reduceColourPicnic(held, { type: "put-down" });
    expect(returned.heldFruit).toBeNull();
    expect(returned.packedFruit).toBe(false);
    expect(reduceColourPicnic(returned, { type: "put-down" })).toBe(returned);
  });

  it("blocks Next and cross-phase shortcuts before their work is done", () => {
    const states = [
      createColourPicnicState(),
      fruitState(),
      paintState(),
      decorateState(),
    ];
    for (const state of states) {
      expect(reduceColourPicnic(state, { type: "next" })).toBe(state);
    }
    const state = fruitState();
    expect(
      apply(
        state,
        { type: "paint", cell: 0 },
        { type: "select-paint", colour: "blue" },
        { type: "choose-flag", colour: "red" },
        { type: "plant-flag" },
      ),
    ).toBe(state);
    const flagSelected = reduceColourPicnic(decorateState(), {
      type: "choose-flag",
      colour: "red",
    });
    expect(reduceColourPicnic(flagSelected, { type: "next" })).toBe(
      flagSelected,
    );
    expect(picnicCanContinue({ ...paintedState(), packedFruit: false })).toBe(
      false,
    );
    expect(
      picnicCanContinue({
        ...flagSelected,
        plantedFlag: true,
        paintedCells: [],
      }),
    ).toBe(false);
    expect(
      picnicCanContinue({ ...paintState(), paintedCells: Array(6).fill(0) }),
    ).toBe(false);
  });

  it("counts only unique blue patches and allows more painting after the milestone", () => {
    let state = reduceColourPicnic(paintState(), {
      type: "select-paint",
      colour: "blue",
    });
    const first = reduceColourPicnic(state, { type: "paint", cell: 0 });
    expect(reduceColourPicnic(first, { type: "paint", cell: 0 })).toBe(first);
    expect(first.paintedCells).toEqual([0]);
    state = first;
    for (let cell = 1; cell < PICNIC_PAINT_CELL_COUNT; cell++) {
      state = reduceColourPicnic(state, { type: "paint", cell });
    }
    expect(state.paintedCells).toHaveLength(PICNIC_PAINT_CELL_COUNT);
    expect(state.phase).toBe("paint");
    expect(picnicCanContinue(state)).toBe(true);
  });

  it.each(["red", "yellow"] as const)(
    "lets children retry %s paint and removes a wrong overpaint from progress",
    (colour) => {
      let state = reduceColourPicnic(paintedState(), {
        type: "select-paint",
        colour,
      });
      expect(picnicCanContinue(state)).toBe(true);
      state = reduceColourPicnic(state, { type: "paint", cell: 0 });
      expect(state.paintedCells).toEqual([1, 2, 3, 4, 5]);
      expect(state.paintColours[0]).toBe(colour);
      expect(state.paintColours[1]).toBe("blue");
      expect(state.brushColour).toBe(colour);
      expect(state.feedback).toContain(colour);
      expect(state.feedback).not.toMatch(/bad|fail|wrong/i);
      expect(picnicCanContinue(state)).toBe(false);
      expect(reduceColourPicnic(state, { type: "next" })).toBe(state);
      const unpainted = reduceColourPicnic(state, { type: "paint", cell: 23 });
      expect(unpainted.paintedCells).toEqual([1, 2, 3, 4, 5]);
      expect(unpainted.paintColours[23]).toBe(colour);
      state = apply(
        unpainted,
        { type: "select-paint", colour: "blue" },
        { type: "paint", cell: 0 },
      );
      expect(picnicCanContinue(state)).toBe(true);
      expect(state.paintColours[0]).toBe("blue");
      expect(state.cue).toBe("paint-done");
    },
  );

  it.each(["red", "yellow"] as const)(
    "records a visible %s stroke and allows painting blue over it",
    (colour) => {
      const selected = reduceColourPicnic(paintState(), {
        type: "select-paint",
        colour,
      });
      const coloured = reduceColourPicnic(selected, {
        type: "paint",
        cell: 12,
      });
      expect(coloured.paintColours).toEqual({ 12: colour });
      expect(coloured.paintedCells).toEqual([]);
      expect(coloured.cue).toBe(`paint-try-${colour}`);
      expect(picnicCanContinue(coloured)).toBe(false);
      expect(reduceColourPicnic(coloured, { type: "paint", cell: 12 })).toBe(
        coloured,
      );
      const blue = apply(
        coloured,
        { type: "select-paint", colour: "blue" },
        { type: "paint", cell: 12 },
      );
      expect(blue.paintColours).toEqual({ 12: "blue" });
      expect(blue.paintedCells).toEqual([12]);
      expect(coloured.paintColours).toEqual({ 12: colour });
      expect(selected.paintColours).toEqual({});
    },
  );

  it("asks for paint before a stroke and a flag before planting", () => {
    const paint = reduceColourPicnic(paintState(), { type: "paint", cell: 0 });
    expect(paint.cue).toBe("paint-empty");
    expect(paint.paintedCells).toEqual([]);
    expect(paint.paintColours).toEqual({});
    const flag = reduceColourPicnic(decorateState(), { type: "plant-flag" });
    expect(flag.cue).toBe("flag-empty");
    expect(flag.plantedFlag).toBe(false);
  });

  it.each(["red", "blue", "yellow"] as PicnicColour[])(
    "accepts %s as a creative flag choice",
    (colour) => {
      const state = apply(
        decorateState(),
        { type: "choose-flag", colour },
        { type: "plant-flag" },
      );
      expect(state.flagColour).toBe(colour);
      expect(state.plantedFlag).toBe(true);
      expect(picnicCanContinue(state)).toBe(true);
      expect(reduceColourPicnic(state, { type: "plant-flag" })).toBe(state);
    },
  );

  it("allows changing a flag design, requiring the new choice to be planted", () => {
    let state = apply(
      decorateState(),
      { type: "choose-flag", colour: "red" },
      { type: "plant-flag" },
    );
    state = reduceColourPicnic(state, {
      type: "choose-flag",
      colour: "yellow",
    });
    expect(state.flagColour).toBe("yellow");
    expect(state.plantedFlag).toBe(false);
    expect(picnicCanContinue(state)).toBe(false);
    expect(
      picnicCanContinue(reduceColourPicnic(state, { type: "plant-flag" })),
    ).toBe(true);
  });

  it("ignores malformed runtime actions, unknown IDs and invalid patch coordinates", () => {
    const malformed = [null, undefined, 5, "next", {}, { type: "missing" }];
    for (const state of [
      createColourPicnicState(),
      fruitState(),
      paintState(),
      decorateState(),
    ]) {
      for (const action of malformed) {
        expect(reduceColourPicnic(state, action as PicnicAction)).toBe(state);
      }
    }
    for (const fruit of ["apple", "blue-apple", "__proto__", null, 1]) {
      const state = fruitState();
      expect(
        reduceColourPicnic(state, {
          type: "pick-fruit",
          fruit,
        } as PicnicAction),
      ).toBe(state);
    }
    for (const colour of ["green", "__proto__", null, 1]) {
      const paint = paintState();
      const decorate = decorateState();
      expect(
        reduceColourPicnic(paint, {
          type: "select-paint",
          colour,
        } as PicnicAction),
      ).toBe(paint);
      expect(
        reduceColourPicnic(decorate, {
          type: "choose-flag",
          colour,
        } as PicnicAction),
      ).toBe(decorate);
    }
    const state = reduceColourPicnic(paintState(), {
      type: "select-paint",
      colour: "blue",
    });
    for (const cell of [
      -1,
      24,
      0.5,
      Number.NaN,
      Infinity,
      -Infinity,
      "0",
      null,
      undefined,
    ]) {
      expect(
        reduceColourPicnic(state, { type: "paint", cell } as PicnicAction),
      ).toBe(state);
    }
  });

  it("ignores delayed fruit and brush events in later phases, including celebration", () => {
    const paint = paintState();
    expect(
      apply(
        paint,
        { type: "start" },
        { type: "pick-fruit", fruit: "banana" },
        { type: "place-fruit" },
        { type: "put-down" },
      ),
    ).toBe(paint);
    const decorate = decorateState();
    expect(
      apply(
        decorate,
        { type: "paint", cell: 0 },
        { type: "select-paint", colour: "red" },
      ),
    ).toBe(decorate);
    const complete = apply(
      decorate,
      { type: "choose-flag", colour: "blue" },
      { type: "plant-flag" },
      { type: "next" },
    );
    expect(
      apply(
        complete,
        { type: "start" },
        { type: "next" },
        { type: "pick-fruit", fruit: "banana" },
        { type: "place-fruit" },
        { type: "put-down" },
        { type: "select-paint", colour: "red" },
        { type: "paint", cell: 0 },
        { type: "choose-flag", colour: "red" },
        { type: "plant-flag" },
      ),
    ).toBe(complete);
  });

  it("keeps narration stable during ordinary brush strokes and uses defined cues", () => {
    let state = reduceColourPicnic(paintState(), {
      type: "select-paint",
      colour: "blue",
    });
    expect(state.cue).toBe("paint-blue");
    for (let cell = 0; cell < PICNIC_PAINT_REQUIRED - 1; cell++) {
      state = reduceColourPicnic(state, { type: "paint", cell });
      expect(state.cue).toBe("paint-blue");
    }
    state = reduceColourPicnic(state, {
      type: "paint",
      cell: PICNIC_PAINT_REQUIRED - 1,
    });
    expect(state.cue).toBe("paint-done");
    state = reduceColourPicnic(state, {
      type: "paint",
      cell: PICNIC_PAINT_REQUIRED,
    });
    expect(state.cue).toBe("paint-done");
    for (const progress of [
      createColourPicnicState(),
      fruitState(),
      paintState(),
      state,
      decorateState(),
    ]) {
      expect(PICNIC_NARRATION[progress.cue]).toBe(progress.feedback);
      expect(picnicPrompt(progress).length).toBeGreaterThan(10);
    }
    expect(
      Object.values(PICNIC_NARRATION).every((text) => text.length > 10),
    ).toBe(true);
  });

  it("preserves progress across JSON restoration and never mutates an earlier state", () => {
    const original = reduceColourPicnic(paintState(), {
      type: "select-paint",
      colour: "blue",
    });
    const before = JSON.stringify(original);
    Object.freeze(original.paintedCells);
    Object.freeze(original.paintColours);
    Object.freeze(original);
    const partial = reduceColourPicnic(original, { type: "paint", cell: 3 });
    expect(JSON.stringify(original)).toBe(before);
    const restored: PicnicState = JSON.parse(JSON.stringify(partial));
    const resumed = apply(
      restored,
      { type: "paint", cell: 0 },
      { type: "paint", cell: 1 },
      { type: "paint", cell: 2 },
      { type: "paint", cell: 4 },
      { type: "paint", cell: 5 },
      { type: "next" },
    );
    expect(resumed.phase).toBe("decorate");
    expect(resumed.packedFruit).toBe(true);
    expect(resumed.paintedCells).toEqual([3, 0, 1, 2, 4, 5]);
    expect(resumed.paintColours).toEqual({
      0: "blue",
      1: "blue",
      2: "blue",
      3: "blue",
      4: "blue",
      5: "blue",
    });
    expect(restored.paintedCells).toEqual([3]);
    expect(restored.paintColours).toEqual({ 3: "blue" });
  });

  it("restarts every phase with fresh, independent progress", () => {
    for (const state of [
      createColourPicnicState(),
      fruitState(),
      paintState(),
      paintedState(),
      decorateState(),
    ]) {
      const restarted = reduceColourPicnic(state, { type: "restart" });
      expect(restarted).toEqual(createColourPicnicState());
      expect(restarted).not.toBe(state);
      expect(restarted.paintedCells).not.toBe(state.paintedCells);
      expect(restarted.paintColours).toEqual({});
      expect(restarted.paintColours).not.toBe(state.paintColours);
    }
    const complete = apply(
      decorateState(),
      { type: "choose-flag", colour: "yellow" },
      { type: "plant-flag" },
      { type: "next" },
    );
    expect(reduceColourPicnic(complete, { type: "restart" })).toEqual(
      createColourPicnicState(),
    );
  });
});
