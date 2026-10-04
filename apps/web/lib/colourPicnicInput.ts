import * as THREE from "three";
import type {
  PicnicAction,
  PicnicState,
  PicnicFruit,
  PicnicColour,
} from "./colourPicnicLesson";
import type { createColourPicnicScene } from "./colourPicnicScene";

export function picnicPaintCell(uv: { x: number; y: number } | undefined) {
  if (!uv || !Number.isFinite(uv.x) || !Number.isFinite(uv.y)) return undefined;
  if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) return undefined;
  return (
    Math.min(5, Math.floor(uv.x * 6)) + Math.min(3, Math.floor(uv.y * 4)) * 6
  );
}

/** Only props belonging to the current little mission can intercept a ray.
 * Several finished props remain visible for continuity, but must not block the
 * apple, paint or flag that the learner is trying to touch. */
export function picnicTargetAvailable(phase: PicnicState["phase"], id: string) {
  if (id === "continue" || id === "exit") return true;
  if (id === "bird") return true;
  if (phase === "fruit")
    return ["red-apple", "green-apple", "banana", "basket"].includes(id);
  if (phase === "paint")
    return id === "cup" || id === "brush" || id.startsWith("paint-");
  if (phase === "decorate")
    return id === "flag-stand" || id.startsWith("flag-");
  return false;
}

/** Object gestures own the pointer only after a real object hit. Empty-space
 * drags and right-drag remain available to OrbitControls. No answer shortcuts. */
