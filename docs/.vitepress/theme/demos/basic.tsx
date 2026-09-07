import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";
import { mountDemo } from "./mount.tsx";

// #region demo
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

      {/* modal (the default): the lock is scoped to the Portal container, so
          the docs page you are reading keeps scrolling */}
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

export default (frame: HTMLElement) =>
  mountDemo(frame, (el) => <Basic frame={el} />);
