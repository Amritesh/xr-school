import { expect, test, type Page } from "@playwright/test";

const learningColours = [
  "RED",
  "BLUE",
  "YELLOW",
  "GREEN",
  "ORANGE",
  "PURPLE",
  "PINK",
  "BROWN",
  "BLACK",
  "WHITE",
];

async function reachMemoryGame(page: Page) {
  const next = page.getByRole("button", { name: "Next stage", exact: true });
  await expect(next).toBeDisabled();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await next.click();
  for (const colour of learningColours) {
    await expect(next).toBeDisabled();
    await page.getByRole("button", { name: colour, exact: true }).click();
    await next.click();
  }
  for (const colour of learningColours) {
    await expect(next).toBeDisabled();
    await page.getByRole("button", { name: colour, exact: true }).click();
  }
  await next.click();
  await expect(
    page.getByRole("heading", { name: "Colour Memory Game" }),
  ).toBeVisible();
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`Colour Adventure retries, completion and restart at ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/simulations/c1-art-a01-learning-of-colours");
    await page
      .getByRole("button", { name: "Open Adventure", exact: true })
      .click();
    await page.getByRole("button", { name: "Voice on", exact: true }).click();
    await reachMemoryGame(page);

    const panel = page.getByRole("complementary", { name: "Colour activity" });
    const next = page.getByRole("button", { name: "Next stage", exact: true });
    const finish = panel.getByRole("button", {
      name: "Finish Memory Game",
      exact: true,
    });
    const choose = (name: string) =>
      panel.getByRole("button", { name, exact: true }).click();
    const sceneBounds = (await page
      .getByRole("img", { name: "Colour Adventure world" })
      .boundingBox())!;
    const panelBounds = (await panel.boundingBox())!;
    const headerBounds = (await page.getByRole("banner").boundingBox())!;
    expect(sceneBounds.y).toBeGreaterThanOrEqual(
      headerBounds.y + headerBounds.height - 1,
    );
    expect(sceneBounds.height).toBeGreaterThanOrEqual(180);
    expect(
      sceneBounds.y + sceneBounds.height <= panelBounds.y + 1 ||
        sceneBounds.x + sceneBounds.width <= panelBounds.x + 1,
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(next).toBeDisabled();
    await expect(finish).toBeDisabled();
    await choose("Blue");
    await expect(
      panel.getByText("What colour is this Apple?", { exact: true }),
    ).toBeVisible();
    await expect(panel.getByText("Score: 0/10", { exact: true })).toBeVisible();
    await expect(finish).toBeDisabled();
    for (const colour of ["Red", "Yellow", "Green", "Yellow"])
      await choose(colour);

    // Clouds was the original whole-page crash boundary: Blue is not a valid choice.
    await expect(
      panel.getByText("What colour are Clouds?", { exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Blue", exact: true }),
    ).toHaveCount(0);
    for (const colour of ["White", "Green", "Orange", "Red"])
      await expect(
        panel.getByRole("button", { name: colour, exact: true }),
      ).toBeVisible();
    await choose("Green");
    await expect(
      panel.getByText("What colour are Clouds?", { exact: true }),
    ).toBeVisible();
    await expect(panel.getByText("Score: 4/10", { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("cloud-question.png") });
    for (const colour of [
      "White",
      "Purple",
      "Brown",
      "Blue",
      "Orange",
      "White",
    ])
      await choose(colour);
    await expect(
      panel.getByText("All ten objects matched!", { exact: true }),
    ).toBeVisible();
    await expect(finish).toBeEnabled();
    await expect(next).toBeDisabled();
    await finish.click();
    await next.click();
    await expect(
      page.getByRole("heading", { name: "Rainbow Celebration" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Previous stage", exact: true })
      .click();
    await expect(
      panel.getByText("Score: 10/10", { exact: true }),
    ).toBeVisible();
    await expect(next).toBeEnabled();

    await page
      .getByRole("button", { name: "Restart adventure", exact: true })
      .click();
    await reachMemoryGame(page);
    await expect(
      panel.getByText("What colour is this Apple?", { exact: true }),
    ).toBeVisible();
    await expect(panel.getByText("Score: 0/10", { exact: true })).toBeVisible();
    await expect(finish).toBeDisabled();
    await expect(next).toBeDisabled();
    expect(errors).toEqual([]);
  });
}
