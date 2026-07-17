import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DataReconcileTablet } from "../DataReconcileTablet";

jest.mock("../reconcileWorkerClient", () => ({
  createReconcileWorker: () => ({
    onmessage: null as ((event: { data: any }) => void) | null,
    postMessage(this: { onmessage: ((event: { data: any }) => void) | null }) {
      this.onmessage?.({ data: { result: { inBoth: [{ a: { source: "A", rowNumber: 1, text: "same" }, b: { source: "B", rowNumber: 1, text: "same" } }], changed: [], onlyA: [{ source: "A", rowNumber: 2, text: "only-a" }], onlyB: [{ source: "B", rowNumber: 2, text: "only-b" }] } } });
    },
    terminate: jest.fn(),
  }),
}));

const mockTabs = [
  { id: "a", title: "A", content: "same\nonly-a", language: "plaintext", languageLocked: false, workspaceId: "w", dateCreated: 1, lastModified: 1, cursorPosition: { lineNumber: 1, column: 1 } },
  { id: "b", title: "B", content: "same\nonly-b", language: "plaintext", languageLocked: false, workspaceId: "w", dateCreated: 1, lastModified: 1, cursorPosition: { lineNumber: 1, column: 1 } },
];

jest.mock("../../../stores/tabsStore", () => ({ useTabsStore: (selector: any) => selector({ tabs: mockTabs }) }));
jest.mock("../../../stores/rootStore", () => ({ useRootStore: (selector: any) => selector({ handleNewPopulatedTab: jest.fn() }) }));

describe("DataReconcileTablet", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  it("creates CSV-aware initial state and safely restores serialized state", () => {
    expect(DataReconcileTablet.createInitialState({ sourceAId: "a", csvMode: true })).toMatchObject({ type: "datareconcile", data: { sourceAId: "a", options: { mode: "csv" } } });
    expect(DataReconcileTablet.deserializeState("invalid")).toMatchObject({ type: "datareconcile" });
  });

  it("uses the worker result, applies the custom scrollbar, and confirms copy for two seconds", async () => {
    jest.useFakeTimers();
    const state = DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" });
    render(<>{DataReconcileTablet.render(state, jest.fn())}</>);

    expect(await screen.findByText("In both")).toBeInTheDocument();
    expect(screen.getByTestId("data-reconcile-tablet")).toHaveClass("custom-scrollbar");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy" })); });
    expect(screen.getByRole("button", { name: "Copied" })).toHaveClass("text-success");
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    jest.useRealTimers();
  });
});
