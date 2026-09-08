// #region demo
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

// `frame` is the box this demo runs in: it is passed to
// `Sheet.Portal container`, so the sheet stays inside the box instead of
// covering the page. Leave `container` out and the sheet portals to <body>.
function DynamicHeight({ frame }: { frame: HTMLElement }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(2);

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
        snapPoints={["header", "content"]}
        defaultSnapIndex={1}
      >
        <Sheet.Portal container={frame}>
          <Sheet.Overlay className="demo-overlay" />
          <Sheet.Content className="demo-sheet">
            <Sheet.Handle className="demo-handle" />
            <Sheet.Header className="demo-header">
              <Sheet.Title className="demo-title">Measured live</Sheet.Title>
              <Sheet.Description className="demo-description">
                Snap 0 is the header, snap 1 is the whole content.
              </Sheet.Description>
            </Sheet.Header>
            <Sheet.Body className="demo-body">
              <button
                type="button"
                className="demo-button"
                onClick={() => setRows((n) => n + 1)}
              >
                Add a row
              </button>
              <ul className="demo-list">
                {Array.from({ length: rows }, (_, i) => i + 1).map((n) => (
                  <li key={n}>Row {n}</li>
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
  mountDemo(frame, (el) => <DynamicHeight frame={el} />);
