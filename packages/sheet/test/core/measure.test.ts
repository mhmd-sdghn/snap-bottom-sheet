import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { observeHeight, observeViewHeight } from "../../src/core/measure.ts";

type Entry = { target: Element };

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];
  unobserved: Element[] = [];

  constructor(private callback: (entries: Entry[]) => void) {
    FakeResizeObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  unobserve(el: Element) {
    this.unobserved.push(el);
  }

  disconnect() {}

  trigger(el: Element) {
    this.callback([{ target: el }]);
  }
}

/** measure.ts creates its observer lazily and keeps it, so there is only one. */
const ro = () => FakeResizeObserver.instances[0] as FakeResizeObserver;

function element(height: number): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "offsetHeight", {
    value: height,
    configurable: true,
    writable: true,
  });
  document.body.append(el);
  return el;
}

function setHeight(el: HTMLElement, height: number) {
  Object.defineProperty(el, "offsetHeight", {
    value: height,
    configurable: true,
    writable: true,
  });
}

function setInnerHeight(height: number) {
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});

beforeEach(() => {
  ro()?.observed.splice(0);
  ro()?.unobserved.splice(0);
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("observeHeight", () => {
  it("reports the current height immediately", () => {
    const cb = vi.fn();
    const stop = observeHeight(element(120), cb);

    expect(cb).toHaveBeenCalledWith(120);
    stop();
  });

  it("shares one observation between callbacks on the same element", () => {
    const el = element(100);
    const a = vi.fn();
    const b = vi.fn();

    const stopA = observeHeight(el, a);
    const stopB = observeHeight(el, b);

    expect(ro().observed).toEqual([el]);

    setHeight(el, 260);
    ro().trigger(el);
    expect(a).toHaveBeenLastCalledWith(260);
    expect(b).toHaveBeenLastCalledWith(260);

    stopA();
    expect(ro().unobserved).toEqual([]);

    setHeight(el, 300);
    ro().trigger(el);
    expect(a).toHaveBeenLastCalledWith(260);
    expect(b).toHaveBeenLastCalledWith(300);

    stopB();
    expect(ro().unobserved).toEqual([el]);
  });

  it("ignores a repeated unobserve", () => {
    const el = element(50);
    const stop = observeHeight(el, vi.fn());

    stop();
    stop();

    expect(ro().unobserved).toEqual([el]);
  });
});

describe("observeViewHeight", () => {
  it("tracks the window when there is no container", () => {
    setInnerHeight(768);
    const cb = vi.fn();
    const stop = observeViewHeight(null, cb);

    expect(cb).toHaveBeenCalledWith(768);

    setInnerHeight(500);
    window.dispatchEvent(new Event("resize"));
    expect(cb).toHaveBeenLastCalledWith(500);

    stop();
    setInnerHeight(300);
    window.dispatchEvent(new Event("resize"));
    expect(cb).toHaveBeenLastCalledWith(500);
  });

  it("observes the container when one is given", () => {
    const container = element(640);
    const cb = vi.fn();
    const stop = observeViewHeight(container, cb);

    expect(cb).toHaveBeenCalledWith(640);
    expect(ro().observed).toEqual([container]);

    stop();
  });
});
