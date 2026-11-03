import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSuperSensesSmellWorld } from "../../apps/web/lib/world-builder/superSensesSmellWorld";

describe("Super Senses smell world", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds four selectable, shape-coded missions and restores the scene on disposal", () => {
    vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
      () => new THREE.Texture(),
    );

    const scene = new THREE.Scene();
    const previousBackground = new THREE.Color(0x223344);
    const previousEnvironment = new THREE.Texture();
    const previousFog = new THREE.Fog(0x334455, 2, 20);
    scene.background = previousBackground;
    scene.environment = previousEnvironment;
    scene.fog = previousFog;

    const world = createSuperSensesSmellWorld(scene);

    expect(world.root.name).toBe("super-senses-smell-academy");
    expect(world.root.children.map((child) => child.name)).toEqual([
      "mission-1-smell-o-vision-park",
      "mission-2-ant-army-highway",
      "mission-3-rescue-dog-forest",
      "mission-4-silkmoth-night-forest",
    ]);
    expect([...world.interactiveTargets.keys()]).toEqual(
      expect.arrayContaining([
        "gold-food",
        "pink-flower",
        "cyan-grass",
        "fresh-trail",
        "strong-trail",
        "lollipop",
        "blue-target",
        "red-squirrel",
        "yellow-pizza",
        "teddy-bear",
        "ant-pheromone",
        "dog-tracking",
        "moth-antennae",
      ]),
    );
    expect(world.interactables.length).toBeGreaterThan(15);

    world.setMission(1);
    expect(world.root.children.map((child) => child.visible)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    world.setMissionProgress(1, 0);
    expect(world.interactiveTargets.get("fresh-trail")?.userData.choiceId).toBe(
      "fresh-trail",
    );
    world.setMissionProgress(1, 0.5);
    expect(
      world.interactiveTargets.get("strong-trail")?.userData.choiceId,
    ).toBe("strong-trail");
    world.setChoice("faint-trail", "wrong");
    expect(
      world.interactiveTargets.get("faint-trail")?.userData.choiceState,
    ).toBe("incorrect");

    const focus = world.focusForMission(3);
    expect(focus.position.y).toBeGreaterThan(focus.target.y - 1);
    expect(world.focusForMission(3).position).not.toBe(focus.position);

    world.applySnapshot({
      mission: 3,
      progress: 0.7,
      selectedScent: "moth-antennae",
      selectedDistractor: null,
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
    expect(scene.environment).toBe(previousEnvironment);
    expect(scene.fog).toBe(previousFog);
    expect(world.interactiveTargets.size).toBe(0);
  });
});
