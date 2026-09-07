import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { attachDrag, type DragState } from "../src/index.ts";

/**
 * jsdom 26 ships no `PointerEvent`, so the two fields the recogniser reads are
 * bolted onto a `MouseEvent`. Only used here — the source never constructs or
 * `instanceof`-checks a PointerEvent, it just types its handlers with it.
 */
class FakePointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;

  constructor(type: string, init: MouseEventInit & FireInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.isPrimary = init.isPrimary ?? false;
  }
}

interface FireInit {
  clientX?: number;
  clientY?: number;
  pointerId?: number;
  button?: number;
  isPrimary?: boolean;
  timeStamp?: number;
}

/**
 * jsdom sets `timeStamp` itself from the time origin, and `PointerEvent` takes
 * no `timeStamp` in its init, so it is redefined on the instance — velocities
 * then come out exact instead of depending on wall-clock.
 */
function fire(el: HTMLElement, type: string, init: FireInit = {}) {
  const {
    clientX = 0,
    clientY = 0,
    pointerId = 1,
    button = 0,
    isPrimary = true,
    timeStamp = 0,
  } = init;
  const event = new FakePointerEvent(type, {
    bubbles: true,
    clientX,
    clientY,
    pointerId,
    button,
    isPrimary,
  });
  Object.defineProperty(event, "timeStamp", { value: timeStamp });
  el.dispatchEvent(event);
  return event;
}

let el: HTMLElement;
let detach: () => void;
const starts: DragState[] = [];
const moves: DragState[] = [];
const ends: DragState[] = [];

const handlers = {
  onStart: (s: DragState) => starts.push(s),
  onMove: (s: DragState) => moves.push(s),
  onEnd: (s: DragState) => ends.push(s),
};

beforeEach(() => {
  starts.length = 0;
  moves.length = 0;
  ends.length = 0;
  el = document.createElement("div");
  document.body.append(el);
  detach = attachDrag(el, handlers);
});

afterEach(() => {
  detach();
  el.remove();
});

describe("threshold", () => {
  it("stays silent below the default 3 px threshold", () => {
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 2 });
    expect(starts).toHaveLength(0);
    expect(moves).toHaveLength(0);
    fire(el, "pointerup", { clientY: 2 });
    expect(ends).toHaveLength(0);
  });

  it("starts on the crossing move, then reports moves and the end", () => {
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 10 });
    expect(starts).toHaveLength(1);
    expect(starts[0]?.dy).toBe(10);
    expect(moves).toHaveLength(0); // the crossing move is not also a move

    fire(el, "pointermove", { clientY: 25 });
    expect(moves).toHaveLength(1);
    expect(moves[0]?.dy).toBe(25);

    fire(el, "pointerup", { clientY: 25 });
    expect(ends).toHaveLength(1);
    expect(ends[0]?.dy).toBe(25);
    expect(ends[0]?.cancelled).toBe(false);
  });
});

describe("axis", () => {
  it('drops a horizontal-dominant gesture entirely with axis "y"', () => {
    fire(el, "pointerdown", { clientX: 0, clientY: 0 });
    fire(el, "pointermove", { clientX: 10, clientY: 2 });
    // and every later move of the same pointer stays ignored
    fire(el, "pointermove", { clientX: 10, clientY: 80 });
    fire(el, "pointerup", { clientX: 10, clientY: 80 });
    expect(starts).toHaveLength(0);
    expect(moves).toHaveLength(0);
    expect(ends).toHaveLength(0);
  });

  it('accepts the same gesture with axis "any"', () => {
    detach();
    detach = attachDrag(el, handlers, { axis: "any" });
    fire(el, "pointerdown", { clientX: 0, clientY: 0 });
    fire(el, "pointermove", { clientX: 10, clientY: 2 });
    expect(starts).toHaveLength(1);
    expect(starts[0]?.dx).toBe(10);
  });
});

