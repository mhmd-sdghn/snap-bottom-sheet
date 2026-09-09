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
  readonly pointerType: string;

  constructor(type: string, init: MouseEventInit & FireInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.isPrimary = init.isPrimary ?? false;
    this.pointerType = init.pointerType ?? "mouse";
  }
}

interface FireInit {
  clientX?: number;
  clientY?: number;
  pointerId?: number;
  button?: number;
  isPrimary?: boolean;
  pointerType?: string;
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
    pointerType = "mouse",
    timeStamp = 0,
  } = init;
  const event = new FakePointerEvent(type, {
    bubbles: true,
    clientX,
    clientY,
    pointerId,
    button,
    isPrimary,
    pointerType,
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

  it("reports capture lost mid-drag as a cancelled end", () => {
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 10 });
    fire(el, "lostpointercapture", { clientY: 10 });
    expect(ends).toHaveLength(1);
    expect(ends[0]?.cancelled).toBe(true);

    // And the gesture is over: further moves belong to nobody.
    fire(el, "pointermove", { clientY: 40 });
    expect(ends).toHaveLength(1);
  });

  it("ignores the capture loss our own release causes", () => {
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 10 });
    fire(el, "pointerup", { clientY: 10 });
    expect(ends).toHaveLength(1);
    expect(ends[0]?.cancelled).toBe(false);

    // `reset()` releases the capture, so the browser's lostpointercapture
    // lands after the pointer id is already forgotten — and must not report a
    // second, cancelled end for the same gesture.
    fire(el, "lostpointercapture", { clientY: 10 });
    expect(ends).toHaveLength(1);
  });
});

/** `selectstart` / `dragstart`, which the recogniser has to be able to refuse */
function fireCancelable(target: EventTarget, type: string) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe("text selection and native drag", () => {
  /*
   * A mouse drag is also a text selection, and the browser autoscrolls the
   * nearest scroller to follow it — which fights the caller's own handling of
   * the very same movement.
   */
  it("refuses a selection started by a mouse we are following", () => {
    fire(el, "pointerdown", { clientY: 0 });
    expect(fireCancelable(el, "selectstart").defaultPrevented).toBe(true);
  });

  it("leaves a selection alone when no pointer of ours is down", () => {
    expect(fireCancelable(el, "selectstart").defaultPrevented).toBe(false);
  });

  it("leaves a selection alone after the gesture has ended", () => {
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointerup", { clientY: 0 });
    expect(fireCancelable(el, "selectstart").defaultPrevented).toBe(false);
  });

  // No selection happens under a touch until a long press, and taking that
  // away would cost more than it buys.
  it("leaves touch selection alone", () => {
    fire(el, "pointerdown", { clientY: 0, pointerType: "touch" });
    expect(fireCancelable(el, "selectstart").defaultPrevented).toBe(false);
  });

  it("leaves a text field's own selection alone", () => {
    const field = document.createElement("textarea");
    el.append(field);
    fire(el, "pointerdown", { clientY: 0 });
    expect(fireCancelable(field, "selectstart").defaultPrevented).toBe(false);
  });

  /*
   * The promise the guide makes: a region the caller opts out of keeps its
   * selection, because no gesture ever starts there. `filter` is the same hook
   * the sheet uses for `[data-snap-sheet-no-drag]`.
   */
  it("leaves a region the filter refuses selectable", () => {
    detach();
    const opted = document.createElement("div");
    opted.dataset.noDrag = "";
    el.append(opted);
    detach = attachDrag(el, handlers, {
      filter: (target) => target.closest("[data-no-drag]") === null,
    });

    fire(opted, "pointerdown", { clientY: 0 });
    expect(fireCancelable(opted, "selectstart").defaultPrevented).toBe(false);

    // and still refused where a gesture does start
    fire(el, "pointerdown", { clientY: 0 });
    expect(fireCancelable(el, "selectstart").defaultPrevented).toBe(true);
  });

  it("refuses a native drag while a gesture is in flight", () => {
    fire(el, "pointerdown", { clientY: 0 });
    // still pending
    expect(fireCancelable(el, "dragstart").defaultPrevented).toBe(true);
    fire(el, "pointermove", { clientY: 20 });
    // and once dragging
    expect(fireCancelable(el, "dragstart").defaultPrevented).toBe(true);
  });

  it("leaves a native drag alone once the pointer is up", () => {
    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointermove", { clientY: 20 });
    fire(el, "pointerup", { clientY: 20 });
    expect(fireCancelable(el, "dragstart").defaultPrevented).toBe(false);
  });

  it("stops refusing either of them once detached", () => {
    detach();
    detach = () => {};
    fire(el, "pointerdown", { clientY: 0 });
    expect(fireCancelable(el, "selectstart").defaultPrevented).toBe(false);
    expect(fireCancelable(el, "dragstart").defaultPrevented).toBe(false);
  });
});

describe("pointer capture", () => {
  /*
   * A captured pointer sends its `pointerup` to the capturing element, and the
   * browser derives the `click` from that pair — so capturing on pointerdown
   * makes every button inside the element unclickable. The recogniser must
   * wait until a drag has actually begun.
   */
  it("is not taken until the drag passes the threshold", () => {
    const capture = vi.fn();
    const release = vi.fn();
    el.setPointerCapture = capture;
    el.releasePointerCapture = release;

    fire(el, "pointerdown", { clientY: 0 });
    expect(capture).not.toHaveBeenCalled();

    // still under the 3px threshold
    fire(el, "pointermove", { clientY: 2 });
    expect(capture).not.toHaveBeenCalled();

    fire(el, "pointermove", { clientY: 20 });
    expect(capture).toHaveBeenCalledWith(1);

    fire(el, "pointerup", { clientY: 20 });
    expect(release).toHaveBeenCalledWith(1);
  });

  it("is never released for a tap that never became a drag", () => {
    const release = vi.fn();
    el.setPointerCapture = vi.fn();
    el.releasePointerCapture = release;

    fire(el, "pointerdown", { clientY: 0 });
    fire(el, "pointerup", { clientY: 0 });
    expect(release).not.toHaveBeenCalled();
  });
});

describe("detach", () => {
  it("removes every listener and stays silent afterwards", () => {
    // A pointer is down but under the threshold, so the document-scoped
    // tracking listeners are live and detaching has to take them off too;
    // only what *starts* a gesture ever lives on the element itself.
    fire(el, "pointerdown", { clientY: 0 });
    const remove = vi.spyOn(el, "removeEventListener");
    const removeFromDocument = vi.spyOn(document, "removeEventListener");
    detach();
    expect(remove.mock.calls.map(([type]) => type).sort()).toEqual([
      "dragstart",
      "lostpointercapture",
      "pointerdown",
      "selectstart",
    ]);
    expect(removeFromDocument.mock.calls.map(([type]) => type).sort()).toEqual([
      "pointercancel",
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
