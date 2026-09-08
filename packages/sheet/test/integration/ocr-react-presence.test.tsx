/**
 * Task 16, the React presence HIGH, against the REAL controller.
 *
 * With `reducedMotion` there is no animation, so a close the sheet starts
 * itself reports `onAnimationEnd(false)` in the same batch as
 * `onOpenChange(false)` — before the render that turns the presence gate on.
 * Nothing was left to turn it off again, so the panel stayed mounted for good
 * and the controller was never destroyed.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sheet } from "../../src/react/index.ts";
import { installTestEnv, settle } from "../helpers/env.ts";
import { fire } from "../helpers/pointer.ts";

const flush = () => act(async () => settle());

function Panel({ children }: { children?: ReactNode }) {
  return (
    <Sheet.Portal>
      <Sheet.Overlay data-testid="overlay" />
      <Sheet.Content data-testid="content">
        <Sheet.Handle data-testid="handle" />
        <Sheet.Body data-testid="body">{children}</Sheet.Body>
      </Sheet.Content>
    </Sheet.Portal>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  installTestEnv();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("an immediate close the sheet starts itself", () => {
  it("unmounts after an overlay click (uncontrolled)", async () => {
    render(
      <Sheet defaultOpen reducedMotion snapPoints={[0.5]}>
        <Panel />
      </Sheet>,
    );
    await flush();
    expect(screen.getByTestId("content")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByTestId("overlay"));
    });
    await flush();

    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("unmounts after Escape (controlled)", async () => {
    const seen: boolean[] = [];
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <Sheet
          open={open}
          onOpenChange={(next) => {
            seen.push(next);
            setOpen(next);
          }}
          reducedMotion
          snapPoints={[0.5]}
        >
          <Panel />
        </Sheet>
      );
    }
    render(<Controlled />);
    await flush();

    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await flush();

    expect(seen).toEqual([false]);
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("unmounts after a drag that dismisses (uncontrolled)", async () => {
    render(
      <Sheet defaultOpen reducedMotion snapPoints={[0.5]}>
        <Panel />
      </Sheet>,
    );
    await flush();
    const content = screen.getByTestId("content");

    await act(async () => {
      fire(content, "pointerdown", { clientY: 500, timeStamp: 0 });
      fire(content, "pointermove", { clientY: 510, timeStamp: 10 });
      fire(content, "pointermove", { clientY: 950, timeStamp: 100 });
      fire(content, "pointerup", { clientY: 950, timeStamp: 300 });
    });
    await flush();

    expect(screen.queryByTestId("content")).toBeNull();
  });
});
