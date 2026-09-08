import { useRef, useState } from "react";
import type { SheetHandle } from "snap-bottom-sheet/react";
import { Sheet, useSheetState } from "snap-bottom-sheet/react";
import "./App.css";

/** Live controller state, rendered inside a sheet so it updates every frame. */
function StateReadout() {
  const state = useSheetState();
  return (
    <dl className="readout">
      <dt>snap</dt>
      <dd>{state.snapIndex}</dd>
      <dt>y</dt>
      <dd>{Math.round(state.y)}</dd>
      <dt>progress</dt>
      <dd>{state.progress.toFixed(2)}</dd>
      <dt>dragging</dt>
      <dd>{String(state.dragging)}</dd>
    </dl>
  );
}

function Filler({ count, label }: { count: number; label: string }) {
  const items = Array.from({ length: count }, (_, i) => `${label} ${i + 1}`);
  return (
    <ul className="list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** 1. Content mode: no snap points, so the sheet hugs its own height. */
function LoginScenario() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Sign in
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="panel">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="sheet-header">
              <Sheet.Title>Sign in</Sheet.Title>
              <Sheet.Description>
                Focus an input, then drag the handle — the caret is blurred so
                mobile keyboards do not fight the gesture.
              </Sheet.Description>
            </Sheet.Header>
            <Sheet.Body className="sheet-body">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="you@example.com" />
              <label htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="••••••••" />
              <button type="button" className="primary">
                Continue
              </button>
            </Sheet.Body>
            <Sheet.Close className="sheet-close">Cancel</Sheet.Close>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}

/** 2. "header" + half + scrollable full — the maps/rides peek pattern. */
function PeekScenario() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open peek sheet
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={["header", 0.5, { value: 1, scroll: true }]}
        modal={false}
      >
        <Sheet.Portal>
          <Sheet.Content className="panel">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="sheet-header">
              <Sheet.Title>Nearby</Sheet.Title>
              <StateReadout />
            </Sheet.Header>
            <Sheet.Body className="sheet-body">
              <Filler count={100} label="Stop" />
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}

/** 3. Content that changes size while the sheet is open. */
function DynamicScenario() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(3);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dynamic sheet
      </button>
      <Sheet open={open} onOpenChange={setOpen} snapPoints={["content"]}>
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="panel">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="sheet-header">
              <Sheet.Title>Dynamic height ({rows} rows)</Sheet.Title>
            </Sheet.Header>
            <Sheet.Body className="sheet-body">
              <div className="row">
                <button type="button" onClick={() => setRows((n) => n + 2)}>
                  Add rows
                </button>
                <button
                  type="button"
                  onClick={() => setRows((n) => Math.max(1, n - 2))}
                >
                  Remove rows
                </button>
              </div>
              <Filler count={rows} label="Row" />
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}

/** 4. A sheet that opens a second sheet on top of itself. */
function NestedScenario() {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOuter(true)}>
        Open outer sheet
      </button>
      <Sheet open={outer} onOpenChange={setOuter} snapPoints={[0.6]}>
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="panel">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="sheet-header">
              <Sheet.Title>Outer</Sheet.Title>
            </Sheet.Header>
            <Sheet.Body className="sheet-body">
              <button type="button" onClick={() => setInner(true)}>
                Open inner sheet
              </button>
              <Filler count={8} label="Outer row" />
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
      <Sheet open={inner} onOpenChange={setInner} snapPoints={[0.35]}>
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="panel">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="sheet-header">
              <Sheet.Title>Inner</Sheet.Title>
              <Sheet.Description>
                Escape and overlay clicks must hit this one only.
              </Sheet.Description>
            </Sheet.Header>
            <Sheet.Body className="sheet-body">
              <Sheet.Close className="sheet-close">Close inner</Sheet.Close>
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}

