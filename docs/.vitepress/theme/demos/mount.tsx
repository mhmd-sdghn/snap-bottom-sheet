import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

/**
 * Every demo exports `(frame) => teardown`, which `ReactDemo.vue` calls with
 * the frame element.
 *
 * React renders into a child of the frame rather than the frame itself, so the
 * frame stays free to be the sheet's `Sheet.Portal container` — the portal
 * appends beside the React root instead of inside it.
 */
export function mountDemo(
  frame: HTMLElement,
  render: (frame: HTMLElement) => ReactNode,
): () => void {
  const host = document.createElement("div");
  host.className = "demo-host";
  frame.append(host);

  const root = createRoot(host);
  root.render(render(frame));

  return () => {
    root.unmount();
    host.remove();
  };
}
