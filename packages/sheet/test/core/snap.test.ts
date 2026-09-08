import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  byY,
  closest,
  decideRelease,
  isContentMode,
  type MeasureContext,
  normalize,
  project,
  resolveSnapPoints,
  type SnapPoint,
  type SnapValue,
  steps,
  toHeight,
} from "../../src/core/snap.ts";

const ctx = (over: Partial<MeasureContext> = {}): MeasureContext => ({
  viewHeight: 800,
  headerHeight: 0,
  contentHeight: 0,
  ...over,
});

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("toHeight", () => {
  const cases: Array<[SnapValue, MeasureContext, number]> = [
    [0.5, ctx(), 400],
    ["50%", ctx(), 400],
    [600, ctx(), 600],
    ["600px", ctx(), 600],
    [1, ctx(), 800],
    [1200, ctx(), 800],
    ["1200px", ctx(), 800],
    ["150%", ctx(), 800],
    ["header", ctx({ headerHeight: 120 }), 120],
    ["content", ctx({ contentHeight: 200 }), 200],
    ["content", ctx({ contentHeight: 5000 }), 800],
  ];

  it.each(cases)("%s → %o → %i", (value, context, expected) => {
    expect(toHeight(value, context)).toBe(expected);
  });

  const invalid: SnapValue[] = [
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "50" as SnapValue,
    "abc" as SnapValue,
    "50 %" as SnapValue,
    "0%",
    "0px",
    "-10px" as SnapValue,
  ];

  it.each(invalid)("%s is invalid", (value) => {
    expect(toHeight(value, ctx())).toBeNaN();
  });

  it("treats a non-positive view height as invalid", () => {
    expect(toHeight(0.5, ctx({ viewHeight: 0 }))).toBeNaN();
    expect(
      toHeight("content", ctx({ viewHeight: -1, contentHeight: 200 })),
    ).toBeNaN();
  });

  it("reads a float-error 1 as the whole view, not one pixel (C.1)", () => {
    expect(toHeight(1.0000000000000002, ctx())).toBe(800);
    expect(toHeight(0.9999999999999998, ctx())).toBe(800);
    // A real pixel value just above 1 is still a pixel value.
    expect(toHeight(1.5, ctx())).toBe(2);
  });
});