export function createPicnicInput(options: {
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  controllers: THREE.XRTargetRaySpace[];
  world: ReturnType<typeof createColourPicnicScene>;
  getState: () => PicnicState;
  dispatch: (action: PicnicAction) => void;
  setOrbitEnabled: (value: boolean) => void;
  onHover: (id: string | undefined) => void;
  listen: () => void;
  onCommand?: (command: "continue" | "exit") => void;
}) {
  const { canvas, world, getState, dispatch } = options;
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane();
  const position = new THREE.Vector3();
  let gesture:
    | {
        id: number;
        kind: "fruit" | "paint" | "tap";
        x: number;
        y: number;
        target: string;
      }
    | undefined;
  let xrGesture:
    | { controller: THREE.XRTargetRaySpace; kind: "fruit" | "paint" }
    | undefined;
  let hovered: string | undefined;

  const visible = (object: THREE.Object3D) => {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (!node.visible) return false;
      node = node.parent;
    }
    return true;
  };
  const targetId = (object: THREE.Object3D) => {
    let node: THREE.Object3D | null = object;
    while (node) {
      if (typeof node.userData.targetId === "string")
        return node.userData.targetId as string;
      node = node.parent;
    }
    return undefined;
  };
  function hit(ignoreHeld = false) {
    const roots = [...world.targets.entries()]
      .filter(
        ([id, object]) =>
          picnicTargetAvailable(getState().phase, id) &&
          visible(object) &&
          (!ignoreHeld || id !== getState().heldFruit),
      )
      .map(([, object]) => object);
    for (const intersection of ray.intersectObjects(roots, true)) {
      if (!visible(intersection.object)) continue;
      const id = targetId(intersection.object);
      if (id) return { id, intersection };
    }
    return undefined;
  }
  function pointerRay(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    options.camera.updateMatrixWorld(true);
    world.root.updateMatrixWorld(true);
    ray.setFromCamera(pointer, options.camera);
  }
  function controllerRay(controller: THREE.XRTargetRaySpace) {
    controller.updateMatrixWorld(true);
    world.root.updateMatrixWorld(true);
    ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    ray.ray.direction.set(0, 0, -1).transformDirection(controller.matrixWorld);
  }
  function setHover(id: string | undefined) {
    if (hovered === id) return;
    hovered = id;
    options.onHover(id);
  }
  function select(id: string) {
    const state = getState();
    if (id === "continue" || id === "exit") {
      options.onCommand?.(id);
      return;
    }
    if (id === "bird") {
      options.listen();
      return;
    }
    if (state.phase === "fruit") {
      if (["red-apple", "green-apple", "banana"].includes(id))
        dispatch({ type: "pick-fruit", fruit: id as PicnicFruit });
      else if (id === "basket") dispatch({ type: "place-fruit" });
    } else if (state.phase === "paint") {
      if (id.startsWith("paint-"))
        dispatch({ type: "select-paint", colour: id.slice(6) as PicnicColour });
      else if (id === "brush") options.listen();
    } else if (state.phase === "decorate") {
      if (id === "flag-stand") dispatch({ type: "plant-flag" });
      else if (id.startsWith("flag-"))
        dispatch({ type: "choose-flag", colour: id.slice(5) as PicnicColour });
    }
  }
  function paint() {
    const contact = ray.intersectObject(world.cupPaintSurface, false)[0];
    if (!contact || !visible(world.cupPaintSurface)) return;
    const cell = picnicPaintCell(contact.uv);
    if (cell === undefined) return;
    dispatch({ type: "paint", cell });
    const brush = world.targets.get("brush");
    if (brush) {
      brush.userData.manipulating = true;
      brush.position
        .copy(world.root.worldToLocal(contact.point.clone()))
        .add(new THREE.Vector3(0.07, 0.04, 0.1));
    }
  }
  function resetBrush() {
    const brush = world.targets.get("brush");
    if (brush) brush.userData.manipulating = false;
  }
  function dropNearBasket() {
    const contact = hit(true);
    if (contact?.id === "basket") {
      dispatch({ type: "place-fruit" });
      return;
    }
    const held = getState().heldFruit;
    const fruit = held ? world.targets.get(held) : undefined;
    const basket = world.targets.get("basket");
    if (fruit && basket) {
      const fruitPoint = fruit.getWorldPosition(new THREE.Vector3());
      const basketPoint = basket.getWorldPosition(new THREE.Vector3());
      if (
        Math.hypot(fruitPoint.x - basketPoint.x, fruitPoint.z - basketPoint.z) <
          0.38 &&
        Math.abs(fruitPoint.y - basketPoint.y) < 0.55
      )
        dispatch({ type: "place-fruit" });
    }
  }
  function cancel() {
    if (gesture && canvas.hasPointerCapture(gesture.id))
      canvas.releasePointerCapture(gesture.id);
    gesture = undefined;
    xrGesture = undefined;
    world.resetHeldPosition();
    resetBrush();
    setHover(undefined);
    options.setOrbitEnabled(true);
  }
  function down(event: PointerEvent) {
    if (event.button !== 0 || gesture) return;
    pointerRay(event);
    const contact = hit();
    if (
      !contact ||
      (contact.id !== "bird" &&
        (getState().phase === "welcome" || getState().phase === "celebrate"))
    )
      return;
    event.preventDefault();
    event.stopImmediatePropagation();
    options.setOrbitEnabled(false);
    canvas.setPointerCapture(event.pointerId);
    const fruit =
      getState().phase === "fruit" &&
      ["red-apple", "green-apple", "banana"].includes(contact.id) &&
      !getState().packedFruit;
    const brush = getState().phase === "paint" && contact.id === "cup";
    gesture = {
      id: event.pointerId,
      kind: fruit ? "fruit" : brush ? "paint" : "tap",
      x: event.clientX,
      y: event.clientY,
      target: contact.id,
    };
    if (fruit) {
      select(contact.id);
      plane.setFromNormalAndCoplanarPoint(
        options.camera.getWorldDirection(new THREE.Vector3()),
        contact.intersection.point,
      );
    } else if (brush) paint();
  }
  function move(event: PointerEvent) {
    pointerRay(event);
    if (gesture?.id === event.pointerId) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (
        gesture.kind === "fruit" &&
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5
      ) {
        if (ray.ray.intersectPlane(plane, position)) {
          position.y = THREE.MathUtils.clamp(position.y, 0.98, 2.2);
          world.setHeldPosition(position);
        }
      } else if (gesture.kind === "paint") paint();
      return;
    }
    const contact = hit();
    setHover(contact?.id);
    canvas.style.cursor = contact
      ? contact.id === "cup" && getState().phase === "paint"
        ? "crosshair"
        : "pointer"
      : "grab";
  }
  function up(event: PointerEvent) {
    if (!gesture || gesture.id !== event.pointerId) return;
    event.stopImmediatePropagation();
    pointerRay(event);
    if (gesture.kind === "fruit") {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5)
        dropNearBasket();
    } else if (
      gesture.kind === "tap" &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 6
    ) {
      const contact = hit(true);
      if (contact?.id === gesture.target) select(contact.id);
    }
    cancel();
  }
  canvas.addEventListener("pointerdown", down, true);
  canvas.addEventListener("pointermove", move, true);
  canvas.addEventListener("pointerup", up, true);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("lostpointercapture", cancel);
  const listeners = options.controllers.map((controller) => {
    const start = () => {
      if (gesture || xrGesture) return;
      controllerRay(controller);
      const contact = hit();
      if (!contact) return;
      select(contact.id);
      const state = getState();
      if (state.phase === "fruit" && state.heldFruit === contact.id)
        xrGesture = { controller, kind: "fruit" };
      if (state.phase === "paint" && contact.id === "cup") {
        xrGesture = { controller, kind: "paint" };
        paint();
      }
    };
    const end = () => {
      if (xrGesture?.controller !== controller) return;
      controllerRay(controller);
      if (xrGesture.kind === "fruit") dropNearBasket();
      cancel();
    };
    controller.addEventListener("selectstart", start);
    controller.addEventListener("selectend", end);
    return { controller, start, end };
  });
  return {
    cancel,
    updateXR() {
      if (xrGesture) {
        controllerRay(xrGesture.controller);
        if (xrGesture.kind === "fruit")
          world.setHeldPosition(ray.ray.at(0.85, position));
        else paint();
      } else {
        for (const controller of options.controllers) {
          controllerRay(controller);
          const contact = hit();
          if (contact) {
            setHover(contact.id);
            return;
          }
        }
        setHover(undefined);
      }
    },
    dispose() {
      cancel();
      canvas.removeEventListener("pointerdown", down, true);
      canvas.removeEventListener("pointermove", move, true);
      canvas.removeEventListener("pointerup", up, true);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      for (const { controller, start, end } of listeners) {
        controller.removeEventListener("selectstart", start);
        controller.removeEventListener("selectend", end);
      }
    },
  };
}
