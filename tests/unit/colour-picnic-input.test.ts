import { describe, expect, it } from "vitest";
import {
  picnicPaintCell,
  picnicTargetAvailable,
} from "../../apps/web/lib/colourPicnicInput";
import { PICNIC_PAINT_CELL_COUNT } from "../../apps/web/lib/colourPicnicLesson";

describe("Colour Picnic cup painting UV mapping", () => {
  it.each([
    [0, 0, 0],
    [1, 0, 5],
    [0, 1, 18],
    [1, 1, 23],
  ])("maps the inclusive cup edge (%s, %s) to cell %s", (x, y, expected) => {
    expect(picnicPaintCell({ x, y })).toBe(expected);
  });

  it("maps all 24 patch centres to distinct, row-major cell IDs", () => {
    const cells: number[] = [];
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 6; column++) {
        const cell = picnicPaintCell({
          x: (column + 0.5) / 6,
          y: (row + 0.5) / 4,
        });
        expect(cell).toBe(row * 6 + column);
        cells.push(cell!);
      }
    }
    expect(new Set(cells).size).toBe(PICNIC_PAINT_CELL_COUNT);
    expect(cells).toEqual(
      Array.from({ length: PICNIC_PAINT_CELL_COUNT }, (_, cell) => cell),
    );
  });

  it("keeps points just inside the outer edges inside the valid grid", () => {
    expect(picnicPaintCell({ x: Number.EPSILON, y: Number.EPSILON })).toBe(0);
    expect(
      picnicPaintCell({ x: 1 - Number.EPSILON, y: 1 - Number.EPSILON }),
    ).toBe(23);
    expect(picnicPaintCell({ x: 0.5, y: 0.5 })).toBe(15);
    expect(
      picnicPaintCell({ x: 0.5 - Number.EPSILON, y: 0.5 - Number.EPSILON }),
    ).toBe(8);
  });

  it.each([
    [-Number.EPSILON, 0.5],
    [1 + Number.EPSILON, 0.5],
    [0.5, -Number.EPSILON],
    [0.5, 1 + Number.EPSILON],
    [-1, -1],
    [2, 2],
    [Number.NaN, 0.5],
    [0.5, Number.NaN],
    [Infinity, 0.5],
    [0.5, Infinity],
    [-Infinity, 0.5],
    [0.5, -Infinity],
  ])("rejects invalid or out-of-range coordinates (%s, %s)", (x, y) => {
    expect(picnicPaintCell({ x, y })).toBeUndefined();
  });

  it("ignores missing or malformed UV data instead of painting a patch", () => {
    for (const uv of [
      undefined,
      null,
      {},
      { x: 0 },
      { y: 0 },
      { x: "0", y: 0 },
      { x: 0, y: "0" },
    ]) {
      expect(
        picnicPaintCell(uv as { x: number; y: number } | undefined),
      ).toBeUndefined();
    }
  });
});

describe("Colour Picnic mission hit targets", () => {
  it("prevents later props from intercepting the fruit mission", () => {
    expect(picnicTargetAvailable("fruit", "red-apple")).toBe(true);
    expect(picnicTargetAvailable("fruit", "basket")).toBe(true);
    expect(picnicTargetAvailable("fruit", "cup")).toBe(false);
    expect(picnicTargetAvailable("fruit", "flag-red")).toBe(false);
  });

  it("keeps each making tool within its own mission", () => {
    expect(picnicTargetAvailable("paint", "cup")).toBe(true);
    expect(picnicTargetAvailable("paint", "paint-blue")).toBe(true);
    expect(picnicTargetAvailable("paint", "red-apple")).toBe(false);
    expect(picnicTargetAvailable("decorate", "flag-yellow")).toBe(true);
    expect(picnicTargetAvailable("decorate", "paint-yellow")).toBe(false);
  });

  it("keeps the guide and immersive controls available", () => {
    for (const phase of [
      "welcome",
      "fruit",
      "paint",
      "decorate",
      "celebrate",
    ] as const) {
      expect(picnicTargetAvailable(phase, "bird")).toBe(true);
      expect(picnicTargetAvailable(phase, "continue")).toBe(true);
      expect(picnicTargetAvailable(phase, "exit")).toBe(true);
    }
  });
});
