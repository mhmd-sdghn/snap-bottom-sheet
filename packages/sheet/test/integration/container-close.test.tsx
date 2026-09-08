/**
 * The close animation must survive a consumer whose state update flushes
 * synchronously. Every docs demo dismisses by clicking the overlay, which the
 * controller owns: it announces the dismissal through `onOpenChange(false)`
 * *before* it starts the closing spring, so a synchronous flush renders the
 * presence gate and runs the sync effect inside that gap.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "../../src/react/index.ts";
import {
  installTestEnv,
  setHeight,
  settle,
  ViewHeight,
} from "../helpers/env.ts";

const FrameHeight = 520;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = "";
  installTestEnv();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const yOf = (el: HTMLElement) =>
  Number(
    /translate3d\(0, (-?[\d.]+)px, 0\)/.exec(el.style.transform)?.[1] ??
      Number.NaN,
  );

function App({
  container: useContainer,
  sync,
}: {
  container: boolean;
  sync: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <div
        data-testid="frame"
        ref={(el) => {
          // sized before the controller attaches, or the view height is 0 and
          // the open is deferred instead of resolving a snap
          if (el) setHeight(el, FrameHeight);
          setFrame(el);
        }}
      />
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (sync) flushSync(() => setOpen(next));
          else setOpen(next);
        }}
        snapPoints={[0.5]}
      >
        <Sheet.Portal container={useContainer ? frame : undefined}>
          <Sheet.Overlay data-testid="overlay" />
          <Sheet.Content data-testid="content">
            <Sheet.Handle data-testid="handle" />
            <Sheet.Body data-testid="body">content</Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}

async function dismissAndSample(container: boolean, sync: boolean) {
  render(<App container={container} sync={sync} />);
  await act(async () => {
    await settle();
  });

  const openedAt = yOf(screen.getByTestId("content"));

  await act(async () => {
    screen
      .getByTestId("overlay")
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  const frames: (number | null)[] = [];
  for (let i = 0; i < 4; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16);
    });
    const panel = screen.queryByTestId("content");
    frames.push(panel ? yOf(panel) : null);
  }

  await act(async () => {
    await settle();
  });

  return { openedAt, frames, mountedAtEnd: !!screen.queryByTestId("content") };
}

describe("dismissal with a synchronous parent", () => {
  for (const container of [false, true]) {
    const where = container ? "in a container" : "on the viewport";
    const rest = container ? FrameHeight / 2 : ViewHeight / 2;

    it(`animates the close ${where}`, async () => {
      const { openedAt, frames, mountedAtEnd } = await dismissAndSample(
        container,
        true,
      );

      expect(openedAt).toBe(rest);
      // every sampled frame still mounted, and travelling downwards
      expect(frames.every((y) => y !== null)).toBe(true);
      for (const y of frames) expect(y).toBeGreaterThan(rest);
      expect(frames).toEqual([...frames].sort((a, b) => Number(a) - Number(b)));
      // ...and gone once the spring rests
      expect(mountedAtEnd).toBe(false);
    });

    it(`matches an asynchronous parent ${where}`, async () => {
      const sync = await dismissAndSample(container, true);
      cleanup();
      const async = await dismissAndSample(container, false);

      // a flushSync consumer must not get a different animation
      expect(sync.frames).toEqual(async.frames);
    });
  }
});
