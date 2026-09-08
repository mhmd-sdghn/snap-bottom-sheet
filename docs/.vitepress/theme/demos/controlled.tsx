import { useRef, useState } from "react";
import type { SheetHandle } from "snap-bottom-sheet/react";
import { Sheet } from "snap-bottom-sheet/react";
import { mountDemo } from "./mount.tsx";

// #region demo
function Controlled({ frame }: { frame: HTMLElement }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const handle = useRef<SheetHandle>(null);

  return (
    <div className="demo-page">
      <div className="demo-row">
        <button
          type="button"
          className="demo-button"
          onClick={() => setOpen(true)}
        >
          Open
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => setIndex(0)}
        >
          Snap 0
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => setIndex(1)}
        >
          Snap 1
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => void handle.current?.close()}
        >
          Close via ref
        </button>
      </div>
      <p className="demo-readout">
        open {String(open)} · index {index}
      </p>

      <Sheet
        ref={handle}
        open={open}
        onOpenChange={setOpen}
        activeSnapIndex={index}
        onSnapIndexChange={setIndex}
        snapPoints={[0.35, 0.75]}
      >
        <Sheet.Portal container={frame}>
          <Sheet.Overlay className="demo-overlay" />
          <Sheet.Content className="demo-sheet">
            <Sheet.Handle className="demo-handle" />
            <Sheet.Header className="demo-header">
              <Sheet.Title className="demo-title">
                Driven from outside
              </Sheet.Title>
            </Sheet.Header>
            <Sheet.Body className="demo-body">
              <p>Drag it and the buttons above stay in sync.</p>
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </div>
  );
}
// #endregion demo

export default (frame: HTMLElement) =>
  mountDemo(frame, (el) => <Controlled frame={el} />);
