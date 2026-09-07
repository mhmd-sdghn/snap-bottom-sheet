"use client";

import { useState } from "react";
import { Sheet, useSheetState } from "snap-bottom-sheet/react";

const items = Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`);

/** Live controller state, rendered in the header so a tester can watch it. */
function LiveState() {
  const { open, snapIndex, y, progress } = useSheetState();
  return (
    <p className="state">
      open={String(open)} snapIndex={snapIndex} y={Math.round(y)} progress=
      {progress.toFixed(2)}
    </p>
  );
}

export default function SheetDemo() {
  /*
   * Deliberately uncontrolled (`defaultOpen`): that is the path the SSR smoke
   * test cares about — the sheet is open on mount, so hydration has to survive
   * a Portal that renders null on the server and real content one tick later.
   *
   * Reopening remounts with a new key rather than flipping a prop, because
   * `SheetHandle` exposes `close()` but no `open()` (see the task 08 report),
   * and adding an `open` prop later would silently convert the sheet to
   * controlled.
   */
  const [instance, setInstance] = useState(0);

  return (
    <>
      <button
        className="trigger"
        type="button"
        onClick={() => setInstance((n) => n + 1)}
      >
        Reopen sheet
      </button>

      <Sheet
        key={instance}
        defaultOpen
        snapPoints={["header", 0.5, { value: 1, scroll: true }]}
      >
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="content">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="header">
              <Sheet.Title className="title">Next.js playground</Sheet.Title>
              <Sheet.Description className="description">
                Drag the handle between header / 50% / full. Only the tallest
                snap scrolls.
              </Sheet.Description>
              <LiveState />
            </Sheet.Header>
            <Sheet.Body className="body">
              <ul className="list">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Sheet.Body>
            <Sheet.Close className="close">Close</Sheet.Close>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}
