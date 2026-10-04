import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`Colour picnic complete accessible path at ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/simulations/colour-picnic-preview");
    await expect(
      page.getByRole("img", { name: "Colour picnic 3D world" }),
    ).toHaveAttribute("data-ready", "true");
    await page.getByRole("button", { name: "Sound on", exact: true }).click();
    await page.getByRole("button", { name: "Let’s make a picnic" }).click();
    const next = page.getByRole("button", { name: "Next little mission" });
    const buttons = page.getByRole("region", { name: "Button controls" });
    const openControls = () =>
      page.getByRole("button", { name: "Show button controls" }).click();
    await expect(next).toBeDisabled();
    await openControls();
    await buttons
      .getByRole("button", { name: "Green apple", exact: true })
      .click();
    await buttons
      .getByRole("button", { name: "Place in basket", exact: true })
      .click();
    await expect(next).toBeDisabled();
    await expect(
      page.getByRole("img", { name: "Colour picnic 3D world" }),
    ).toHaveAttribute("data-packed", "false");
    await buttons
      .getByRole("button", { name: "Red apple", exact: true })
      .click();
    await buttons
      .getByRole("button", { name: "Place in basket", exact: true })
      .click();
    await expect(next).toBeEnabled();
    await next.click();

    await expect(next).toBeDisabled();
    await openControls();
    await buttons
      .getByRole("button", { name: "Yellow paint", exact: true })
      .click();
    await buttons
      .getByRole("button", { name: "Brush one patch", exact: true })
      .click();
    await expect(
      page.getByRole("progressbar", { name: "Blue brush strokes" }),
    ).toHaveAttribute("value", "0");
    await buttons
      .getByRole("button", { name: "Blue paint", exact: true })
      .click();
    for (let i = 0; i < 6; i++)
      await buttons
        .getByRole("button", { name: "Brush one patch", exact: true })
        .click();
    await expect(next).toBeEnabled();
    await next.click();

    const enjoy = page.getByRole("button", { name: "Enjoy our picnic" });
    await expect(enjoy).toBeDisabled();
    await openControls();
    await buttons
      .getByRole("button", { name: "Yellow flag", exact: true })
      .click();
    await expect(enjoy).toBeDisabled();
    await buttons
      .getByRole("button", { name: "Plant my flag", exact: true })
      .click();
    await enjoy.click();
    await expect(
      page.getByRole("heading", { name: "Look what you made!" }),
    ).toBeVisible();
    const world = page.getByRole("img", { name: "Colour picnic 3D world" });
    await expect(world).toHaveAttribute("data-packed", "true");
    await expect(world).toHaveAttribute("data-painted-patches", "6");
    await expect(world).toHaveAttribute("data-flag-colour", "yellow");
    await expect(world).toHaveAttribute("data-flag-planted", "true");
    const scene = (await page
      .getByRole("region", { name: "Picnic scene" })
      .boundingBox())!;
    const activity = (await page
      .getByRole("region", { name: "Picnic activity" })
      .boundingBox())!;
    expect(scene.y + scene.height).toBeLessThanOrEqual(activity.y + 1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("finished-picnic.png") });
    await page.getByRole("button", { name: "Make another picnic" }).click();
    await expect(world).toHaveAttribute("data-packed", "false");
    await expect(world).toHaveAttribute("data-painted-patches", "0");
    await expect(world).toHaveAttribute("data-flag-planted", "false");
    await expect(
      page.getByRole("button", { name: "Let’s make a picnic" }),
    ).toBeEnabled();
    expect(errors).toEqual([]);
  });
}
