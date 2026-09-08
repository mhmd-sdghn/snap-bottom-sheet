// #region demo
import { useState } from "react";
import { Sheet } from "snap-bottom-sheet/react";

// `frame` is the box this demo runs in: it is passed to
// `Sheet.Portal container`, so the sheet stays inside the box instead of
// covering the page. Leave `container` out and the sheet portals to <body>.
function Nested({ frame }: { frame: HTMLElement }) {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);

  return (
    <div className="demo-page">
      <button
        type="button"
        className="demo-button"
        onClick={() => setOuter(true)}
      >
        Open the sheet
      </button>

      <Sheet open={outer} onOpenChange={setOuter} snapPoints={[0.6]}>
        <Sheet.Portal container={frame}>
          <Sheet.Overlay className="demo-overlay" />
          <Sheet.Content className="demo-sheet">
            <Sheet.Handle className="demo-handle" />
            <Sheet.Header className="demo-header">
              <Sheet.Title className="demo-title">Ride options</Sheet.Title>
            </Sheet.Header>
            <Sheet.Body className="demo-body">
              <p>
                The inner sheet is another {"<Sheet>"}, portalled to the same
                frame.
              </p>
              <button
                type="button"
                className="demo-button"
                onClick={() => setInner(true)}
              >
                Choose payment
              </button>

              <Sheet open={inner} onOpenChange={setInner}>
                <Sheet.Portal container={frame}>
                  <Sheet.Overlay className="demo-overlay demo-overlay--inner" />
                  <Sheet.Content className="demo-sheet demo-sheet--inner">
                    <Sheet.Handle className="demo-handle" />
                    <Sheet.Header className="demo-header">
                      <Sheet.Title className="demo-title">Payment</Sheet.Title>
                    </Sheet.Header>
                    <Sheet.Body className="demo-body">
                      <p>Closing this leaves the outer sheet where it was.</p>
                      <Sheet.Close className="demo-button">Done</Sheet.Close>
                    </Sheet.Body>
                  </Sheet.Content>
                </Sheet.Portal>
              </Sheet>
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
  mountDemo(frame, (el) => <Nested frame={el} />);
