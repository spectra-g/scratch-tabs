import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { QuickTransformModal } from "../QuickTransformModal";
import { QuickTransformTextContext } from "../../../stores/quickTransformStore";
import { QuickTransformItem } from "../../../services/quickTransform/types";
import { OperationDefinition } from "../../../services/pipeline/types";

jest.mock("../../../db", () => ({
  db: { pipelines: { toArray: jest.fn(() => Promise.resolve([])) } },
  getSetting: jest.fn(() => Promise.resolve(undefined)),
  setSetting: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../../services/quickTransform/quickTransformSearch", () => ({
  searchItems: jest.fn(() => []),
  filterByRecents: jest.fn(() => []),
}));

jest.mock("../../../services/quickTransform/quickTransformRecents", () => ({
  getRecentItems: jest.fn(() => Promise.resolve([])),
  addRecentItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../../services/quickTransform/quickTransformExecutor", () => ({
  executeQuickTransformItem: jest.fn(),
  buildInitialParams: jest.fn(() => ({})),
  validateParams: jest.fn(() => null),
}));

jest.mock("../../../services/pipeline/OperationRegistry", () => ({
  operationRegistry: {
    getById: jest.fn(),
  },
}));

import { searchItems, filterByRecents } from "../../../services/quickTransform/quickTransformSearch";
import { getRecentItems, addRecentItem } from "../../../services/quickTransform/quickTransformRecents";
import { executeQuickTransformItem, buildInitialParams, validateParams } from "../../../services/quickTransform/quickTransformExecutor";
import { operationRegistry } from "../../../services/pipeline/OperationRegistry";

const mockSearchItems = searchItems as jest.MockedFunction<typeof searchItems>;
const mockFilterByRecents = filterByRecents as jest.MockedFunction<typeof filterByRecents>;
const mockGetRecentItems = getRecentItems as jest.MockedFunction<typeof getRecentItems>;
const mockAddRecentItem = addRecentItem as jest.MockedFunction<typeof addRecentItem>;
const mockExecute = executeQuickTransformItem as jest.MockedFunction<typeof executeQuickTransformItem>;
const mockBuildInitialParams = buildInitialParams as jest.MockedFunction<typeof buildInitialParams>;
const mockValidateParams = validateParams as jest.MockedFunction<typeof validateParams>;
const mockGetById = operationRegistry.getById as jest.MockedFunction<typeof operationRegistry.getById>;

const defaultContext: QuickTransformTextContext = {
  text: "hello world",
  isSelection: false,
  selectionRange: null,
  activeTabId: "tab-1",
};

const defaultProps = {
  position: { x: 100, y: 100 },
  textContext: defaultContext,
  onApply: jest.fn(),
  onClose: jest.fn(),
};

const paramFreeItem: QuickTransformItem = {
  type: "operation",
  id: "text.trim",
  name: "Trim Whitespace",
  description: "Removes extra spaces",
};

const paramItem: QuickTransformItem = {
  type: "operation",
  id: "text.suffix",
  name: "Add Suffix",
  description: "Appends suffix",
};

const paramOperation: OperationDefinition = {
  id: "text.suffix",
  name: "Add Suffix",
  description: "Appends suffix",
  categories: ["text"],
  parameters: [{ name: "suffix", label: "Suffix", type: "string", default: "" }],
  execute: jest.fn() as any,
};

const configurableOperation: OperationDefinition = {
  id: "text.suffix",
  name: "Add Suffix",
  description: "Appends suffix",
  categories: ["text"],
  processingMode: "configurable",
  parameters: [{ name: "suffix", label: "Suffix", type: "string", default: "" }],
  execute: jest.fn() as any,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetRecentItems.mockResolvedValue([]);
  mockSearchItems.mockReturnValue([]);
  mockFilterByRecents.mockReturnValue([]);
  mockAddRecentItem.mockResolvedValue(undefined);
  mockExecute.mockResolvedValue({ success: true, output: "RESULT" });
  mockBuildInitialParams.mockReturnValue({ suffix: "" });
  mockValidateParams.mockReturnValue(null);
  mockGetById.mockReturnValue(undefined);
  (defaultProps.onApply as jest.Mock).mockReset();
  (defaultProps.onClose as jest.Mock).mockReset();
});

async function renderAndLoad(props = defaultProps) {
  let rendered: ReturnType<typeof render>;
  await act(async () => {
    rendered = render(<QuickTransformModal {...props} />);
  });
  return rendered!;
}

