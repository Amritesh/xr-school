import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const controls = readFileSync(
  resolve(
    process.cwd(),
    "apps/web/components/simulations/questVrControls.ts",
  ),
  "utf8",
);

describe("Shared Quest VR controls", () => {
  it("starts the headset outside the scene centre", () => {
    expect(controls).toContain("new THREE.Vector3(0, 0, 2.6)");
    expect(controls).toContain("clamp(rig.position.z, 1.9, 2.7)");
    expect(controls).toContain('rig.name = "quest-player-rig"');
  });

  it("maps A/X to the primary action, B to exit VR, and Y to go back", () => {
    expect(controls).toContain("const BUTTON_PRIMARY = 4");
    expect(controls).toContain("const BUTTON_BACK_ALIASES = [5, 6]");
    expect(controls).toContain("const BUTTON_BACK_FALLBACK = 3");
    expect(controls).toContain("onPrimary");
    expect(controls).toContain("onBack");
    expect(controls).toContain('if (hand === "right") void session.end()');
    expect(controls).toContain("else onBack()");
    expect(controls).toContain('addEventListener("squeezestart"');
    expect(controls).toContain("renderer.xr.getSession()?.end()");
  });

  it("uses the joysticks for locomotion and snap turning", () => {
    expect(controls).toContain("thumbstickAxes");
    expect(controls).toContain("MOVE_SPEED_METRES_PER_SECOND");
    expect(controls).toContain("MOVE_DEAD_ZONE");
    expect(controls).toContain("SNAP_TURN_RADIANS");
    expect(controls).toContain("rig.position.addScaledVector");
    expect(controls).toContain("alternateMagnitude > primaryMagnitude");
    expect(controls).toContain("renderer.xr.getCamera().getWorldDirection");
  });

  it("does not interrupt gesture-unlocked narration when a session starts", () => {
    expect(controls).toContain('addEventListener("sessionstart"');
    expect(controls).not.toContain("setTimeout(onNarrate, 300)");
    expect(controls).toContain('activeSession?.addEventListener("squeezestart"');
  });

  it("routes contributed guided classes through the shared XR host", () => {
    const source = readFileSync(
      resolve(process.cwd(), "apps/web/components/simulations/shared/GuidedSimulationViewer.tsx"),
      "utf8",
    );
    expect(source).toContain("createSimulationHost");
    expect(source).toContain("host.enterVr()");
    expect(source).toContain("host.dispatch");
    expect(source).toContain("void controller.dispose()");
  });
});
