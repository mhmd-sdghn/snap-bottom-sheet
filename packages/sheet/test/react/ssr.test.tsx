// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sheet } from "../../src/react/index.ts";

describe("SSR", () => {
  it("renders the portal subtree as nothing and touches no DOM", () => {
    const html = renderToString(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Overlay />
          <Sheet.Content>
            <Sheet.Title>Title</Sheet.Title>x
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    expect(html).toBe("");
    expect(html).not.toContain("data-state");
    expect(typeof globalThis.document).toBe("undefined");
  });

  it("renders every part outside a Portal without touching the DOM", () => {
    // No Portal here on purpose: with one, the whole subtree is skipped and
    // the parts themselves are never exercised on the server at all.
    const html = renderToString(
      <Sheet open>
        <Sheet.Overlay className="overlay" />
        <Sheet.Content className="content">
          <Sheet.Handle />
          <Sheet.Header>
            <Sheet.Title>Title</Sheet.Title>
            <Sheet.Description>Description</Sheet.Description>
          </Sheet.Header>
          <Sheet.Body>
            <Sheet.Close>Close</Sheet.Close>
          </Sheet.Body>
        </Sheet.Content>
      </Sheet>,
    );

    // The panel and its measured wrapper are there…
    expect(html).toContain('class="content"');
    expect(html).toContain("data-snap-sheet-inner");
    expect(html).toContain('class="overlay"');
    expect(html).toContain('aria-label="Resize sheet"');
    expect(html).toContain("Description");

    // …and nothing that depends on sheet state is, because the controller
    // writes all of it and there is no controller on the server.
    expect(html).not.toContain("data-state");
    expect(html).not.toContain("data-snap-index");
    expect(html).not.toContain("aria-modal");
    expect(html).not.toContain("transform");
    expect(html).not.toContain("--snap-sheet");

    expect(typeof globalThis.document).toBe("undefined");
  });
});