describe("velocity", () => {
  it("is 0 on start and averages the last 100 ms afterwards", () => {
    fire(el, "pointerdown", { clientY: 0, timeStamp: 0 });
    fire(el, "pointermove", { clientY: 50, timeStamp: 50 });
    expect(starts[0]?.vy).toBe(0);

    fire(el, "pointermove", { clientY: 100, timeStamp: 100 });
    expect(moves[0]?.vy).toBeCloseTo(1, 2);
  });

  it("drops samples older than 100 ms", () => {
    fire(el, "pointerdown", { clientY: 0, timeStamp: 0 });
    fire(el, "pointermove", { clientY: 50, timeStamp: 50 });
    fire(el, "pointermove", { clientY: 100, timeStamp: 100 });
    // 200 ms pause, then one more move at the same place
    fire(el, "pointermove", { clientY: 100, timeStamp: 300 });
    expect(moves.at(-1)?.vy).toBe(0);
  });
});

describe("ignored pointers", () => {
  it("ignores a non-primary button", () => {
    fire(el, "pointerdown", { clientY: 0, button: 2 });
    fire(el, "pointermove", { clientY: 40 });
    expect(starts).toHaveLength(0);
  });

  it("ignores a non-primary pointer", () => {
    fire(el, "pointerdown", { clientY: 0, isPrimary: false });
    fire(el, "pointermove", { clientY: 40 });
    expect(starts).toHaveLength(0);
  });

  it("ignores a second pointer while one is active", () => {
    fire(el, "pointerdown", { clientY: 0, pointerId: 1 });
    fire(el, "pointermove", { clientY: 40, pointerId: 1 });
    fire(el, "pointerdown", { clientY: 0, pointerId: 2 });
    fire(el, "pointermove", { clientY: 40, pointerId: 2 });
    expect(starts).toHaveLength(1);
    expect(moves).toHaveLength(0);
  });

  it("ignores a pointer its filter rejects", () => {
    detach();
    const filter = vi.fn(() => false);
    detach = attachDrag(el, handlers, { filter });
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 40 });
    expect(filter).toHaveBeenCalledTimes(1);
    expect(starts).toHaveLength(0);
  });
});

describe("cancelling", () => {
  it("cancel() inside onMove suppresses onEnd and frees the next gesture", () => {
    detach();
    detach = attachDrag(el, {
      ...handlers,
      onMove: (s) => {
        moves.push(s);
        s.cancel();
      },
    });

    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 10 });
    fire(el, "pointermove", { clientY: 20 });
    fire(el, "pointermove", { clientY: 30 });
    fire(el, "pointerup", { clientY: 30 });
    expect(moves).toHaveLength(1);
    expect(ends).toHaveLength(0);

    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 10 });
    expect(starts).toHaveLength(2);
  });

  it("reports pointercancel after start as a cancelled end", () => {
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 10 });
    fire(el, "pointercancel", { clientY: 10 });
    expect(ends).toHaveLength(1);
    expect(ends[0]?.cancelled).toBe(true);
  });
});

describe("detach", () => {
  it("removes every listener and stays silent afterwards", () => {
    const remove = vi.spyOn(el, "removeEventListener");
    detach();
    expect(remove.mock.calls.map(([type]) => type).sort()).toEqual([
      "lostpointercapture",
      "pointercancel",
      "pointerdown",
      "pointermove",
      "pointerup",
    ]);

    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 40 });
    fire(el, "pointerup", { clientY: 40 });
    expect(starts).toHaveLength(0);
    expect(moves).toHaveLength(0);
    expect(ends).toHaveLength(0);

    detach = () => {};
  });

  it("drops an in-flight pointer", () => {
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 10 });
    detach();
    fire(el, "pointermove", { clientY: 40 });
    fire(el, "pointerup", { clientY: 40 });
    expect(moves).toHaveLength(0);
    expect(ends).toHaveLength(0);

    detach = () => {};
  });
});
