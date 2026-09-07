import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSheet } from "../../src/core/sheet.ts";
import type { SheetHandle } from "../../src/react/index.ts";
import { Sheet, useSheetState } from "../../src/react/index.ts";
import { type FakeController, makeFakeController } from "./fake-controller.ts";

vi.mock("../../src/core/sheet.ts", () => ({ createSheet: vi.fn() }));
const createSheetMock = vi.mocked(createSheet);

let fake: FakeController;

beforeEach(() => {
  fake = makeFakeController();
  createSheetMock.mockImplementation((elements, options) => {
    fake.elements = elements;
    fake.options = options ?? null;
    return fake;
  });
});

function Panel({ children }: { children?: React.ReactNode }) {
  return (
    <Sheet.Portal>
      <Sheet.Overlay data-testid="overlay" />
      <Sheet.Content data-testid="content">
        <Sheet.Handle data-testid="handle" />
        <Sheet.Header data-testid="header">
          <Sheet.Title data-testid="title">Title</Sheet.Title>
          <Sheet.Description data-testid="description">Body</Sheet.Description>
        </Sheet.Header>
        <Sheet.Body data-testid="body">{children}</Sheet.Body>
      </Sheet.Content>
    </Sheet.Portal>
  );
}

describe("presence", () => {
  it("renders nothing while closed and the subtree once open", () => {
    const { rerender } = render(
      <Sheet open={false}>
        <Panel />
      </Sheet>,
    );
    expect(screen.queryByTestId("content")).toBeNull();
    expect(createSheetMock).not.toHaveBeenCalled();

    rerender(
      <Sheet open>
        <Panel />
      </Sheet>,
    );
    expect(screen.getByTestId("content")).toBeTruthy();
  });

  it("keeps the subtree until the controller reports the close animation ended", () => {
    const { rerender } = render(
      <Sheet open>
        <Panel />
      </Sheet>,
    );
    expect(fake.open).toHaveBeenCalledTimes(1);

    rerender(
      <Sheet open={false}>
        <Panel />
      </Sheet>,
    );
    expect(fake.close).toHaveBeenCalledTimes(1);
    // still mounted: the animation is running
    expect(screen.getByTestId("content")).toBeTruthy();

    act(() => fake.options?.onAnimationEnd?.(false));
    expect(screen.queryByTestId("content")).toBeNull();
  });
});

describe("controller lifecycle", () => {
  it("creates one controller with every rendered node and the aria ids", () => {
    render(
      <Sheet open>
        <Panel />
      </Sheet>,
    );

    expect(createSheetMock).toHaveBeenCalledTimes(1);
    expect(fake.elements?.content).toBe(screen.getByTestId("content"));
    expect(fake.elements?.header).toBe(screen.getByTestId("header"));
    expect(fake.elements?.body).toBe(screen.getByTestId("body"));
    expect(fake.elements?.overlay).toBe(screen.getByTestId("overlay"));
    expect(fake.elements?.handle).toBe(screen.getByTestId("handle"));
    expect(fake.options?.labelledBy).toBe(screen.getByTestId("title").id);
    expect(fake.options?.describedBy).toBe(
      screen.getByTestId("description").id,
    );
  });

  it("omits the aria ids when Title and Description are not rendered", () => {
    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content data-testid="content">x</Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );
    expect(fake.options?.labelledBy).toBeUndefined();
    expect(fake.options?.describedBy).toBeUndefined();
  });

  it("hands over a part that mounts after the controller exists", () => {
    function Tree({ withHeader }: { withHeader: boolean }) {
      return (
        <Sheet open>
          <Sheet.Portal>
            <Sheet.Content data-testid="content">
              {withHeader ? <Sheet.Header data-testid="header" /> : null}
            </Sheet.Content>
          </Sheet.Portal>
        </Sheet>
      );
    }

    const { rerender } = render(<Tree withHeader={false} />);
    expect(fake.elements?.header).toBeNull();
    expect(fake.setElements).not.toHaveBeenCalled();

    rerender(<Tree withHeader />);
    // exactly one: a callback ref that changed identity every render would
    // detach and reattach the part on every commit
    expect(fake.setElements).toHaveBeenCalledTimes(1);
    expect(fake.setElements).toHaveBeenCalledWith({
      header: screen.getByTestId("header"),
    });

    rerender(<Tree withHeader={false} />);
    expect(fake.setElements).toHaveBeenCalledTimes(2);
    expect(fake.setElements).toHaveBeenLastCalledWith({ header: null });
    expect(createSheetMock).toHaveBeenCalledTimes(1);
  });

  it("routes a late Title through update(), not setElements()", () => {
    function Tree({ withTitle }: { withTitle: boolean }) {
      return (
        <Sheet open>
          <Sheet.Portal>
            <Sheet.Content data-testid="content">
              {withTitle ? (
                <Sheet.Title data-testid="title">T</Sheet.Title>
              ) : null}
            </Sheet.Content>
          </Sheet.Portal>
        </Sheet>
      );
    }

    const { rerender } = render(<Tree withTitle={false} />);
    expect(fake.options?.labelledBy).toBeUndefined();

    rerender(<Tree withTitle />);
    // an aria id is not a SheetElement
    expect(fake.setElements).not.toHaveBeenCalled();
    expect(fake.update).toHaveBeenCalledTimes(1);
    expect(fake.update).toHaveBeenCalledWith({
      labelledBy: screen.getByTestId("title").id,
    });

    rerender(<Tree withTitle={false} />);
    expect(fake.update).toHaveBeenCalledTimes(2);
    expect(fake.update).toHaveBeenLastCalledWith({ labelledBy: undefined });
    expect(createSheetMock).toHaveBeenCalledTimes(1);
  });

  it("routes a late Description through update()", () => {
    function Tree({ withDescription }: { withDescription: boolean }) {
      return (
        <Sheet open>
          <Sheet.Portal>
            <Sheet.Content data-testid="content">
              {withDescription ? (
                <Sheet.Description data-testid="description">
                  D
                </Sheet.Description>
              ) : null}
            </Sheet.Content>
          </Sheet.Portal>
        </Sheet>
      );
    }

    const { rerender } = render(<Tree withDescription={false} />);
    rerender(<Tree withDescription />);
    expect(fake.setElements).not.toHaveBeenCalled();
    expect(fake.update).toHaveBeenCalledTimes(1);
    expect(fake.update).toHaveBeenCalledWith({
      describedBy: screen.getByTestId("description").id,
    });
  });
  it("destroys the controller exactly once on unmount", () => {
    const { unmount } = render(
      <Sheet open>
        <Panel />
      </Sheet>,
    );
    unmount();
    expect(fake.destroy).toHaveBeenCalledTimes(1);
  });

  it("portals into a container prop and passes it to the controller", () => {
    const container = document.createElement("section");
    document.body.append(container);

    render(
      <Sheet open>
        <Sheet.Portal container={container}>
          <Sheet.Content data-testid="content">x</Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    expect(container.contains(screen.getByTestId("content"))).toBe(true);
    expect(fake.elements?.container).toBe(container);
    container.remove();
  });
});

