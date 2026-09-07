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
});
