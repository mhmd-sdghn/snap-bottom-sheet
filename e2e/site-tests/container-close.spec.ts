import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

/*
 * The reported symptom was a container-mode sheet that "closes suddenly, with
 * no animation". jsdom cannot answer it — there is no rAF clock and no layout —
 * so the close is sampled here, one reading per animation frame, in a real
 * headless Chromium.
 */

type Sample = {
  /** ms since sampling began */
  t: number;
  /** `--snap-sheet-y` in px, or null once the panel has unmounted */
  y: number | null;
  state: string | null;
  /** the Portal container's own scrollTop: a jump here fakes a "close" */
  scrollTop: number;
};

const PANEL = '[role="dialog"]';
const OVERLAY = '[data-snap-sheet-part="overlay"]';

const readY = (page: Page) =>
  page.evaluate((sel) => {
    const panel = document.querySelector(sel) as HTMLElement | null;
    const raw = panel?.style.getPropertyValue("--snap-sheet-y") ?? "";
    return raw ? Number.parseFloat(raw) : null;
  }, PANEL);

/** Wait until the spring has stopped moving, rather than guessing a duration. */
async function waitForRest(page: Page) {
  let previous: number | null = null;
  for (let i = 0; i < 60; i++) {
    const y = await readY(page);
    if (y !== null && y === previous) return y;
    previous = y;
    await page.waitForTimeout(50);
  }
  throw new Error("sheet never came to rest");
}

/**
 * Record the panel once per animation frame until it unmounts. Started
 * *before* the close is triggered, so the first frame of the animation cannot
 * be missed — which is precisely the frame the bug ate.
 */
async function startSampler(page: Page, container: string) {
  await page.evaluate(
    ([containerSel, panelSel]) => {
      const scope = window as unknown as {
        __samples: Sample[];
        __done: boolean;
      };
      type Sample = {
        t: number;
        y: number | null;
        state: string | null;
        scrollTop: number;
      };
      scope.__samples = [];
      scope.__done = false;
      const frame = document.querySelector(containerSel) as HTMLElement | null;
      const start = performance.now();

      const tick = () => {
        const panel = document.querySelector(panelSel) as HTMLElement | null;
        const raw = panel?.style.getPropertyValue("--snap-sheet-y") ?? "";
        scope.__samples.push({
          t: performance.now() - start,
          y: raw ? Number.parseFloat(raw) : null,
          state: panel?.getAttribute("data-state") ?? null,
          scrollTop: frame?.scrollTop ?? 0,
        });
        // The panel is gone: the close is over, one way or another.
        if (!panel || performance.now() - start > 4000) {
          scope.__done = true;
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    [container, PANEL] as const,
  );
}

async function collect(page: Page): Promise<Sample[]> {
  await page.waitForFunction(
    () => (window as unknown as { __done: boolean }).__done,
    null,
    { timeout: 10_000 },
  );
  return page.evaluate(
    () => (window as unknown as { __samples: Sample[] }).__samples,
  );
}

/**
 * A close that a person would see as an animation: the panel travelled
 * downwards over several frames and several tenths of a second, the container
 * never scrolled underneath it, and `data-state` only turned "closed" once the
 * panel had stopped moving.
 */
function expectAnimatedClose(samples: Sample[], label: string) {
  const moving = samples.filter(
    (s): s is Sample & { y: number } => s.y !== null,
  );
  const ys = moving.map((s) => s.y);

  expect(ys, `${label}: y must only ever travel downwards`).toEqual(
    [...ys].sort((a, b) => a - b),
  );
  expect(
    new Set(ys).size,
    `${label}: distinct y values, ${JSON.stringify(ys.map(Math.round))}`,
  ).toBeGreaterThanOrEqual(6);
  expect(
    moving[moving.length - 1].t - moving[0].t,
    `${label}: ms of movement`,
  ).toBeGreaterThanOrEqual(150);
  expect(
    samples.map((s) => s.scrollTop).filter((top) => top !== 0),
    `${label}: the container scrolled during the close`,
  ).toEqual([]);

  const firstClosed = samples.findIndex((s) => s.state === "closed");
  if (firstClosed !== -1) {
    const after = samples
      .slice(firstClosed)
      .flatMap((s) => (s.y === null ? [] : [s.y]));
    expect(
      Math.max(...after) - Math.min(...after),
      `${label}: still moving after data-state went "closed"`,
    ).toBeLessThanOrEqual(1);
  }

  expect(
    samples[samples.length - 1].y,
    `${label}: the panel should be unmounted at the end`,
  ).toBeNull();
}

type Scenario = {
  name: string;
  url: string;
  container: string;
  /** clicked to get the sheet open */
  trigger: string;
  /** the demo has its own `Sheet.Close` */
  closeButton: boolean;
};

const scenarios: Scenario[] = [
  {
    name: "docs /demos/basic",
    url: "demos/basic",
    container: ".react-demo",
    trigger: "Open the sheet",
    closeButton: true,
  },
  {
    name: "docs /demos/snap-points",
    url: "demos/snap-points",
    container: ".react-demo",
    trigger: "Open the sheet",
    closeButton: false,
  },
  {
    name: "playground custom container",
    url: "playground/",
    container: ".phone",
    trigger: "Open in frame",
    closeButton: false,
  },
];

for (const scenario of scenarios) {
  test.describe(scenario.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(scenario.url);
      if (scenario.url === "playground/") {
        await page
          .getByRole("button", { name: "Custom Portal container" })
          .click();
      }
      await page.getByRole("button", { name: scenario.trigger }).click();
      await waitForRest(page);
      await startSampler(page, scenario.container);
    });

    test("closes with an animation — overlay click", async ({ page }) => {
      await page.locator(OVERLAY).click({ position: { x: 20, y: 20 } });
      expectAnimatedClose(await collect(page), `${scenario.name} overlay`);
    });

    test("closes with an animation — Escape", async ({ page }) => {
      await page.keyboard.press("Escape");
      expectAnimatedClose(await collect(page), `${scenario.name} escape`);
    });

    test("closes with an animation — Close button", async ({ page }) => {
      test.skip(!scenario.closeButton, "this demo has no Sheet.Close");
      await page
        .locator(PANEL)
        .getByRole("button", { name: "Close", exact: true })
        .click();
      expectAnimatedClose(await collect(page), `${scenario.name} close button`);
    });
  });
}
