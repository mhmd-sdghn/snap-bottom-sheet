import { act, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
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

  it("does not bounce when a controlled parent agrees to close", () => {
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <Sheet open={open} onOpenChange={setOpen}>
          <Panel />
        </Sheet>
      );
    }
    render(<Controlled />);
    expect(fake.open).toHaveBeenCalledTimes(1);

    act(() => fake.selfClose());
    // The veto check runs after the parent's render, so an agreeing parent is
    // never misread as a veto: no second open(), no data-state flap.
    expect(fake.open).toHaveBeenCalledTimes(1);
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
  it("snaps on a prop change", () => {
    const { rerender } = render(
      <Sheet open activeSnapIndex={0}>
        <Panel />
      </Sheet>,
    );
    expect(fake.snapTo).not.toHaveBeenCalled();

    rerender(
      <Sheet open activeSnapIndex={1}>
        <Panel />
      </Sheet>,
    );
    expect(fake.snapTo).toHaveBeenCalledWith(1);
  });

  it("re-asserts the prop when a controlled parent ignores a drag", () => {
    const onSnapIndexChange = vi.fn();
    render(
      <Sheet open activeSnapIndex={0} onSnapIndexChange={onSnapIndexChange}>
        <Panel />
      </Sheet>,
    );

    // The user drags to index 2; the parent keeps activeSnapIndex at 0.
    act(() => fake.selfSnap(2, 0.5));
    expect(onSnapIndexChange).toHaveBeenCalledWith(2, 0.5);
    // Without the post-commit re-assert the controller would sit at 2 and the
    // prop at 0 for the rest of the sheet's life.
    expect(fake.snapTo).toHaveBeenCalledWith(0);
  });

  it("stays quiet when a controlled parent adopts the drag", () => {
    function Controlled() {
      const [index, setIndex] = useState(0);
      return (
        <Sheet open activeSnapIndex={index} onSnapIndexChange={setIndex}>
          <Panel />
        </Sheet>
      );
    }
    render(<Controlled />);

    act(() => fake.selfSnap(2, 0.5));
    expect(fake.snapTo).not.toHaveBeenCalled();
  });

  it("stays quiet when an uncontrolled sheet leads its own snap", () => {
    render(
      <Sheet open defaultSnapIndex={0}>
        <Panel />
      </Sheet>,
    );
    act(() => fake.selfSnap(2, 0.5));
    expect(fake.snapTo).not.toHaveBeenCalled();
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

describe("state after teardown", () => {
  it("reports closed once the controller is gone", () => {
    function Probe() {
      const state = useSheetState();
      return (
        <span data-testid="probe">
          {String(state.open)}/{Math.round(state.y)}
        </span>
      );
    }
    function Tree({ show }: { show: boolean }) {
      return (
        <Sheet open>
          <Probe />
          {show ? (
            <Sheet.Portal>
              <Sheet.Content data-testid="content">x</Sheet.Content>
            </Sheet.Portal>
          ) : null}
        </Sheet>
      );
    }

    const { rerender } = render(<Tree show />);
    act(() => fake.push({ open: true, y: 500 }));
    expect(screen.getByTestId("probe").textContent).toBe("true/500");

    // The portal unmounts, so the controller is destroyed while the probe
    // stays mounted. The cached snapshot must not outlive it.
    rerender(<Tree show={false} />);
    expect(fake.destroy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("probe").textContent).toBe("false/0");
  });
});

describe("aria ids", () => {
  it("registers a consumer id rather than the generated one", () => {
    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content data-testid="content">
            <Sheet.Title id="my-title" data-testid="title">
              T
            </Sheet.Title>
            <Sheet.Description id="my-desc" data-testid="desc">
              D
            </Sheet.Description>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );

    expect(screen.getByTestId("title").id).toBe("my-title");
    expect(fake.options?.labelledBy).toBe("my-title");
    expect(fake.options?.describedBy).toBe("my-desc");
  });

  it("falls back to the generated id", () => {
    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content data-testid="content">
            <Sheet.Title data-testid="title">T</Sheet.Title>
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );
    const generated = screen.getByTestId("title").id;
    expect(generated).not.toBe("");
    expect(fake.options?.labelledBy).toBe(generated);
  });

  it("tracks a consumer id that arrives after the controller", () => {
    function Tree({ id }: { id?: string }) {
      return (
        <Sheet open>
          <Sheet.Portal>
            <Sheet.Content data-testid="content">
              {id ? <Sheet.Title id={id}>T</Sheet.Title> : null}
            </Sheet.Content>
          </Sheet.Portal>
        </Sheet>
      );
    }
    const { rerender } = render(<Tree />);
    rerender(<Tree id="late" />);
    expect(fake.update).toHaveBeenCalledWith({ labelledBy: "late" });
  });
});

describe("useSheetState selector", () => {
  it("re-renders only when the selected value changes", () => {
    let renders = 0;
    function OpenOnly() {
      renders += 1;
      const open = useSheetState((state) => state.open);
      return <span data-testid="open">{String(open)}</span>;
    }

    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content data-testid="content">
            <OpenOnly />
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );
    const before = renders;

    // Twenty animation frames' worth of y changes, no change to `open`.
    act(() => {
      for (let i = 1; i <= 20; i += 1) fake.push({ y: 500 - i * 10 });
    });
    expect(renders).toBe(before);
    expect(screen.getByTestId("open").textContent).toBe("true");

    act(() => fake.push({ open: false }));
    expect(renders).toBe(before + 1);
    expect(screen.getByTestId("open").textContent).toBe("false");
  });

  it("survives a selector that returns a fresh object", () => {
    // React calls getSnapshot repeatedly and demands a stable result; an
    // unmemoised object selector trips its "should be cached" loop.
    function Pair() {
      const { open, dragging } = useSheetState((state) => ({
        open: state.open,
        dragging: state.dragging,
      }));
      return <span data-testid="pair">{`${open}/${dragging}`}</span>;
    }
    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content data-testid="content">
            <Pair />
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );
    expect(screen.getByTestId("pair").textContent).toBe("true/false");
    act(() => fake.push({ dragging: true }));
    expect(screen.getByTestId("pair").textContent).toBe("true/true");
  });

  it("still returns the whole state with no selector", () => {
    function All() {
      const state = useSheetState();
      return <span data-testid="all">{Math.round(state.y)}</span>;
    }
    render(
      <Sheet open>
        <Sheet.Portal>
          <Sheet.Content data-testid="content">
            <All />
          </Sheet.Content>
        </Sheet.Portal>
      </Sheet>,
    );
    act(() => fake.push({ y: 321 }));
    expect(screen.getByTestId("all").textContent).toBe("321");
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

  it("open() mounts the subtree and opens the controller once", async () => {
    const handle = createRef<SheetHandle>();
    render(
      <Sheet ref={handle}>
        <Panel />
      </Sheet>,
    );
    expect(screen.queryByTestId("content")).toBeNull();

    await act(async () => {
      handle.current?.open();
    });

    expect(screen.getByTestId("content")).toBeTruthy();
    expect(fake.open).toHaveBeenCalledTimes(1);
  });

  it("keeps open() pending until the open animation ends", async () => {
    const handle = createRef<SheetHandle>();
    render(
      <Sheet ref={handle}>
        <Panel />
      </Sheet>,
    );

    let done = false;
    await act(async () => {
      handle.current?.open().then(() => {
        done = true;
      });
    });
    expect(done).toBe(false);

    await act(async () => {
      fake.options?.onAnimationEnd?.(true);
    });
    expect(done).toBe(true);
  });

  it("open() while already open resolves without re-opening", async () => {
    const handle = createRef<SheetHandle>();
    render(
      <Sheet ref={handle} open>
        <Panel />
      </Sheet>,
    );
    expect(fake.open).toHaveBeenCalledTimes(1);

    await act(async () => {
      await expect(handle.current?.open()).resolves.toBeUndefined();
    });
    expect(fake.open).toHaveBeenCalledTimes(1);
  });

  it("close() on a controlled sheet only asks the parent", async () => {
    const onOpenChange = vi.fn();
    const handle = createRef<SheetHandle>();
    render(
      <Sheet ref={handle} open onOpenChange={onOpenChange}>
        <Panel />
      </Sheet>,
    );
    expect(fake.open).toHaveBeenCalledTimes(1);

    await act(async () => {
      handle.current?.close();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    // never the controller directly, so there is no veto bounce to undo
    expect(fake.close).not.toHaveBeenCalled();
    expect(fake.open).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("content")).toBeTruthy();
  });

  it("resolves a request the parent refuses instead of hanging", async () => {
    const handle = createRef<SheetHandle>();
    // controlled and pinned open: onOpenChange is ignored, so no close ever runs
    render(
      <Sheet ref={handle} open onOpenChange={() => {}}>
        <Panel />
      </Sheet>,
    );

    let settled = false;
    await act(async () => {
      handle.current?.close().then(() => {
        settled = true;
      });
    });

    // controlled: the parent owns `open` and ignored the request, so there is
    // no animation to await — the call is advisory and resolves at once
    expect(settled).toBe(true);
    expect(fake.close).not.toHaveBeenCalled();
    expect(screen.getByTestId("content")).toBeTruthy();
  });

  it("resolves a pending open() that a close() supersedes", async () => {
    const handle = createRef<SheetHandle>();
    render(
      <Sheet ref={handle}>
        <Panel />
      </Sheet>,
    );

    let openSettled = false;
    await act(async () => {
      handle.current?.open().then(() => {
        openSettled = true;
      });
    });
    expect(openSettled).toBe(false);

    // close before the open animation ever reports back
    await act(async () => {
      handle.current?.close();
    });
    await act(async () => {
      fake.options?.onAnimationEnd?.(false);
    });
    await act(async () => {});

    expect(openSettled).toBe(true);
  });

  it("snapTo() while closed picks the snap the next open() uses", async () => {
    const handle = createRef<SheetHandle>();
    render(
      <Sheet ref={handle} snapPoints={[0.3, 0.6, 1]}>
        <Panel />
      </Sheet>,
    );

    await act(async () => {
      await handle.current?.snapTo(2);
    });
    expect(fake.snapTo).not.toHaveBeenCalled();

    await act(async () => {
      handle.current?.open();
    });
    expect(fake.snapTo).toHaveBeenCalledWith(2);
    expect(handle.current?.activeSnapIndex).toBe(2);
  });
});
