import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";
import { mountDemo } from "./mount.tsx";

// #region demo
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
                Scroll the list. At the top, pull down and the sheet takes over.
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

export default (frame: HTMLElement) =>
  mountDemo(frame, (el) => <Scrollable frame={el} />);
