import { render, screen } from "@testing-library/react";
import { useRendererStatusStore } from "../../../stores/rendererStatusStore";
import { RendererStatusItems } from "../RendererStatusItems";

describe("RendererStatusItems", () => {
  beforeEach(() => useRendererStatusStore.setState({ contributions: {} }));

  it("selects the contribution belonging to the rendered pane's tab", () => {
    useRendererStatusStore.getState().setContribution("left-canvas", {
      label: "Canvas",
      itemCount: 2,
      selectionCount: 1,
      zoomPercent: 125,
      save: { state: "saved", revision: 3, scopeLabel: "Local only" },
    });
    useRendererStatusStore.getState().setContribution("right-canvas", {
      label: "Canvas",
      itemCount: 7,
      selectionCount: 0,
      zoomPercent: 80,
      save: { state: "error", revision: 4, scopeLabel: "Local only" },
    });

    render(
      <RendererStatusItems tabId="left-canvas" fallbackLabel="Canvas" />,
    );

    expect(screen.getByTestId("canvas-save-status")).toHaveTextContent(
      "Canvas2 items1 selected125%Local onlySaved",
    );
    expect(screen.queryByText("7 items")).not.toBeInTheDocument();
  });

  it("renders a stable fallback before a lazy renderer contributes status", () => {
    render(
      <RendererStatusItems tabId="canvas-loading" fallbackLabel="Canvas" />,
    );
    expect(screen.getByText("Canvas")).toBeInTheDocument();
  });

  it("reports a Canvas revision conflict distinctly from a save failure", () => {
    useRendererStatusStore.getState().setContribution("conflicting-canvas", {
      label: "Canvas",
      save: { state: "conflict", revision: 2, scopeLabel: "Local only" },
    });

    render(
      <RendererStatusItems
        tabId="conflicting-canvas"
        fallbackLabel="Canvas"
      />,
    );

    expect(screen.getByTestId("canvas-save-status")).toHaveTextContent(
      "Save conflict",
    );
  });
});