/** 5. Fully controlled open state and snap index, driven from outside. */
function ControlledScenario() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const handle = useRef<SheetHandle>(null);
  const snaps = [0.25, 0.5, 0.9];

  return (
    <>
      <div className="row">
        <button type="button" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Open"}
        </button>
        {snaps.map((snap, i) => (
          <button
            key={snap}
            type="button"
            className={i === index ? "active" : undefined}
            onClick={() => setIndex(i)}
          >
            snap {i}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void handle.current?.snapTo(2, { immediate: true })}
        >
          jump to 2
        </button>
      </div>
      <Sheet
        ref={handle}
        open={open}
        onOpenChange={setOpen}
        snapPoints={snaps}
        activeSnapIndex={index}
        onSnapIndexChange={setIndex}
      >
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="panel">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="sheet-header">
              <Sheet.Title>Controlled</Sheet.Title>
              <StateReadout />
            </Sheet.Header>
            <Sheet.Body className="sheet-body">
              <Filler count={20} label="Item" />
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}

/** 6. reducedMotion forced on: every transition becomes immediate. */
function ReducedMotionScenario() {
  const [open, setOpen] = useState(false);
  const [reduced, setReduced] = useState(true);
  return (
    <>
      <div className="row">
        <button type="button" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Open"}
        </button>
        <label className="toggle">
          <input
            type="checkbox"
            checked={reduced}
            onChange={(event) => setReduced(event.target.checked)}
          />
          reducedMotion
        </label>
      </div>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        snapPoints={[0.4, 0.8]}
        reducedMotion={reduced ? true : "system"}
      >
        <Sheet.Portal>
          <Sheet.Overlay className="overlay" />
          <Sheet.Content className="panel">
            <Sheet.Handle className="handle" />
            <Sheet.Header className="sheet-header">
              <Sheet.Title>
                {reduced ? "Immediate" : "System preference"}
              </Sheet.Title>
            </Sheet.Header>
            <Sheet.Body className="sheet-body">
              <Filler count={10} label="Row" />
            </Sheet.Body>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>
    </>
  );
}

/** 7. Portal container: the sheet lives inside a phone frame, not the page. */
function ContainerScenario() {
  const [open, setOpen] = useState(false);
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "Open in frame"}
      </button>
      <div className="phone" ref={setFrame}>
        <p>
          The frame is the Portal container, so the sheet is positioned
          absolutely inside it and the view height is the frame's.
        </p>
        <Sheet open={open} onOpenChange={setOpen} snapPoints={[0.4, 0.85]}>
          <Sheet.Portal container={frame}>
            <Sheet.Overlay className="overlay" />
            <Sheet.Content className="panel">
              <Sheet.Handle className="handle" />
              <Sheet.Header className="sheet-header">
                <Sheet.Title>In a frame</Sheet.Title>
                <StateReadout />
              </Sheet.Header>
              <Sheet.Body className="sheet-body">
                <Filler count={15} label="Framed row" />
              </Sheet.Body>
            </Sheet.Content>
          </Sheet.Portal>
        </Sheet>
      </div>
    </>
  );
}

const Scenarios = [
  {
    id: "login",
    title: "Login sheet (content mode)",
    hint: "No snapPoints: the sheet hugs its content. Focus an input, then drag the handle — the caret blurs. Drag past the threshold to dismiss.",
    Component: LoginScenario,
  },
  {
    id: "peek",
    title: "Map-style peek sheet",
    hint: '["header", 0.5, { value: 1, scroll: true }] and non-modal. Drag between the three snaps; at the top, scroll the list, then pull down from the very top to drag instead.',
    Component: PeekScenario,
  },
  {
    id: "dynamic",
    title: "Dynamic content",
    hint: 'snapPoints={["content"]}. Add and remove rows while it is open — the sheet re-animates to the new height instead of jumping.',
    Component: DynamicScenario,
  },
  {
    id: "nested",
    title: "Nested sheets",
    hint: "Open the inner sheet from inside the outer one. Escape and overlay clicks must close only the inner; the page must stay scroll-locked until both are closed.",
    Component: NestedScenario,
  },
  {
    id: "controlled",
    title: "Controlled open and snap",
    hint: "open and activeSnapIndex are both controlled. Drag the sheet and watch the buttons follow; press the buttons and watch the sheet follow.",
    Component: ControlledScenario,
  },
  {
    id: "reduced",
    title: "Reduced motion",
    hint: "With the box checked every transition is immediate. Uncheck it to fall back to the OS preference.",
    Component: ReducedMotionScenario,
  },
  {
    id: "container",
    title: "Custom Portal container",
    hint: "The sheet renders inside the phone frame: position absolute, view height = the frame's. The rest of the page stays interactive.",
    Component: ContainerScenario,
  },
] as const;

export default function App() {
  const [active, setActive] =
    useState<(typeof Scenarios)[number]["id"]>("login");
  const scenario = Scenarios.find((s) => s.id === active) ?? Scenarios[0];

  return (
    <main>
      <h1>snap-bottom-sheet — React playground</h1>
      <p className="intro">
        A live playground for{" "}
        <a href="https://mhmd-sdghn.github.io/snap-bottom-sheet/">
          snap-bottom-sheet
        </a>
        . Pick a scenario below and drag the sheet. Each one is a small React
        app running the published build.
      </p>
      <nav className="tabs">
        {Scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === active ? "active" : undefined}
            onClick={() => setActive(s.id)}
          >
            {s.title}
          </button>
        ))}
      </nav>
      <section>
        <h2>{scenario.title}</h2>
        <p className="hint">{scenario.hint}</p>
        <scenario.Component />
      </section>
      <p className="note">
        Every scenario consumes the published entry points only —
        <code>snap-bottom-sheet/react</code> resolved through{" "}
        <code>workspace:*</code> to <code>dist/</code>. Run{" "}
        <code>pnpm build</code> after changing the library.
      </p>
    </main>
  );
}
