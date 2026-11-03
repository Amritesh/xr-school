import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSuperSensesSightWorld } from "../../apps/web/lib/world-builder/superSensesSightWorld";

describe("Super Senses sight world", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds four interactive vision habitats and restores the scene on disposal", () => {
    vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
      () => new THREE.Texture(),
    );

    const scene = new THREE.Scene();
    const previousBackground = new THREE.Color(0x223344);
    const previousFog = new THREE.Fog(0x334455, 2, 20);
    scene.background = previousBackground;
    scene.fog = previousFog;

    const world = createSuperSensesSightWorld(scene);

    expect(world.root.name).toBe("super-senses-sight-academy");
    expect(world.root.children.map((child) => child.name)).toEqual([
      "mission-1-eagle-calibration-alpine-summit",
      "mission-2-eagle-valley-scan",
      "mission-3-night-forest-clue-scan",
      "mission-4-chameleon-fly-tracking",
    ]);
    expect([...world.interactiveTargets.keys()]).toEqual(
      expect.arrayContaining([
        "mountain-calibration",
        "eagle-calibration",
        "cloud-calibration",
        "valley-rock",
        "valley-bush",
        "valley-grass",
        "field-mouse",
        "night-left-bush",
        "night-right-tree",
        "night-eyes",
        "lemur",
        "fly-left",
        "fly-rear",
        "fly-right",
        "fly-front",
      ]),
    );

    world.setMission(2);
    expect(world.root.children.map((child) => child.visible)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    world.setMissionProgress(2, 0.8);
    expect(world.interactiveTargets.get("lemur")?.visible).toBe(true);
    world.setChoice("night-eyes", "wrong");
    expect(
      world.interactiveTargets.get("night-eyes")?.userData.choiceState,
    ).toBe("incorrect");

    const focus = world.focusForMission(3);
    expect(focus.position.y).toBeGreaterThan(1);
    expect(world.focusForMission(3).position).not.toBe(focus.position);

    world.applySnapshot({
      mission: 3,
      progress: 0.76,
      selectedChoice: "fly-right",
      timeSeconds: 285,
      reducedMotion: true,
      completed: true,
    });
    expect(world.root.children[3].visible).toBe(true);
    expect(() => world.update(285, 1 / 60, true)).not.toThrow();
    world.freeze();
    expect(() => world.update(286, 1 / 60, true)).not.toThrow();

    world.dispose();
    expect(world.root.parent).toBeNull();
    expect(scene.background).toBe(previousBackground);
    expect(scene.fog).toBe(previousFog);
    expect(world.interactiveTargets.size).toBe(0);
  });
});
