import { expect, type Page, test } from "@playwright/test";
import { line, type Point, readState, trace } from "./helpers.ts";

/**
 * The same "handoff" scenario as `handoff.spec.ts`, driven with a mouse on a
 * desktop viewport (1280 x 800, no touch): index 1 is the `scroll: true` snap
 * at y = 400, and the Body below it is a scroller.
 *
 * A mouse drag is also a text selection, and the browser autoscrolls the
 * nearest scroller to follow one — so before the recogniser refused it, a drag
 * that left the Body's box scrolled nothing and selected several hundred
 * characters instead. These tests hold that behaviour down.
 */

const X = 640;

/** `page.mouse` at roughly a frame per step, so the arbiter sees real moves. */
async function mouseDrag(page: Page, points: Point[]) {
  const [first, ...rest] = points;
  if (!first) throw new Error("mouseDrag: no points");
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of rest) {
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

const selection = (page: Page) =>
  page.evaluate(() => window.getSelection()?.toString() ?? "");

async function settled(page: Page) {
  let previous = Number.NaN;
  await expect
    .poll(async () => {
      const { y } = await readState(page);
      const still = y === previous;
      previous = y;
      return still;
    })
    .toBe(true);
}

async function restingScrollTop(page: Page) {
  let previous = Number.NaN;
  await expect
    .poll(async () => {
      const { scrollTop } = await readState(page);
      const still = scrollTop === previous;
      previous = scrollTop;
      return still;
    })
    .toBe(true);
  return (await readState(page)).scrollTop;
}

const index1Y = (page: Page) => page.evaluate(() => window.innerHeight / 2);

async function openHandoffAtIndex1(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Drag ↔ scroll handoff" }).click();
  await page.getByTestId("open").click();
  await expect(page.getByTestId("panel")).toBeVisible();
  await settled(page);

  const handle = await page.getByTestId("handle").boundingBox();
  if (!handle) throw new Error("no handle");
  const start = { x: X, y: handle.y + handle.height / 2 };
  await mouseDrag(page, line(start, { x: X, y: start.y - 300 }, 15));
  await expect.poll(async () => (await readState(page)).snapIndex).toBe("1");
  const y = await index1Y(page);
  await expect
    .poll(async () => Math.abs((await readState(page)).y - y) < 2)
    .toBe(true);
  await trace(page, "at index 1 (mouse)");
}

test.describe("mouse handoff", () => {
  test.beforeEach(async ({ page }) => {
    await openHandoffAtIndex1(page);
  });

  test("(m1) a body drag upwards scrolls and selects nothing", async ({
    page,
  }) => {
    const body = await page.getByTestId("body").boundingBox();
    if (!body) throw new Error("no body");
    // 240 px up from the middle of a ~300 px scroller: the pointer leaves the
    // Body's box on the way, which is exactly where selection autoscroll used
    // to take over.
    const start = { x: X, y: body.y + body.height / 2 };
    await mouseDrag(page, line(start, { x: X, y: start.y - 240 }, 15));

    const scrollTop = await restingScrollTop(page);
    expect(scrollTop).toBeGreaterThan(0);

    const snapY = await index1Y(page);
    expect(Math.abs((await readState(page)).y - snapY)).toBeLessThan(4);
    expect(await selection(page)).toBe("");
  });

  test("(m2) the list hands back to the sheet on the way down", async ({
    page,
  }) => {
    const y1 = await index1Y(page);
    const body = await page.getByTestId("body").boundingBox();
    if (!body) throw new Error("no body");

    // Scroll the list down ~150 px, with the pointer parked before the button
    // comes up so the release carries no velocity.
    const from = { x: X, y: body.y + body.height - 20 };
    const to = { x: X, y: from.y - 150 };
    await mouseDrag(page, [...line(from, to, 12), to, to]);
    await expect
      .poll(async () => (await readState(page)).scrollTop)
      .toBeGreaterThan(100);
    const scrolled = (await readState(page)).scrollTop;

    // One new gesture, 250 px down over the same rows: ~150 of it unscrolls
    // the list and the rest moves the sheet. Read before the release, the way
    // the touch handback is checked — the handback is a property of the
    // gesture, not of where the spring happens to settle afterwards. A native
    // drag of a selection would have cancelled the pointer instead.
    const back = { x: X, y: body.y + 30 };
    const points = line(back, { x: X, y: back.y + 250 }, 20);
    const [first, ...rest] = points;
    if (!first) throw new Error("no points");
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of rest) {
      await page.mouse.move(point.x, point.y);
      await page.waitForTimeout(16);
    }
    const mid = await readState(page);
    await page.mouse.up();

    expect(scrolled).toBeGreaterThan(0);
    expect(mid.scrollTop).toBe(0);
    expect(mid.y).toBeGreaterThan(y1 + 50);
    expect(await selection(page)).toBe("");
  });
});

test("(m3) a drag inside an input still selects its text", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Login sheet (content mode)" })
    .click();
  await page.getByRole("button", { name: "Sign in" }).click();

  // The password field, not the email one: `selectionStart`/`selectionEnd` are
  // null on an `email` input by specification.
  const field = page.locator("#password");
  await expect(field).toBeVisible();

  // `toBeVisible` is satisfied by a box, and the panel starts below the fold —
  // so wait until the open spring has actually brought the field on screen,
  // otherwise the drag below lands on the page behind the sheet.
  const height = page.viewportSize()?.height ?? 0;
  await expect
    .poll(async () => {
      const box = await field.boundingBox();
      return box ? box.y + box.height <= height : false;
    })
    .toBe(true);
  await field.fill("a long enough value to select");

  const box = await field.boundingBox();
  if (!box) throw new Error("no input box");
  const y = box.y + box.height / 2;
  await mouseDrag(
    page,
    line({ x: box.x + 6, y }, { x: box.x + box.width - 6, y }, 8),
  );

  const [start, end] = await field.evaluate((el: HTMLInputElement) => [
    el.selectionStart,
    el.selectionEnd,
  ]);
  expect(end).toBeGreaterThan(start ?? 0);
});
