import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSpring } from "../src/index.ts";

/** Records a promise's resolution without awaiting it (safe for promises
 * that may never settle). */
function record(promise: Promise<boolean>) {
  const state: { value?: boolean } = {};
  promise.then((value) => {
    state.value = value;
  });
  return state;
}

describe("createSpring", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16),
    );
    vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("1. converges to the target with defaults", async () => {
    const spring = createSpring(0);
    const settled = record(spring.set(100));

    await vi.advanceTimersByTimeAsync(2000);

    expect(spring.get()).toBe(100);
    expect(settled.value).toBe(true);
    expect(spring.animating).toBe(false);
    expect(spring.target).toBe(100);
  });

  it("2. does not overshoot the default config beyond target + 1px", async () => {
    const spring = createSpring(0);
    let max = 0;
    spring.subscribe((value) => {
      max = Math.max(max, value);
    });

    const settled = record(spring.set(100));
    await vi.advanceTimersByTimeAsync(2000);

    expect(settled.value).toBe(true);
    expect(spring.get()).toBe(100);
    expect(max).toBeLessThanOrEqual(101);
  });

  it("3. immediate set jumps synchronously and notifies once", async () => {
    const spring = createSpring(0);
    const values: number[] = [];
    spring.subscribe((value) => values.push(value));

    const settled = record(spring.set(100, { immediate: true }));

    expect(spring.get()).toBe(100);
    expect(values).toEqual([100]);
    expect(spring.animating).toBe(false);

    await vi.advanceTimersByTimeAsync(100);

    expect(settled.value).toBe(true);
    expect(values).toEqual([100]);
  });

  it("4. retargets mid-flight preserving velocity", async () => {
    const spring = createSpring(0);
    const first = record(spring.set(100));

    await vi.advanceTimersByTimeAsync(100);

    const velocity = spring.getVelocity();
    expect(velocity).not.toBe(0);

    const second = record(spring.set(0));
    await vi.advanceTimersByTimeAsync(0);

    expect(first.value).toBe(false);
    expect(spring.getVelocity()).toBeCloseTo(velocity, 10);
    expect(spring.target).toBe(0);

    await vi.advanceTimersByTimeAsync(3000);

    expect(spring.get()).toBe(0);
    expect(second.value).toBe(true);
    expect(spring.animating).toBe(false);
  });

  it("5. opts.velocity overrides the current velocity", async () => {
    const spring = createSpring(0);
    spring.set(100, { velocity: 5 });

    expect(spring.getVelocity()).toBeCloseTo(5, 10);

    await vi.advanceTimersByTimeAsync(3000);
    expect(spring.get()).toBe(100);
  });

  it("6. stop() freezes the value and resolves false", async () => {
    const spring = createSpring(0);
    const settled = record(spring.set(100));

    await vi.advanceTimersByTimeAsync(100);
    expect(spring.animating).toBe(true);

    spring.stop();
    const frozen = spring.get();
    await vi.advanceTimersByTimeAsync(0);

    expect(settled.value).toBe(false);
    expect(spring.animating).toBe(false);

    await vi.advanceTimersByTimeAsync(500);

    expect(spring.get()).toBe(frozen);
    expect(spring.get()).toBe(frozen);
  });

  it("7. clamps huge frame deltas and still converges", async () => {
    let timestamp = performance.now();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) =>
      setTimeout(() => {
        timestamp += 5000;
        cb(timestamp);
      }, 16),
    );

    const spring = createSpring(0);
    let allFinite = true;
    spring.subscribe((value) => {
      allFinite = allFinite && Number.isFinite(value);
    });

    const settled = record(spring.set(100));
    await vi.advanceTimersByTimeAsync(3000);

    expect(allFinite).toBe(true);
    expect(Number.isFinite(spring.get())).toBe(true);
    expect(spring.get()).toBe(100);
    expect(settled.value).toBe(true);
  });

  it("8. unsubscribing inside the callback is safe", async () => {
    const spring = createSpring(0);
    let calls = 0;
    let unsubscribe: () => void = () => {};
    unsubscribe = spring.subscribe(() => {
      calls += 1;
      unsubscribe();
    });

    expect(typeof unsubscribe).toBe("function");

    const settled = record(spring.set(100));
    await vi.advanceTimersByTimeAsync(2000);

    expect(settled.value).toBe(true);
    expect(calls).toBe(1);
    expect(spring.get()).toBe(100);
  });

  it("9. falls back to setTimeout when rAF is unavailable", async () => {
    vi.stubGlobal("requestAnimationFrame", undefined);

    const spring = createSpring(0);
    const settled = record(spring.set(100));

    await vi.advanceTimersByTimeAsync(3000);

    expect(spring.get()).toBe(100);
    expect(settled.value).toBe(true);
    expect(spring.animating).toBe(false);
  });

  it("10. rest detection requires both delta and speed", async () => {
    const spring = createSpring(0);
    const settled = record(spring.set(100));

    expect(spring.getVelocity()).toBe(0);

    await vi.advanceTimersByTimeAsync(16);

    expect(settled.value).toBeUndefined();
    expect(spring.animating).toBe(true);
    expect(spring.get()).not.toBe(100);
  });
});
