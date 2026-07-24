import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { DataReconcileTablet } from "../DataReconcileTablet";

const mockHandleNewPopulatedTab = jest.fn().mockResolvedValue("new-tab");

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
jest.mock("../../../stores/rootStore", () => ({ useRootStore: (selector: any) => selector({ handleNewPopulatedTab: mockHandleNewPopulatedTab }) }));

describe("DataReconcileTablet", () => {
  beforeEach(() => {
    mockHandleNewPopulatedTab.mockClear();
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
    });
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
  });

  it("creates CSV-aware initial state and safely restores serialized state", () => {
    expect(DataReconcileTablet.createInitialState({ sourceAId: "a", csvMode: true })).toMatchObject({ type: "datareconcile", data: { sourceAId: "a", options: { mode: "csv" }, selectedResult: "aInB" } });
    expect(DataReconcileTablet.deserializeState("invalid")).toMatchObject({ type: "datareconcile" });
    expect(DataReconcileTablet.deserializeState(JSON.stringify({
      type: "datareconcile",
      data: { ...DataReconcileTablet.createInitialState().data, selectedResult: "onlyB" },
    }))).toMatchObject({ data: { selectedResult: "bNotInA" } });
  });

  it("shows explicit directional result sets and confirms copy for two seconds", async () => {
    jest.useFakeTimers();
    const state = DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" });
    render(<>{DataReconcileTablet.render(state, jest.fn())}</>);

    expect(await screen.findByText("Lines from A also in B")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lines from A not in B/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lines from B also in A/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lines from B not in A/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cleaned copy/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("data-reconcile-tablet")).toHaveClass("custom-scrollbar");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copy selected lines" })); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("same");
    expect(screen.getByRole("button", { name: "Copied" })).toHaveClass("text-success");
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByRole("button", { name: "Copy selected lines" })).toBeInTheDocument();
    jest.useRealTimers();
  });

  it.each([
    ["aInB", "same", "A - lines also in B"],
    ["aNotInB", "only-a", "A - lines not in B"],
    ["bInA", "same", "B - lines also in A"],
    ["bNotInA", "only-b", "B - lines not in A"],
  ] as const)("extracts the %s source lines into a clearly named new tab", async (selectedResult, content, title) => {
    const state = DataReconcileTablet.createInitialState({ sourceAId: "a", sourceBId: "b" });
    state.data = { ...state.data, selectedResult };
    render(<>{DataReconcileTablet.render(state, jest.fn())}</>);

    fireEvent.click(await screen.findByRole("button", { name: "Open selected lines in new tab" }));

    expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(expect.objectContaining({
      title,
      content,
      language: "plaintext",
    }));
  });
});
