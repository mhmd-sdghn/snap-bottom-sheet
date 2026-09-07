/**
 * Vanilla playground: the framework-agnostic core API only.
 * Every scenario tears the previous controller down and builds a fresh one.
 */

import type {
  SheetController,
  SheetOptions,
  SheetState,
  SnapPoint,
} from "snap-bottom-sheet";
import { createSheet, steps } from "snap-bottom-sheet";

interface Scenario {
  label: string;
  description: string;
  snapPoints?: SnapPoint[];
  options?: SheetOptions;
  rows: number;
  /** Extra buttons this scenario needs. */
  extras?: "snapTo" | "recreate";
}

const scenarios: Record<string, Scenario> = {
  content: {
    label: "1 — Content mode",
    description:
      "No snapPoints at all: the sheet hugs its content. Drag it down past " +
      "the threshold to dismiss it.",
    rows: 4,
  },
  header: {
    label: "2 — Header + half + full",
    description:
      'snapPoints ["header", 0.5, { value: 1, scroll: true }]: drag between ' +
      "the three snaps; at the top snap scroll the list, then pull down from " +
      "the very top of the list to drag instead of scroll.",
    snapPoints: ["header", 0.5, { value: 1, scroll: true }],
    rows: 60,
  },
  steps: {
    label: "3 — steps(3)",
    description:
      "snapPoints steps(3) = [1/3, 2/3, 1]: drag between the three evenly " +
      "spaced snaps and watch data-snap-index on the panel change.",
    snapPoints: steps(3),
    rows: 12,
  },
  nodown: {
    label: "4 — No drag down on the lowest snap",
    description:
      "snapPoints [{ value: 0.3, drag: { down: false } }, 0.9]: at index 0 " +
      "downward drags do nothing — the Close button still closes it.",
    snapPoints: [{ value: 0.3, drag: { down: false } }, 0.9],
    rows: 8,
  },
  nonmodal: {
    label: "5 — Non-modal",
    description:
      "modal: false, no overlay element passed: scroll the page behind the " +
      "sheet while it is open — nothing is locked or made inert.",
    snapPoints: [0.35],
    options: { modal: false },
    rows: 6,
  },
  snapTo: {
    label: "6 — Controlled snapTo",
    description:
      "snapPoints [0.25, 0.5, 0.9]: the buttons call controller.snapTo(i), " +
      "with and without { immediate: true } (spring vs. jump).",
    snapPoints: [0.25, 0.5, 0.9],
    rows: 10,
    extras: "snapTo",
  },
  destroy: {
    label: "7 — Destroy / recreate",
    description:
      "destroy() detaches everything (the readout freezes); press it twice " +
      "in a row — it must be idempotent — then recreate and confirm the page " +
      "is not left scroll-locked.",
    snapPoints: [0.4, 0.8],
    rows: 6,
    extras: "recreate",
  },
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", "btn", label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("#app is missing");

const page = el("div", "page");
page.innerHTML = `
  <h1>snap-bottom-sheet — vanilla core API (createSheet)</h1>
  <label class="field">Scenario <select id="pick"></select></label>
  <h2 id="title"></h2>
  <p class="hint" id="hint"></p>
  <div class="row" id="actions"></div>
  <pre class="status" id="status"></pre>
`;
const host = el("div");
app.append(page, host);

function part<T extends HTMLElement>(selector: string): T {
  const node = page.querySelector<T>(selector);
  if (!node) throw new Error(`page shell is missing ${selector}`);
  return node;
}

const pick = part<HTMLSelectElement>("#pick");
const title = part("#title");
const hint = part("#hint");
const actions = part("#actions");
const status = part("#status");

const showState = (s: SheetState) => {
  status.textContent = [
    `open        ${s.open}`,
    `snapIndex   ${s.snapIndex}`,
    `y           ${Math.round(s.y)}`,
    `progress    ${s.progress.toFixed(2)}`,
    `dragging    ${s.dragging}`,
    `animating   ${s.animating}`,
    `contentMode ${s.contentMode}`,
  ].join("\n");
};

let controller: SheetController | null = null;
let unsubscribe = () => {};

function mount(key: string): void {
  unsubscribe();
  unsubscribe = () => {};
  controller?.destroy();
  controller = null;

  const scenario = scenarios[key];
  if (!scenario) return;
  title.textContent = scenario.label;
  hint.textContent = scenario.description;

  // Overlay is a sibling of the panel inside a wrapper; a non-modal sheet
  // simply does not render one.
  const root = el("div");
  const overlay =
    scenario.options?.modal === false ? null : el("div", "sheet-overlay");
  const content = el("div", "sheet");
  const inner = el("div", "sheet-inner");
  inner.dataset.snapSheetInner = "";
  const handle = el("button", "sheet-handle");
  handle.type = "button";
  const header = el("div", "sheet-header");
  const body = el("div", "sheet-body");

  header.append(el("h3", undefined, scenario.label));
  header.append(button("Close", () => void controller?.close()));
  for (let i = 1; i <= scenario.rows; i += 1) {
    body.append(el("div", "list-row", `Row ${i}`));
  }
  inner.append(handle, header, body);
  content.append(inner);
  if (overlay) root.append(overlay);
  root.append(content);
  host.replaceChildren(root);

  controller = createSheet(
    { content, header, body, overlay, handle },
    { ...scenario.options, snapPoints: scenario.snapPoints },
  );
  unsubscribe = controller.subscribe(showState);
  showState(controller.getState());

  actions.replaceChildren(
    button("open()", () => void controller?.open()),
    button("close()", () => void controller?.close()),
  );
  if (scenario.extras === "snapTo") {
    for (let i = 0; i < 3; i += 1) {
      actions.append(
        button(`snapTo(${i})`, () => void controller?.snapTo(i)),
        button(`snapTo(${i}, immediate)`, () => {
          void controller?.snapTo(i, { immediate: true });
        }),
      );
    }
  }
  if (scenario.extras === "recreate") {
    actions.append(
      button("destroy()", () => controller?.destroy()),
      button("recreate", () => mount(key)),
    );
  }

  void controller.open();
}

for (const [key, scenario] of Object.entries(scenarios)) {
  const option = el("option", undefined, scenario.label);
  option.value = key;
  pick.append(option);
}
pick.addEventListener("change", () => mount(pick.value));

// Some hosts (an embedded/hidden frame) still report window.innerHeight === 0
// while modules evaluate; createSheet would then find no usable snap point.
requestAnimationFrame(() => mount(pick.value));
