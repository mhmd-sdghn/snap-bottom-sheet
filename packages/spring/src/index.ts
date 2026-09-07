/** `stiffness`/`damping` are react-spring's `tension`/`friction` (per second). */
export interface SpringConfig {
  stiffness?: number; // default 170
  damping?: number; // default 26
  mass?: number; // default 1
  restDelta?: number; // px, default 0.01
  restSpeed?: number; // px/ms, default 0.01
}

export interface SetOptions {
  immediate?: boolean; // jump to target synchronously, notify once
  velocity?: number; // px/ms, e.g. a drag release; default: current velocity
}

export interface Spring {
  get(): number;
  getVelocity(): number; // px/ms
  // Resolves true at `target`, false if superseded. Never rejects.
  set(target: number, opts?: SetOptions): Promise<boolean>;
  stop(): void; // freeze at the current value; a pending promise resolves false
  subscribe(fn: (value: number) => void): () => void;
  readonly animating: boolean;
  readonly target: number;
}

// Frames longer than MaxFrameMs (tab switch, breakpoint) are clamped; the
// sub-step is small enough that stiff springs stay stable.
const MaxFrameMs = 64;
const SubStepMs = 1;

// Both resolved lazily, never at import time, so the module is SSR-safe.
const now = () =>
  typeof performance === "undefined" ? Date.now() : performance.now();
const hasRaf = () => typeof requestAnimationFrame === "function";

export function createSpring(
  initial: number,
  config: SpringConfig = {},
): Spring {
  const { stiffness = 170, damping = 26, mass = 1 } = config;
  const { restDelta = 0.01, restSpeed = 0.01 } = config;
  let value = initial;
  let target = initial;
  let velocity = 0; // px/s internally; the public API is px/ms
  let handle: number | null = null;
  /**
   * Whether a run is in progress. Distinct from `handle`, which is only the
   * cancel token: `tick()` clears the token before notifying and takes a new
   * one afterwards, so `handle` reads null inside every frame callback. A
   * subscriber asking "is this still animating?" must not be told "no" for the
   * whole flight.
   */
  let running = false;
  let lastTime = 0;
  let resolveActive: ((rested: boolean) => void) | null = null;
  const listeners = new Set<(value: number) => void>();

  // Copy first: a listener may unsubscribe itself (or others) while we notify.
  const notify = () => {
    for (const fn of [...listeners]) fn(value);
  };
  const resolveWith = (rested: boolean) => {
    const resolve = resolveActive;
    resolveActive = null;
    resolve?.(rested);
  };
  const cancelFrame = () => {
    running = false;
    if (handle === null) return;
    if (hasRaf()) cancelAnimationFrame(handle);
    else clearTimeout(handle);
    handle = null;
  };
  const scheduleFrame = () => {
    handle = hasRaf()
      ? requestAnimationFrame(tick)
      : (setTimeout(() => tick(now()), 16) as unknown as number);
  };
  // Both conditions matter: still-but-far-from-target is not at rest.
  const atRest = () =>
    Math.abs(target - value) < restDelta &&
    Math.abs(velocity) / 1000 < restSpeed;
  const settleAtTarget = () => {
    value = target;
    velocity = 0;
    notify();
  };
  const integrate = (elapsed: number) => {
    let remaining = elapsed;
    while (remaining > 0) {
      const stepMs = Math.min(SubStepMs, remaining);
      const stepS = stepMs / 1000;
      const acceleration =
        (-stiffness * (value - target) - damping * velocity) / mass;
      velocity += acceleration * stepS;
      value += velocity * stepS;
      remaining -= stepMs;
    }
  };
  function tick(frameTime: number) {
    handle = null;
    const elapsed = Math.max(0, Math.min(frameTime - lastTime, MaxFrameMs));
    lastTime = frameTime;
    integrate(elapsed);
    if (atRest()) {
      // Cleared before notifying, not after: this is the notification a
      // subscriber uses to run the tail of a transition, and it has to see the
      // spring as stopped. Clearing it afterwards would strand every one.
      running = false;
      settleAtTarget();
      resolveWith(true);
      return;
    }
    notify();
    scheduleFrame();
  }
  const set = (next: number, opts: SetOptions = {}) => {
    resolveWith(false);
    target = next;
    if (opts.velocity !== undefined) velocity = opts.velocity * 1000;
    if (opts.immediate || atRest()) {
      cancelFrame();
      settleAtTarget();
      return Promise.resolve(true);
    }
    const promise = new Promise<boolean>((resolve) => {
      resolveActive = resolve;
    });
    running = true;
    // Already looping: keep the current velocity and the current frame clock.
    if (handle === null) {
      lastTime = now();
      scheduleFrame();
    }
    return promise;
  };

  return {
    get: () => value,
    getVelocity: () => velocity / 1000,
    set,
    stop() {
      cancelFrame();
      velocity = 0;
      target = value;
      resolveWith(false);
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    get animating() {
      return running;
    },
    get target() {
      return target;
    },
  };
}