describe("QuickTransformModal — search phase", () => {
  describe("rendering", () => {
    it("renders the search input", async () => {
      await renderAndLoad();
      expect(screen.getByTestId("quick-transform-search")).toBeInTheDocument();
    });

    it("shows 'No recent transforms' when no recents and no query", async () => {
      mockFilterByRecents.mockReturnValue([]);
      await renderAndLoad();
      expect(screen.getByText("No recent transforms")).toBeInTheDocument();
    });

    it("shows 'No results' when query yields no matches", async () => {
      mockSearchItems.mockReturnValue([]);
      await renderAndLoad();
      await act(async () => {
        fireEvent.change(screen.getByTestId("quick-transform-search"), {
          target: { value: "zzz" },
        });
      });
      expect(screen.getByText("No results")).toBeInTheDocument();
    });

    it("renders result items", async () => {
      mockFilterByRecents.mockReturnValue([paramFreeItem]);
      await renderAndLoad();
      expect(screen.getByText("Trim Whitespace")).toBeInTheDocument();
    });

    it("shows Selection label when isSelection is true", async () => {
      const props = {
        ...defaultProps,
        textContext: { ...defaultContext, isSelection: true },
      };
      await renderAndLoad(props);
      expect(screen.getByText("Selection")).toBeInTheDocument();
    });

    it("shows Full content label when not a selection", async () => {
      await renderAndLoad();
      expect(screen.getByText("Full content")).toBeInTheDocument();
    });
  });

  describe("keyboard navigation", () => {
    it("closes on Escape", async () => {
      await renderAndLoad();
      fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "Escape" });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("navigates down with ArrowDown", async () => {
      mockFilterByRecents.mockReturnValue([paramFreeItem, paramItem]);
      await renderAndLoad();
      const input = screen.getByTestId("quick-transform-search");

      const items = screen.getAllByRole("option");
      expect(items[0]).toHaveAttribute("aria-selected", "true");

      fireEvent.keyDown(input, { key: "ArrowDown" });

      const after = screen.getAllByRole("option");
      expect(after[0]).toHaveAttribute("aria-selected", "false");
      expect(after[1]).toHaveAttribute("aria-selected", "true");
    });

    it("wraps around on ArrowUp from first item", async () => {
      mockFilterByRecents.mockReturnValue([paramFreeItem, paramItem]);
      await renderAndLoad();
      fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "ArrowUp" });
      const items = screen.getAllByRole("option");
      expect(items[items.length - 1]).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("execution — param-free operation", () => {
    it("executes immediately without showing params form", async () => {
      mockFilterByRecents.mockReturnValue([paramFreeItem]);
      mockGetById.mockReturnValue({
        ...paramFreeItem,
        categories: ["text"],
        parameters: [],
        execute: jest.fn() as any,
      });

      await renderAndLoad();
      await act(async () => {
        fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "Enter" });
      });

      expect(mockExecute).toHaveBeenCalled();
      expect(defaultProps.onApply).toHaveBeenCalledWith("RESULT", null);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("records executed item as recent", async () => {
      mockFilterByRecents.mockReturnValue([paramFreeItem]);
      mockGetById.mockReturnValue({
        ...paramFreeItem,
        categories: ["text"],
        parameters: [],
        execute: jest.fn() as any,
      });

      await renderAndLoad();
      await act(async () => {
        fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "Enter" });
      });

      expect(mockAddRecentItem).toHaveBeenCalledWith({ type: "operation", id: "text.trim" });
    });

    it("shows error message on failed execution", async () => {
      mockFilterByRecents.mockReturnValue([paramFreeItem]);
      mockGetById.mockReturnValue({
        ...paramFreeItem,
        categories: ["text"],
        parameters: [],
        execute: jest.fn() as any,
      });
      mockExecute.mockResolvedValue({ success: false, output: "", error: "It blew up" });

      await renderAndLoad();
      await act(async () => {
        fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "Enter" });
      });

      expect(screen.getByText("It blew up")).toBeInTheDocument();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe("params phase transition", () => {
    it("shows params form when operation has parameters", async () => {
      mockFilterByRecents.mockReturnValue([paramItem]);
      mockGetById.mockReturnValue(paramOperation);

      await renderAndLoad();
      await act(async () => {
        fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "Enter" });
      });

      expect(screen.getByTestId("quick-transform-params-form")).toBeInTheDocument();
      expect(screen.queryByTestId("quick-transform-search")).not.toBeInTheDocument();
    });

    it("executes pipelines immediately without params form", async () => {
      const pipelineItem: QuickTransformItem = {
        type: "pipeline",
        id: "p1",
        name: "My Pipe",
        description: "",
      };
      mockFilterByRecents.mockReturnValue([pipelineItem]);
      mockGetById.mockReturnValue(undefined);

      await renderAndLoad();
      await act(async () => {
        fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "Enter" });
      });

      expect(mockExecute).toHaveBeenCalled();
      expect(screen.queryByTestId("quick-transform-params-form")).not.toBeInTheDocument();
    });
  });

  describe("click outside", () => {
    it("calls onClose when clicking outside", async () => {
      await renderAndLoad();
      await act(async () => {
        fireEvent.mouseDown(document.body);
      });
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("does not call onClose when clicking inside", async () => {
      await renderAndLoad();
      await act(async () => {
        fireEvent.mouseDown(screen.getByTestId("quick-transform-search"));
      });
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it("does not close when click target was removed from DOM by a phase transition", async () => {
      // Simulates clicking a result that transitions to params phase:
      // the result item is removed from DOM before the document mousedown listener fires
      mockFilterByRecents.mockReturnValue([paramItem]);
      mockGetById.mockReturnValue(paramOperation);

      await renderAndLoad();

      // The result item exists in the DOM before the click
      const resultItem = screen.getByText("Add Suffix").closest("[role='option']")!;
      expect(document.contains(resultItem)).toBe(true);

      await act(async () => {
        // Clicking the result transitions to params phase, removing resultItem from DOM
        fireEvent.mouseDown(resultItem);
      });

      // Even though resultItem is now detached, the modal should not close
      expect(defaultProps.onClose).not.toHaveBeenCalled();
      expect(screen.getByTestId("quick-transform-params-form")).toBeInTheDocument();
    });
  });
});

describe("QuickTransformModal — params phase", () => {
  async function openParamsPhase() {
    mockFilterByRecents.mockReturnValue([paramItem]);
    mockGetById.mockReturnValue(paramOperation);
    mockBuildInitialParams.mockReturnValue({ suffix: "" });

    const rendered = await renderAndLoad();
    await act(async () => {
      fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "Enter" });
    });
    return rendered;
  }

  it("shows the params form", async () => {
    await openParamsPhase();
    expect(screen.getByTestId("quick-transform-params-form")).toBeInTheDocument();
  });

  it("goes back to search on Escape", async () => {
    await openParamsPhase();
    const form = screen.getByTestId("quick-transform-params-form");
    fireEvent.keyDown(form, { key: "Escape" });
    expect(screen.getByTestId("quick-transform-search")).toBeInTheDocument();
  });

  it("executes with form params on Enter", async () => {
    await openParamsPhase();
    // Fire on the actual input so e.target.tagName is naturally "INPUT"
    await act(async () => {
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    });

    expect(mockExecute).toHaveBeenCalledWith(
      paramItem,
      "hello world",
      expect.any(Array),
      expect.objectContaining({ suffix: "" }),
      false,
    );
  });

  it("shows validation error when validateParams returns a message", async () => {
    mockValidateParams.mockReturnValue('"Suffix" is required');
    await openParamsPhase();

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    });

    expect(screen.getByText('"Suffix" is required')).toBeInTheDocument();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("applies result and closes after successful execution", async () => {
    await openParamsPhase();

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    });

    expect(defaultProps.onApply).toHaveBeenCalledWith("RESULT", null);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  describe("applyPerLine toggle", () => {
    async function openConfigurableParamsPhase() {
      mockFilterByRecents.mockReturnValue([paramItem]);
      mockGetById.mockReturnValue(configurableOperation);
      mockBuildInitialParams.mockReturnValue({ suffix: "" });

      await renderAndLoad();
      await act(async () => {
        fireEvent.keyDown(screen.getByTestId("quick-transform-search"), { key: "Enter" });
      });
    }

    it("shows apply-per-line checkbox for configurable operations", async () => {
      await openConfigurableParamsPhase();
      expect(screen.getByTestId("apply-per-line-toggle")).toBeInTheDocument();
    });

    it("does not show apply-per-line checkbox for non-configurable operations", async () => {
      await openParamsPhase();
      expect(screen.queryByTestId("apply-per-line-toggle")).not.toBeInTheDocument();
    });

    it("passes applyPerLine=false to executeItem by default", async () => {
      await openConfigurableParamsPhase();

      await act(async () => {
        fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      });

      expect(mockExecute).toHaveBeenCalledWith(
        paramItem,
        "hello world",
        expect.any(Array),
        expect.any(Object),
        false,
      );
    });

    it("passes applyPerLine=true after checkbox is toggled on", async () => {
      await openConfigurableParamsPhase();

      await act(async () => {
        fireEvent.click(screen.getByRole("checkbox", { name: /apply to every line/i }));
      });

      await act(async () => {
        fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      });

      expect(mockExecute).toHaveBeenCalledWith(
        paramItem,
        "hello world",
        expect.any(Array),
        expect.any(Object),
        true,
      );
    });
  });
});
