import { expect, type Page, test } from "@playwright/test";
import {
  line,
  readState,
  touchDrag,
  touchEnd,
  touchMove,
  touchStart,
  trace,
} from "./helpers.ts";

/**
 * The playground's "handoff" scenario: ["header", { value: 0.5, scroll: true }, 1].
 *
 * Geometry, on the Pixel 7 viewport this project runs (412 x 839):
 *   index 0 ("header")  y = 839 - header height
 *   index 1 (0.5)       y = 419.5, the Body is a 314 px scroller
 *   index 2 (1)         y = 0
 *
 * A "header" snap puts the top of the Body exactly at the bottom of the
 * viewport by definition, so a gesture cannot begin inside the Body while the
 * sheet rests at index 0. Every Body gesture below therefore starts at index 1,
 * and test (a) pushes the sheet down first so that the rise back up to the
 * scroll snap still happens inside one unbroken gesture.
 */

const X = 206;

async function openHandoff(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Drag ↔ scroll handoff" }).click();
  await page.getByTestId("open").click();
  await expect(page.getByTestId("panel")).toBeVisible();
  await trace(page, "opened");
}

/** Wait until the panel stops moving — the open spring, or a release. */
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

/**
 * Wait until the list stops scrolling and return where it came to rest. Two
 * consecutive equal reads, because a fling decays smoothly and any single read
 * mid-brake looks as still as the real thing.
 */
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

/** Viewport-relative y of the `scroll: true` snap. */
function index1Y(page: Page) {
  return page.evaluate(() => window.innerHeight / 2);
}

/** Drag the handle up from index 0 and wait for the spring to settle at index 1. */
async function toIndex1(page: Page) {
  await settled(page);
  const handle = await page.getByTestId("handle").boundingBox();
  if (!handle) throw new Error("no handle");
  const start = { x: X, y: handle.y + handle.height / 2 };
  await touchDrag(page, line(start, { x: X, y: start.y - 300 }, 15));
  await expect.poll(async () => (await readState(page)).snapIndex).toBe("1");
  const y = await index1Y(page);
  await expect
    .poll(async () => Math.abs((await readState(page)).y - y) < 2)
    .toBe(true);
  await trace(page, "at index 1");
}

test.beforeEach(async ({ page }) => {
  await openHandoff(page);
  await toIndex1(page);
});

test("(a) dragging up in the body hands over to scrolling", async ({
  page,
}) => {
  const y1 = await index1Y(page);

  // One gesture, no lift: push the sheet down below the scroll snap, then
  // reverse and travel 600 px up in ~20 px steps.
  await touchStart(page, { x: X, y: 560 });
  for (const point of line({ x: X, y: 560 }, { x: X, y: 830 }, 14).slice(1)) {
    await page.waitForTimeout(16);
    await touchMove(page, point);
  }
  const pushed = await readState(page);
  await trace(page, "gesture: pushed down");
  expect(pushed.dragging).toBe(true);
  expect(pushed.y).toBeGreaterThan(y1 + 100);

  const up = line({ x: X, y: 830 }, { x: X, y: 230 }, 30).slice(1);
  for (const point of up.slice(0, 20)) {
    await page.waitForTimeout(16);
    await touchMove(page, point);
  }
  const mid = await readState(page);
  await trace(page, "gesture: mid-way up");
  // The sheet stopped at the ceiling and the same finger is now scrolling.
  expect(mid.scrolling).toBe(true);
  expect(mid.scrollTop).toBeGreaterThan(0);

  for (const point of up.slice(20)) {
    await page.waitForTimeout(16);
    await touchMove(page, point);
  }
  await touchEnd(page);
  await trace(page, "released");

  await expect.poll(async () => (await readState(page)).snapIndex).toBe("1");
  const end = await readState(page);
  expect(Math.abs(end.y - y1)).toBeLessThan(4);
  expect(end.scrollTop).toBeGreaterThan(0);
});

test("(b) scrolling back to the top hands back to dragging", async ({
  page,
}) => {
  const y1 = await index1Y(page);

  // Scroll down ~300 px, parking the finger before the lift so the release
  // carries no velocity.
  const rest = { x: X, y: 500 };
  await touchDrag(page, line({ x: X, y: 800 }, rest, 15), { park: true });
  await expect
    .poll(async () => (await readState(page)).scrollTop)
    .toBeGreaterThan(200);
  const scrolled = (await readState(page)).scrollTop;
  await trace(page, "scrolled down");

  // One new gesture, 500 px down: ~300 of it unscrolls, the rest is the sheet.
  await touchStart(page, { x: X, y: 560 });
  for (const point of line({ x: X, y: 560 }, { x: X, y: 1060 }, 25).slice(1)) {
    await page.waitForTimeout(16);
    await touchMove(page, point);
  }
  const mid = await readState(page);
  await trace(page, "gesture: dragged back down");
  expect(scrolled).toBeGreaterThan(0);
  expect(mid.scrollTop).toBe(0);
  expect(mid.y).toBeGreaterThan(y1 + 50);

  await touchEnd(page);
});

test("(c) a release during the scroll phase flings and settles", async ({
  page,
}) => {
  const y1 = await index1Y(page);

  // Stop ~100 px from the top: a short scroll with the finger parked at the
  // end, so the release carries no velocity.
  await touchDrag(page, line({ x: X, y: 700 }, { x: X, y: 600 }, 8), {
    park: true,
  });
  await expect
    .poll(async () => (await readState(page)).scrollTop)
    .toBeGreaterThan(40);
  const before = await readState(page);
  await trace(page, "near the top");

  // A short, fast downward fling: momentum has to brake exactly at 0 and must
  // never push the sheet.
  await touchDrag(page, line({ x: X, y: 600 }, { x: X, y: 680 }, 4));
  await expect.poll(async () => (await readState(page)).scrollTop).toBe(0);
  await page.waitForTimeout(400);
  const braked = await readState(page);
  await trace(page, "fling braked at the top");
  expect(before.scrollTop).toBeGreaterThan(0);
  expect(braked.scrollTop).toBe(0);
  expect(Math.abs(braked.y - y1)).toBeLessThan(2);

  // Fast swipe up, released mid-list: the fling carries on, then stops.
  await touchDrag(page, line({ x: X, y: 800 }, { x: X, y: 300 }, 8));
  const atRelease = (await readState(page)).scrollTop;
  await trace(page, "flung up: released");

  // The brake is exponential — 325·ln(v0/0.02) ms, so 1.5-1.7 s at these
  // velocities. Fixed sleeps landed right on that boundary; poll instead.
  await expect
    .poll(async () => (await readState(page)).scrollTop)
    .toBeGreaterThan(atRelease);
  const stopped = await restingScrollTop(page);
  await trace(page, "flung up: stopped");

  expect(stopped).toBeGreaterThan(atRelease);
  expect(Math.abs((await readState(page)).y - y1)).toBeLessThan(2);
});

test("(d) the handle is not subject to the scroll ceiling", async ({
  page,
}) => {
  const handle = await page.getByTestId("handle").boundingBox();
  if (!handle) throw new Error("no handle");
  const start = { x: X, y: handle.y + handle.height / 2 };
  await touchDrag(page, line(start, { x: X, y: start.y - 400 }, 20));
  await trace(page, "handle dragged up from index 1");
  await expect.poll(async () => (await readState(page)).snapIndex).toBe("2");
});
