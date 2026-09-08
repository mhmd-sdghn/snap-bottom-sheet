/**
 * The React parts driving the REAL controller — no `createSheet` mock.
 *
 * Task 07 proved the bindings talk to a controller correctly; this file proves
 * the two halves agree about what actually happens on screen: attributes the
 * controller writes, the y the panel lands on, and the state that travels back
 * up through `onSnapIndexChange` and `useSheetState`.
 *
 * Public entry point only (`src/react/index.ts`) — never an internal module.
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { createRef, StrictMode, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SheetHandle } from "../../src/react/index.ts";
import { Sheet, useSheetState } from "../../src/react/index.ts";
import {
  installTestEnv,
  isInert,
  resizeTo,
  settle,
  ViewHeight,
  yOf,
} from "../helpers/env.ts";
import { fire } from "../helpers/pointer.ts";

/**
 * The y a fractional snap resolves to. The rounding is the library's, not a
 * convenience: `resolveSnapPoints` rounds the height before subtracting, so
 * `0.9` of a 1000 px view is y=100 and not 99.99999999999997.
 */
const yFor = (fraction: number) =>
  ViewHeight - Math.round(ViewHeight * fraction);

/** Burn frames inside `act` so React effects flush between them. */
const flush = () => act(async () => settle());

function StateProbe() {
  const { open, snapIndex, dragging, contentMode } = useSheetState();
  return (
    <span
      data-testid="probe"
      data-open={String(open)}
      data-snap={String(snapIndex)}
      data-dragging={String(dragging)}
      data-content-mode={String(contentMode)}
    />
  );
}

function Panel({ children }: { children?: ReactNode }) {
  return (
    <Sheet.Portal>
      <Sheet.Overlay data-testid="overlay" />
      <Sheet.Content data-testid="content">
        <Sheet.Handle data-testid="handle" />
        <Sheet.Header data-testid="header">
          <Sheet.Title>Title</Sheet.Title>
          <Sheet.Description>Description</Sheet.Description>
        </Sheet.Header>
        <Sheet.Body data-testid="body">
          <StateProbe />
          {children}
        </Sheet.Body>
      </Sheet.Content>
    </Sheet.Portal>
  );
}

const content = () => screen.getByTestId("content");
const probe = () => screen.getByTestId("probe");

/**
 * pointerdown → threshold move → the real move → pointerup.
 *
 * The timestamps are deliberate: the recogniser keeps only the samples of the
 * last 100 ms, so a pointerup 200 ms after the final move leaves a single
 * sample in the window and `vy` comes out exactly 0. Releases in these tests
 * therefore project nowhere and land on the snap nearest the resting y.
 */
function drag(el: HTMLElement, from: number, to: number) {
  const direction = to >= from ? 1 : -1;
  fire(el, "pointerdown", { clientY: from, timeStamp: 0 });
  fire(el, "pointermove", { clientY: from + direction * 4, timeStamp: 10 });
  fire(el, "pointermove", { clientY: to, timeStamp: 100 });
  fire(el, "pointerup", { clientY: to, timeStamp: 300 });
}

beforeEach(() => {
  vi.useFakeTimers();
  installTestEnv();
});

afterEach(() => {
  // Unmounting destroys controllers, and destroy() cancels frames through the
  // stubbed cancelAnimationFrame — so it has to happen while the stubs are
  // still in place. `unstubGlobals` restores them before the *next* test.
  cleanup();
  vi.useRealTimers();
});

describe("presence gate", () => {
  it("keeps the closing sheet mounted for the whole animation", async () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(false)}>
            close
          </button>
          <Sheet open={open} onOpenChange={setOpen} snapPoints={[0.5]}>
            <Panel />
          </Sheet>
        </>
      );
    }
    render(<Controlled />);
    await flush();
    expect(content().getAttribute("data-state")).toBe("open");

    await act(async () => {
      screen.getByText("close").click();
    });
    // one frame into the close: React unmounts on onAnimationEnd(false), so if
    // the transition finalises early the close animation is never seen at all
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });

    expect(screen.queryByTestId("content")).not.toBeNull();
    expect(yOf(content())).toBeLessThan(ViewHeight);

    await flush();
    expect(screen.queryByTestId("content")).toBeNull();
  });
});

