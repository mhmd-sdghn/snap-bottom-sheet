// #region demo
import { useState } from "react";
import { Sheet, useSheetState } from "snap-bottom-sheet/react";

// `frame` is the box this demo runs in: it is passed to
// `Sheet.Portal container`, so the sheet stays inside the box instead of
// covering the page. Leave `container` out and the sheet portals to <body>.
function Readout() {
  const { snapIndex, progress } = useSheetState();
  return (
    <p className="demo-readout">
      index {snapIndex} · progress {progress.toFixed(2)}
    </p>
  );
}

function SnapPoints({ frame }: { frame: HTMLElement }) {
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
        snapPoints={[0.25, 0.5, 0.9]}
        defaultSnapIndex={1}
      >
        <Sheet.Portal container={frame}>
          <Sheet.Overlay className="demo-overlay" />
          <Sheet.Content className="demo-sheet">
            <Sheet.Handle className="demo-handle" />
            <Sheet.Header className="demo-header">
              <Sheet.Title className="demo-title">Three snaps</Sheet.Title>
              <Readout />
            </Sheet.Header>
            <Sheet.Body className="demo-body">
              <p>Drag between 25%, 50% and 90% of the frame.</p>
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
  mountDemo(frame, (el) => <SnapPoints frame={el} />);
