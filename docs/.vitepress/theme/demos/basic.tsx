// #region demo
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

// `frame` is the box this demo runs in: it is passed to
// `Sheet.Portal container`, so the sheet stays inside the box instead of
// covering the page. Leave `container` out and the sheet portals to <body>.
function Basic({ frame }: { frame: HTMLElement }) {
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

      <Sheet open={open} onOpenChange={setOpen}>
        <Sheet.Portal container={frame}>
          <Sheet.Overlay className="demo-overlay" />
          <Sheet.Content className="demo-sheet">
            <Sheet.Handle className="demo-handle" />
            <Sheet.Header className="demo-header">
              <Sheet.Title className="demo-title">Content mode</Sheet.Title>
              <Sheet.Description className="demo-description">
                No snap points, so the sheet hugs its own height.
              </Sheet.Description>
            </Sheet.Header>
            <Sheet.Body className="demo-body">
              <p>Drag it down past the threshold to dismiss it.</p>
              <Sheet.Close className="demo-button">Close</Sheet.Close>
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
  mountDemo(frame, (el) => <Basic frame={el} />);
