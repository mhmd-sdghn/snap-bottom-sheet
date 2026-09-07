/**
 * jsdom 26 ships no `PointerEvent`, so the two fields a pointer recogniser
 * reads are bolted onto a `MouseEvent`. Only used in tests — the source never
 * constructs or `instanceof`-checks a PointerEvent, it just types its handlers
 * with it.
 */
export class FakePointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly isPrimary: boolean;

  constructor(type: string, init: MouseEventInit & FireInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.isPrimary = init.isPrimary ?? false;
  }
}

export interface FireInit {
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
export function fire(el: HTMLElement, type: string, init: FireInit = {}) {
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
