import type { CDPSession, Page } from "@playwright/test";

export type Point = { x: number; y: number };

export type SheetState = {
  /** raw `data-snap-index`, e.g. "1" */
  snapIndex: string | undefined;
  /** `--snap-sheet-y` in px */
  y: number;
  /** `scrollTop` of the Body */
  scrollTop: number;
  dragging: boolean;
  scrolling: boolean;
};

/*
 * Playwright's `page.touchscreen` only exposes a single `tap`, so a drag that
 * has to dwell between moves — which is the whole point of the handoff — has to
 * go through CDP. One session per page, dropped when the page closes.
 */
const sessions = new WeakMap<Page, Promise<CDPSession>>();

function cdp(page: Page): Promise<CDPSession> {
  let session = sessions.get(page);
  if (!session) {
    session = page.context().newCDPSession(page);
    sessions.set(page, session);
  }
  return session;
}

async function dispatch(
  page: Page,
  type: "touchStart" | "touchMove" | "touchEnd",
  point?: Point,
) {
  const session = await cdp(page);
  await session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: point ? [{ x: point.x, y: point.y, id: 1 }] : [],
  });
}

/** Put the finger down. */
export const touchStart = (page: Page, point: Point) =>
  dispatch(page, "touchStart", point);

/** Move the finger. The engine reads one delta per call, so call it per frame. */
export const touchMove = (page: Page, point: Point) =>
  dispatch(page, "touchMove", point);

/** Lift the finger. */
export const touchEnd = (page: Page) => dispatch(page, "touchEnd");

/**
 * One unbroken single-finger gesture through `points`, pausing `stepMs` between
 * moves so the engine sees real per-frame deltas and a real release velocity.
 */
export async function touchDrag(
  page: Page,
  points: Point[],
  opts?: { stepMs?: number },
) {
  const stepMs = opts?.stepMs ?? 16;
  const [first, ...rest] = points;
  if (!first) throw new Error("touchDrag needs at least one point");
  await touchStart(page, first);
  for (const point of rest) {
    await page.waitForTimeout(stepMs);
    await touchMove(page, point);
  }
  await touchEnd(page);
}

/** A straight line of `steps` points from `from` to `to`, inclusive. */
export function line(from: Point, to: Point, steps: number): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    x: from.x + ((to.x - from.x) * i) / steps,
    y: from.y + ((to.y - from.y) * i) / steps,
  }));
}

export function readState(page: Page): Promise<SheetState> {
  return page.evaluate(() => {
    const panel = document.querySelector("[data-testid=panel]") as HTMLElement;
    const body = document.querySelector<HTMLElement>("[data-testid=body]");
    return {
      snapIndex: panel.dataset.snapIndex,
      y:
        Number.parseFloat(
          getComputedStyle(panel).getPropertyValue("--snap-sheet-y"),
        ) || 0,
      scrollTop: body?.scrollTop ?? 0,
      dragging: panel.dataset.dragging !== undefined,
      scrolling: panel.dataset.scrolling !== undefined,
    };
  });
}

/** `console.log` the current state, but only under E2E_TRACE=1. */
export async function trace(page: Page, phase: string) {
  if (!process.env.E2E_TRACE) return;
  const state = await readState(page);
  console.log(
    `[trace] ${phase}: snap=${state.snapIndex} y=${state.y.toFixed(1)} scrollTop=${state.scrollTop} dragging=${state.dragging} scrolling=${state.scrolling}`,
  );
}
