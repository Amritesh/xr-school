import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSuperSensesDangerWorld } from "../../apps/web/lib/world-builder/superSensesDangerWorld";

describe("Super Senses danger world", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds four interactive habitats and restores the scene on disposal", () => {
    vi.spyOn(THREE.TextureLoader.prototype, "load").mockImplementation(
      () => new THREE.Texture(),
    );

    const scene = new THREE.Scene();
    const previousBackground = new THREE.Color(0x223344);
    const previousFog = new THREE.Fog(0x334455, 2, 20);
    scene.background = previousBackground;
    scene.fog = previousFog;

    const world = createSuperSensesDangerWorld(scene);

    expect(world.root.name).toBe("super-senses-danger-spy-academy");
    expect(world.root.children.slice(0, 4).map((child) => child.name)).toEqual([
      "mission-1-vibe-boots-savanna",
      "mission-2-elephant-seismic-trail",
      "mission-3-spider-web-alarm",
      "mission-4-shark-electroreception-ocean",
    ]);
    expect([...world.interactiveTargets.keys()]).toEqual(
      expect.arrayContaining([
        "vibe-beetle",
        "vibe-footsteps",
        "vibe-disturbance",
        "seismic-center",
        "ripple-one",
        "ripple-two",
        "ripple-three",
        "web-leaf",
        "web-insect",
        "web-urgent",
        "escape-point",
        "scan-empty",
        "stingray-one",
        "scan-rock",
        "stingray-two",
      ]),
    );

    world.setMission(2);
    expect(
      world.root.children.slice(0, 4).map((child) => child.visible),
    ).toEqual([false, false, true, false]);
    world.setMissionProgress(2, 0.8);
    expect(world.interactiveTargets.get("escape-point")?.visible).toBe(true);
    world.setChoice("web-urgent", "wrong");
    expect(
      world.interactiveTargets.get("web-urgent")?.userData.choiceState,
    ).toBe("incorrect");

    const focus = world.focusForMission(3);
    expect(focus.position.y).toBeGreaterThan(1);
    expect(world.focusForMission(3).position).not.toBe(focus.position);

    world.applySnapshot({
      mission: 3,
      progress: 0.86,
      selectedChoice: "stingray-two",
      timeSeconds: 296,
      reducedMotion: true,
      completed: true,
    });
    expect(world.root.children[3].visible).toBe(true);
    expect(() => world.update(296, 1 / 60, true)).not.toThrow();
    world.freeze();
    expect(() => world.update(297, 1 / 60, true)).not.toThrow();

    world.dispose();
    expect(world.root.parent).toBeNull();
    expect(scene.background).toBe(previousBackground);
    expect(scene.fog).toBe(previousFog);
    expect(world.interactiveTargets.size).toBe(0);
  });
});
