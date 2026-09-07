import { useState } from "react";
import { Sheet, useSnapState } from "snap-bottom-sheet";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenTwo, setIsOpenTwo] = useState(false);

  const [snapPoints] = useSnapState([], { drag: { up: false } });
  // const [snapPoints] = useState<SnapPoints>([
  //   SnapPointDynamicValue,
  //   { value: 1, scroll: true },
  // ]);
  const [activeSnapPointIndex, setActiveSnapPointIndex] = useState(0);
  const [activeSnapPointIndexTwo, setActiveSnapPointIndexTwo] = useState(0);

  const onSnap = (index: number) => {
    // index is -1 if onClose is called
    if (index !== -1) setActiveSnapPointIndex(index);
  };

  const onSnapTwo = (index: number) => {
    // index is -1 if onClose is called
    if (index !== -1) setActiveSnapPointIndexTwo(index);
  };

  const onClose = () => {
    setActiveSnapPointIndex(0);
    setIsOpen(false);
  };

  const onCloseTwo = () => {
    setActiveSnapPointIndexTwo(0);
    setIsOpenTwo(false);
    onClose();
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "hide" : "show"}
      </button>
      <button
        type="button"
        style={{ position: "fixed", left: 100, zIndex: 999 }}
        onClick={() => setActiveSnapPointIndex(0)}
      >
        index 0
      </button>

      <Sheet
        isOpen={isOpen}
        snapPoints={snapPoints}
        activeSnapPointIndex={activeSnapPointIndex}
        onSnap={onSnap}
        onClose={onClose}
      >
        <Sheet.Container
          overlayColor="rgba(0, 0, 0, 0.5)"
          wrapper
          wrapperPortalElement={document.body}
          onOverlayClick={onClose}
        >
          <Sheet.DynamicHeight>
            <div
              style={{
                background: "#fff",
                padding: 16,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h1>Login</h1>
              <input
                style={{
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid #eeeeee",
                }}
                placeholder="phone number"
              />
              <button
                type="button"
                style={{
                  padding: 12,
                  borderRadius: 6,
                  border: "1px solid #eeeeee",
                  marginTop: 16,
                  fontWeight: "bold",
                }}
                onClick={() => setIsOpenTwo(true)}
              >
                Login
              </button>

              <Sheet
                isOpen={isOpenTwo}
                snapPoints={snapPoints}
                activeSnapPointIndex={activeSnapPointIndexTwo}
                onSnap={onSnapTwo}
                onClose={onCloseTwo}
              >
                <Sheet.Container
                  overlayColor="rgba(0, 0, 0, 0.5)"
                  wrapper
                  wrapperPortalElement={document.body}
                  onOverlayClick={onCloseTwo}
                >
                  <Sheet.DynamicHeight>
                    <div
                      style={{
                        background: "#fff",
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <input
                        style={{
                          padding: 12,
                          borderRadius: 6,
                          border: "1px solid #eeeeee",
                        }}
                        placeholder="Verify code sent in sms"
                      />
                      <button
                        type="button"
                        style={{
                          padding: 12,
                          borderRadius: 6,
                          border: "1px solid #eeeeee",
                          marginTop: 16,
                          fontWeight: "bold",
                        }}
                        onClick={onCloseTwo}
                      >
                        Verify
                      </button>
                    </div>
                  </Sheet.DynamicHeight>
                </Sheet.Container>
              </Sheet>
            </div>
          </Sheet.DynamicHeight>
        </Sheet.Container>
      </Sheet>
    </>
  );
}

export default App;
