import { createSheet } from "snap-bottom-sheet";

// #region demo
export function mountVanilla(frame: HTMLElement) {
  frame.innerHTML = `
    <div class="demo-host">
      <button type="button" class="demo-button" id="v-open">Open the sheet</button>
    </div>
    <div class="demo-overlay" id="v-overlay"></div>
    <div class="demo-sheet" id="v-sheet">
      <div data-snap-sheet-inner>
        <button type="button" class="demo-handle" id="v-handle"></button>
        <div class="demo-header">
          <h2 class="demo-title" id="v-title">No React here</h2>
          <p class="demo-description">The same engine, driven by createSheet.</p>
        </div>
        <div class="demo-body">
          <p>Drag it, or click the scrim to dismiss.</p>
        </div>
      </div>
    </div>`;

  const content = frame.querySelector<HTMLElement>("#v-sheet");
  if (!content) throw new Error("the sheet markup is missing");

  const sheet = createSheet(
    {
      content,
      header: frame.querySelector<HTMLElement>(".demo-header"),
      body: frame.querySelector<HTMLElement>(".demo-body"),
      overlay: frame.querySelector<HTMLElement>("#v-overlay"),
      handle: frame.querySelector<HTMLElement>("#v-handle"),
      container: frame,
    },
    { modal: false, labelledBy: "v-title" },
  );

  frame.querySelector("#v-open")?.addEventListener("click", () => {
    void sheet.open();
  });

  return () => {
    sheet.destroy();
    frame.innerHTML = "";
  };
}
// #endregion demo

export default mountVanilla;