describe("open state", () => {
  it("reports an uncontrolled self-close and unmounts after the animation", () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet defaultOpen onOpenChange={onOpenChange}>
        <Panel />
      </Sheet>,
    );

    act(() => fake.selfClose());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // the controller closed itself, so the Root must not close it again
    expect(fake.close).not.toHaveBeenCalled();

    act(() => fake.options?.onAnimationEnd?.(false));
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("bounces back open when a controlled parent refuses the close", () => {
    const onOpenChange = vi.fn();
    render(
      <Sheet open onOpenChange={onOpenChange}>
        <Panel />
      </Sheet>,
    );
    expect(fake.open).toHaveBeenCalledTimes(1);

    act(() => fake.selfClose());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // the parent kept `open`, so the controller is put back
    expect(fake.open).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("content")).toBeTruthy();
  });
});

describe("snap index", () => {
  it("snaps on a prop change and stays quiet when the controller led", () => {
    const onSnapIndexChange = vi.fn();
    const { rerender } = render(
      <Sheet open activeSnapIndex={0} onSnapIndexChange={onSnapIndexChange}>
        <Panel />
      </Sheet>,
    );
    expect(fake.snapTo).not.toHaveBeenCalled();

    rerender(
      <Sheet open activeSnapIndex={1} onSnapIndexChange={onSnapIndexChange}>
        <Panel />
      </Sheet>,
    );
    expect(fake.snapTo).toHaveBeenCalledWith(1);

    // controller-led: it already holds the new index, so no snapTo goes back
    act(() => fake.selfSnap(2, 0.5));
    expect(onSnapIndexChange).toHaveBeenCalledWith(2, 0.5);
    expect(fake.snapTo).toHaveBeenCalledTimes(1);
  });

  it("exposes controller state through useSheetState", () => {
    function Readout() {
      const state = useSheetState();
      return <span data-testid="readout">{state.snapIndex}</span>;
    }

    render(
      <Sheet defaultOpen>
        <Sheet.Portal>
          <Sheet.Content data-testid="content">
            <Readout />
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    expect(screen.getByTestId("readout").textContent).toBe("0");
    act(() => fake.selfSnap(2, 0.5));
    expect(screen.getByTestId("readout").textContent).toBe("2");
  });
});

describe("options sync", () => {
  it("stays quiet across the commits that create the controller", () => {
    // The controller is created two commits after mount (Portal, then Content),
    // so a sync effect that is not keyed on content could fire redundantly.
    const { rerender } = render(
      <Sheet open={false} snapPoints={[0.5, 1]}>
        <Panel />
      </Sheet>,
    );
    rerender(
      <Sheet open snapPoints={[0.5, 1]}>
        <Panel />
      </Sheet>,
    );
    expect(createSheetMock).toHaveBeenCalledTimes(1);
    expect(fake.update).not.toHaveBeenCalled();
  });

  it("ignores a new array with equal content and updates on a real change", () => {
    const { rerender } = render(
      <Sheet open snapPoints={[0.5, 1]}>
        <Panel />
      </Sheet>,
    );
    expect(fake.update).not.toHaveBeenCalled();

    rerender(
      <Sheet open snapPoints={[0.5, 1]}>
        <Panel />
      </Sheet>,
    );
    expect(fake.update).not.toHaveBeenCalled();

    rerender(
      <Sheet open snapPoints={[0.25, 1]}>
        <Panel />
      </Sheet>,
    );
    expect(fake.update).toHaveBeenCalledTimes(1);
    expect(fake.update).toHaveBeenCalledWith(
      expect.objectContaining({ snapPoints: [0.25, 1] }),
    );
  });
});

describe("imperative handle", () => {
  it("delegates once mounted and resolves harmlessly before", async () => {
    const handle = createRef<SheetHandle>();
    const { rerender } = render(
      <Sheet ref={handle} open={false}>
        <Panel />
      </Sheet>,
    );

    await expect(handle.current?.snapTo(1)).resolves.toBeUndefined();
    expect(fake.snapTo).not.toHaveBeenCalled();

    rerender(
      <Sheet ref={handle} open>
        <Panel />
      </Sheet>,
    );
    await act(async () => {
      await handle.current?.snapTo(1);
    });
    expect(fake.snapTo).toHaveBeenCalledWith(1, undefined);
    expect(handle.current?.activeSnapIndex).toBe(1);
    expect(handle.current?.y).toBe(0);
  });
});