describe("resolveSnapPoints", () => {
  it("keeps consumer indices when points are unsorted (P0-1)", () => {
    const resolved = resolveSnapPoints([0.9, 0.3], ctx());

    expect(resolved.map((s) => [s.index, s.y])).toEqual([
      [0, 80],
      [1, 560],
    ]);
    expect(byY(resolved).map((s) => s.index)).toEqual([1, 0]);
    expect(closest(resolved, 550)?.index).toBe(1);
  });

  it("resolves a measured content snap to its real y (P0-2)", () => {
    const resolved = resolveSnapPoints(
      ["content", 0.5],
      ctx({ contentHeight: 200 }),
    );

    expect(resolved[0]?.y).toBe(600);
    expect(closest(resolved, 550)?.index).toBe(0);
  });

  it("uses a half-view placeholder while header/content is unmeasured", () => {
    for (const value of ["content", "header"] as const) {
      const resolved = resolveSnapPoints([value], ctx());
      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.height).toBe(400);
      expect(resolved[0]?.y).toBe(400);
    }
  });

  it("drops invalid entries without shifting the surviving indices", () => {
    const resolved = resolveSnapPoints([0.9, 0, 0.3], ctx());

    expect(resolved.map((s) => s.index)).toEqual([0, 2]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("keeps duplicate heights", () => {
    const resolved = resolveSnapPoints([0.5, "50%"], ctx());

    expect(resolved.map((s) => [s.index, s.height])).toEqual([
      [0, 400],
      [1, 400],
    ]);
  });

  it("resolves nothing when the view height is unusable", () => {
    expect(resolveSnapPoints([0.5, "content"], ctx({ viewHeight: 0 }))).toEqual(
      [],
    );
  });

  it("stays silent while the view is unmeasured (C.6)", () => {
    // Warning once per key is per process: burning "snap:0.5" here would hide
    // the real warning when the same point is genuinely invalid later.
    resolveSnapPoints([0.5], ctx({ viewHeight: 0 }));
    expect(console.warn).not.toHaveBeenCalled();

    resolveSnapPoints([0.5, 0], ctx());
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("carries scroll and drag config through", () => {
    const resolved = resolveSnapPoints(
      [{ value: 0.5, scroll: true, drag: { down: false } }],
      ctx(),
    );

    expect(resolved[0]?.scroll).toBe(true);
    expect(resolved[0]?.drag).toEqual({ up: true, down: false });
  });
});

describe("normalize", () => {
  const cases: Array<[string, SnapPoint, ReturnType<typeof normalize>]> = [
    [
      "bare value",
      0.5,
      { value: 0.5, scroll: false, drag: { up: true, down: true } },
    ],
    [
      "drag: false",
      { value: 0.5, drag: false },
      { value: 0.5, scroll: false, drag: { up: false, down: false } },
    ],
    [
      "partial drag object",
      { value: 0.5, drag: { down: false } },
      { value: 0.5, scroll: false, drag: { up: true, down: false } },
    ],
    [
      "scroll: true",
      { value: "content", scroll: true },
      { value: "content", scroll: true, drag: { up: true, down: true } },
    ],
  ];

  it.each(cases)("%s", (_label, point, expected) => {
    expect(normalize(point)).toEqual(expected);
  });
});

describe("steps", () => {
  it("spreads evenly to 1 by default", () => {
    const result = steps(3);
    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(1 / 3);
    expect(result[1]).toBeCloseTo(2 / 3);
    expect(result[2]).toBeCloseTo(1);
  });

  it("honours from/to", () => {
    const result = steps(4, { from: 0.25, to: 1 });
    expect(result).toHaveLength(4);
    for (const [i, expected] of [0.25, 0.5, 0.75, 1].entries()) {
      expect(result[i]).toBeCloseTo(expected);
    }
  });

  it("handles small counts", () => {
    expect(steps(0)).toEqual([]);
    expect(steps(-1)).toEqual([]);
    const two = steps(2, { from: 0.5 });
    expect(two[0]).toBeCloseTo(0.5);
    expect(two[1]).toBeCloseTo(1);
  });

  it("ends exactly at `to` and starts exactly at `from` (C.1)", () => {
    // Not toBeCloseTo: 1.0000000000000002 resolves as a 1 px snap.
    expect(steps(6).at(-1)).toBe(1);
    expect(steps(24).at(-1)).toBe(1);
    expect(steps(7, { from: 0.1, to: 0.9 })[0]).toBe(0.1);
    expect(steps(7, { from: 0.1, to: 0.9 }).at(-1)).toBe(0.9);
    for (const value of steps(6)) {
      expect(toHeight(value, ctx())).toBeGreaterThan(100);
    }
  });
});

describe("project", () => {
  it("projects 200ms ahead by default", () => {
    expect(project(560, -1)).toBe(360);
    expect(project(560, 0.5, 100)).toBe(610);
  });
});

describe("closest", () => {
  const resolved = resolveSnapPoints([0.9, 0.3], ctx());

  it("returns undefined for an empty list", () => {
    expect(closest([], 100)).toBeUndefined();
  });

  it("breaks ties toward the smaller height", () => {
    const tied = resolveSnapPoints([0.9, 0.3], ctx());
    // midpoint between y 80 and y 560
    expect(closest(tied, 320)?.index).toBe(1);
  });

  it("finds the nearest snap", () => {
    expect(closest(resolved, 100)?.index).toBe(0);
    expect(closest(resolved, 500)?.index).toBe(1);
  });
});

describe("decideRelease", () => {
  // lowest: y 560, height 240 → threshold min(80, 60) = 60. upper: y 80.
  const resolved = resolveSnapPoints([0.9, 0.3], ctx());
  const release = (y: number, vy: number, dismissible = true) =>
    decideRelease({ y, vy, resolved, dismissible });

  it("stays open inside the close threshold", () => {
    const result = release(600, 0);
    expect(result.close).toBe(false);
    expect(result.close === false && result.snap.index).toBe(1);
  });

  it("closes past the close threshold", () => {
    expect(release(650, 0)).toEqual({ close: true });
  });

  it("closes on a downward fling that projects past the threshold", () => {
    expect(release(580, 0.5)).toEqual({ close: true });
  });

  it("never closes when not dismissible", () => {
    const result = release(650, 2, false);
    expect(result.close).toBe(false);
    expect(result.close === false && result.snap.index).toBe(1);
  });

  it("lands on the upper snap after an upward fling", () => {
    const result = release(560, -1.5);
    expect(result.close === false && result.snap.index).toBe(0);
  });

  it("does not over-project a gentle upward flick", () => {
    const result = release(560, -1);
    expect(result.close === false && result.snap.index).toBe(1);
  });

  it("closes when nothing resolved", () => {
    expect(
      decideRelease({ y: 0, vy: 0, resolved: [], dismissible: false }),
    ).toEqual({ close: true });
  });
});

describe("isContentMode", () => {
  it.each([
    [[], true],
    [["content"], true],
    [[{ value: "content" }], true],
    [["content", 0.5], false],
    [[0.5], false],
  ] as Array<[SnapPoint[], boolean]>)("%o → %s", (points, expected) => {
    expect(isContentMode(points)).toBe(expected);
  });
});