describe("open", () => {
  it("reaches data-state=open on Content and Overlay at the default snap y", async () => {
    render(
      <Sheet defaultOpen snapPoints={[0.5]}>
        <Panel />
      </Sheet>,
    );
    await flush();

    expect(content().getAttribute("data-state")).toBe("open");
    expect(screen.getByTestId("overlay").getAttribute("data-state")).toBe(
      "open",
    );
    expect(content().getAttribute("data-snap-index")).toBe("0");
    expect(yOf(content())).toBe(yFor(0.5));
    expect(probe().dataset.open).toBe("true");
  });

  it("survives StrictMode's double effect pass", async () => {
    render(
      <StrictMode>
        <Sheet defaultOpen snapPoints={[0.5]}>
          <Panel />
        </Sheet>
      </StrictMode>,
    );
    await flush();

    // A controller destroyed by the second pass would leave the panel with no
    // transform and no data-state at all.
    expect(content().getAttribute("data-state")).toBe("open");
    expect(yOf(content())).toBe(yFor(0.5));
    expect(probe().dataset.open).toBe("true");

    // And the surviving one is still listening: dragging it down dismisses.
    await act(async () => {
      drag(content(), 500, 950);
    });
    await flush();

    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("mounts at the default snap index, not at index 0", async () => {
    render(
      <Sheet defaultOpen defaultSnapIndex={2} snapPoints={[0.25, 0.5, 0.9]}>
        <Panel />
      </Sheet>,
    );
    await flush();

    expect(yOf(content())).toBe(yFor(0.9));
    expect(probe().dataset.snap).toBe("2");
  });

  it("wires the aria ids the React parts generated onto the panel", async () => {
    render(
      <Sheet defaultOpen snapPoints={[0.5]}>
        <Panel />
      </Sheet>,
    );
    await flush();

    expect(content().getAttribute("role")).toBe("dialog");
    expect(content().getAttribute("aria-modal")).toBe("true");
    expect(content().getAttribute("aria-labelledby")).toBe(
      screen.getByText("Title").id,
    );
    expect(content().getAttribute("aria-describedby")).toBe(
      screen.getByText("Description").id,
    );
  });
});

describe("drag", () => {
  it("moves the snap index and reports it to onSnapIndexChange and useSheetState", async () => {
    const onSnapIndexChange = vi.fn();
    render(
      <Sheet
        defaultOpen
        snapPoints={[0.25, 0.5, 0.9]}
        onSnapIndexChange={onSnapIndexChange}
      >
        <Panel />
      </Sheet>,
    );
    await flush();
    expect(yOf(content())).toBe(yFor(0.25));
    expect(probe().dataset.snap).toBe("0");

    // 250 px up from y=750 lands exactly on the 0.5 snap (y=500).
    await act(async () => {
      drag(content(), 800, 550);
    });
    await flush();

    expect(onSnapIndexChange).toHaveBeenCalledTimes(1);
    expect(onSnapIndexChange).toHaveBeenCalledWith(1, 0.5);
    expect(probe().dataset.snap).toBe("1");
    expect(content().getAttribute("data-snap-index")).toBe("1");
    expect(yOf(content())).toBe(yFor(0.5));
  });

  it("publishes dragging through useSheetState for the length of the gesture", async () => {
    const onDragStart = vi.fn();
    const onDragEnd = vi.fn();
    render(
      <Sheet
        defaultOpen
        snapPoints={[0.25, 0.5]}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <Panel />
      </Sheet>,
    );
    await flush();

    await act(async () => {
      fire(content(), "pointerdown", { clientY: 800, timeStamp: 0 });
      fire(content(), "pointermove", { clientY: 796, timeStamp: 10 });
    });
    expect(onDragStart).toHaveBeenCalledTimes(1);
    expect(probe().dataset.dragging).toBe("true");
    expect(content().hasAttribute("data-dragging")).toBe(true);

    await act(async () => {
      fire(content(), "pointermove", { clientY: 550, timeStamp: 100 });
      fire(content(), "pointerup", { clientY: 550, timeStamp: 300 });
    });
    await flush();

    expect(onDragEnd).toHaveBeenCalledWith(1);
    expect(probe().dataset.dragging).toBe("false");
    expect(content().hasAttribute("data-dragging")).toBe(false);
  });

  it("closes an uncontrolled sheet dragged below the lowest snap", async () => {
    const onOpenChange = vi.fn();
    const onDragEnd = vi.fn();
    render(
      <Sheet
        defaultOpen
        snapPoints={[0.5]}
        onOpenChange={onOpenChange}
        onDragEnd={onDragEnd}
      >
        <Panel />
      </Sheet>,
    );
    await flush();

    // 200 px below the only snap: past min(80, 25 % of height).
    await act(async () => {
      drag(content(), 500, 700);
    });
    await flush();

    expect(onDragEnd).toHaveBeenCalledWith(-1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId("content")).toBeNull();
  });
});

describe("dismissal", () => {
  it("closes a modal dismissible sheet on Escape and unmounts after the animation", async () => {
    const onOpenChange = vi.fn();
    const onAnimationEnd = vi.fn();
    render(
      <Sheet
        defaultOpen
        snapPoints={[0.5]}
        onOpenChange={onOpenChange}
        onAnimationEnd={onAnimationEnd}
      >
        <Panel />
      </Sheet>,
    );
    await flush();

    fireEvent.keyDown(document, { key: "Escape" });
    // The subtree survives the closing animation; only the state flipped.
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId("content")).not.toBeNull();

    await flush();
    expect(onAnimationEnd).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("ignores Escape when dismissible is false", async () => {
    render(
      <Sheet defaultOpen dismissible={false} snapPoints={[0.5]}>
        <Panel />
      </Sheet>,
    );
    await flush();

    fireEvent.keyDown(document, { key: "Escape" });
    await flush();

    expect(content().getAttribute("data-state")).toBe("open");
    expect(yOf(content())).toBe(yFor(0.5));
  });

  it("closes on an overlay click", async () => {
    render(
      <Sheet defaultOpen snapPoints={[0.5]}>
        <Panel />
      </Sheet>,
    );
    await flush();

    fireEvent.click(screen.getByTestId("overlay"));
    await flush();

    expect(screen.queryByTestId("content")).toBeNull();
  });
});

describe("nested sheets", () => {
  function Nested() {
    return (
      <>
        <Sheet defaultOpen snapPoints={[0.5]}>
          <Sheet.Portal>
            <Sheet.Overlay data-testid="outer-overlay" />
            <Sheet.Content data-testid="outer">outer</Sheet.Content>
          </Sheet.Portal>
        </Sheet>
        <Sheet defaultOpen snapPoints={[0.5]}>
          <Sheet.Portal>
            <Sheet.Overlay data-testid="inner-overlay" />
            <Sheet.Content data-testid="inner">inner</Sheet.Content>
          </Sheet.Portal>
        </Sheet>
      </>
    );
  }

  it("routes Escape to the innermost sheet and keeps the page locked until both close", async () => {
    render(<Nested />);
    await flush();

    expect(document.body.style.overflow).toBe("hidden");
    // The inner sheet opened last, so it inerted the outer panel.
    expect(isInert(screen.getByTestId("outer"))).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    await flush();

    expect(screen.queryByTestId("inner")).toBeNull();
    expect(screen.queryByTestId("outer")).not.toBeNull();
    expect(isInert(screen.getByTestId("outer"))).toBe(false);
    // Refcounted: the outer sheet still holds a reference.
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    await flush();

    expect(screen.queryByTestId("outer")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("does not drag the outer sheet when the gesture starts on the inner one", async () => {
    render(<Nested />);
    await flush();
    const outer = screen.getByTestId("outer");
    const inner = screen.getByTestId("inner");
    expect(yOf(outer)).toBe(yFor(0.5));

    await act(async () => {
      drag(inner, 500, 620);
    });
    await flush();

    // The inner sheet released 120 px below its only snap → dismissed.
    expect(screen.queryByTestId("inner")).toBeNull();
    // The outer one never saw the gesture.
    expect(yOf(outer)).toBe(yFor(0.5));
    expect(outer.getAttribute("data-state")).toBe("open");
  });
});

describe('"content" snap', () => {
  it("re-measures the inner wrapper and animates the panel to the new y", async () => {
    render(
      <Sheet defaultOpen snapPoints={["content"]}>
        <Panel />
      </Sheet>,
    );
    await flush();

    // Nothing measurable under jsdom yet: the placeholder is half the view.
    expect(yOf(content())).toBe(ViewHeight / 2);
    expect(probe().dataset.contentMode).toBe("true");
    expect(content().hasAttribute("data-content-mode")).toBe(true);

    const inner = content().querySelector<HTMLElement>(
      "[data-snap-sheet-inner]",
    );
    if (!inner) throw new Error("Sheet.Content rendered no inner wrapper");

    await act(async () => {
      resizeTo(inner, 300);
      await settle();
    });
    expect(yOf(content())).toBe(ViewHeight - 300);

    await act(async () => {
      resizeTo(inner, 640);
      await settle();
    });
    expect(yOf(content())).toBe(ViewHeight - 640);
  });
});

describe("controlled veto bounce (PLAN §2.2)", () => {
  /** A parent that owns `open` and never acts on `onOpenChange`. */
  function Stubborn({ onOpenChange }: { onOpenChange?: () => void }) {
    return (
      <Sheet open snapPoints={[0.5]} onOpenChange={onOpenChange}>
        <Panel />
      </Sheet>
    );
  }

  it("re-opens after an Escape the parent refused", async () => {
    const onOpenChange = vi.fn();
    render(<Stubborn onOpenChange={onOpenChange} />);
    await flush();

    fireEvent.keyDown(document, { key: "Escape" });
    await flush();

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByTestId("content")).not.toBeNull();
    expect(content().getAttribute("data-state")).toBe("open");
    expect(yOf(content())).toBe(yFor(0.5));
    expect(probe().dataset.open).toBe("true");
  });

  /**
   * BUG — a vetoed dismissal permanently unsubscribes the sheet from Escape.
   *
   * Repro (core, no React needed): a modal + dismissible sheet whose consumer
   * re-opens from inside `onOpenChange(false)`. Escape → `dismiss()` →
   * `closeWith(true)` calls `guard.releaseEscape()` (the sheet leaves the
   * keyboard.ts stack) and then `opts.onOpenChange(false)`. The consumer's
   * re-entrant `open()` calls `guard.engage(dismissible())`, but the guard is
   * still `engaged` (the close animation never reached `disengage()`), so
   * `engage` early-returns and never runs `ensureEscape()`. The sheet is open,
   * modal and dismissible, yet no longer on the Escape stack — for good. Only
   * an unrelated `update()` (`isOpen && modal() && dismissible()` →
   * `ensureEscape()`) would re-arm it by accident.
   *
   * Fixed in task 12: `open()` calls `ensureEscape()` whenever the sheet is
   * modal and dismissible, independently of the guarded `engage()`.
   */
  it("still answers a second Escape after the first was refused", async () => {
    const onOpenChange = vi.fn();
    render(<Stubborn onOpenChange={onOpenChange} />);
    await flush();

    fireEvent.keyDown(document, { key: "Escape" });
    await flush();
    expect(onOpenChange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    await flush();
    expect(onOpenChange).toHaveBeenCalledTimes(2);
  });

  it("re-opens after a drag past the close threshold the parent refused", async () => {
    render(<Stubborn />);
    await flush();

    await act(async () => {
      drag(content(), 500, 700);
    });
    await flush();

    expect(content().getAttribute("data-state")).toBe("open");
    expect(yOf(content())).toBe(yFor(0.5));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("resolves handle.close() immediately instead of hanging on a refusal", async () => {
    const ref = createRef<SheetHandle>();
    render(
      <Sheet ref={ref} open snapPoints={[0.5]}>
        <Panel />
      </Sheet>,
    );
    await flush();

    // Never awaited directly: a promise the library forgot to settle would
    // hang the test instead of failing it.
    let resolved = false;
    await act(async () => {
      ref.current?.close().then(() => {
        resolved = true;
      });
      await settle();
    });

    expect(resolved).toBe(true);
    expect(content().getAttribute("data-state")).toBe("open");
  });
});

describe("imperative handle against the real controller", () => {
  it("snapTo moves the panel and resolves once the spring rests", async () => {
    const ref = createRef<SheetHandle>();
    render(
      <Sheet ref={ref} defaultOpen snapPoints={[0.25, 0.5, 0.9]}>
        <Panel />
      </Sheet>,
    );
    await flush();
    expect(ref.current?.activeSnapIndex).toBe(0);

    let resolved = false;
    await act(async () => {
      ref.current?.snapTo(2).then(() => {
        resolved = true;
      });
      await settle();
    });

    expect(resolved).toBe(true);
    expect(ref.current?.activeSnapIndex).toBe(2);
    expect(ref.current?.y).toBe(yFor(0.9));
    expect(yOf(content())).toBe(yFor(0.9));
    expect(probe().dataset.snap).toBe("2");
  });
});
