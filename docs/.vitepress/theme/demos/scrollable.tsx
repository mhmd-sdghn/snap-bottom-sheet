// #region demo
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

// `frame` is the box this demo runs in: it is passed to
// `Sheet.Portal container`, so the sheet stays inside the box instead of
// covering the page. Leave `container` out and the sheet portals to <body>.
function Scrollable({ frame }: { frame: HTMLElement }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="demo-page">
      <button
        type="button"
        className="demo-button"
        onClick={() => setOpen(true)}
      >
        Open the sheet
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={[0.4, { value: 1, scroll: true }]}
        defaultSnapIndex={1}
      >
        <Sheet.Portal container={frame}>
          <Sheet.Overlay className="demo-overlay" />
          <Sheet.Content className="demo-sheet">
            <Sheet.Handle className="demo-handle" />
            <Sheet.Header className="demo-header">
              <Sheet.Title className="demo-title">
                Scroll, then drag
              </Sheet.Title>
              <Sheet.Description className="demo-description">
                Drag the list up: the sheet rises, then the same movement
                scrolls. Scroll back to the top and it drags again.
              </Sheet.Description>
            </Sheet.Header>
            <Sheet.Body className="demo-body">
              <ul className="demo-list">
                {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => (
                  <li key={n}>Item {n}</li>
                ))}
              </ul>
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </div>
  );
}

// #endregion demo

import { mountDemo } from "./mount.tsx";

export default (frame: HTMLElement) =>
  mountDemo(frame, (el) => <Scrollable frame={el} />);
