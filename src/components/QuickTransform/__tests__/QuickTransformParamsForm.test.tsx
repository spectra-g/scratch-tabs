import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, jest } from "@jest/globals";
import { QuickTransformParamsForm } from "../QuickTransformParamsForm";
import { QuickTransformItem } from "../../../services/quickTransform/types";
import { OperationDefinition } from "../../../services/pipeline/types";

const makeOperation = (overrides: Partial<OperationDefinition> = {}): OperationDefinition => ({
  id: "text.suffix",
  name: "Add Suffix",
  description: "Appends a suffix",
  categories: ["text"],
  parameters: [
    { name: "suffix", label: "Suffix", type: "string", default: "" },
  ],
  execute: (input, params) => `${input}${params.suffix}`,
  ...overrides,
});

const baseItem: QuickTransformItem = {
  type: "operation",
  id: "text.suffix",
  name: "Add Suffix",
  description: "Appends a suffix",
};

const defaultProps = {
  item: baseItem,
  operation: makeOperation(),
  params: { suffix: "" },
  onParamsChange: jest.fn(),
  applyPerLine: false,
  onApplyPerLineChange: jest.fn(),
  onExecute: jest.fn(),
  onBack: jest.fn(),
  isExecuting: false,
  error: null,
};

beforeEach(() => jest.clearAllMocks());

describe("QuickTransformParamsForm", () => {
  describe("header", () => {
    it("renders the operation name", () => {
      render(<QuickTransformParamsForm {...defaultProps} />);
      expect(screen.getByText("Add Suffix")).toBeInTheDocument();
    });

    it("shows Pipeline badge for pipeline items", () => {
      const pipelineItem: QuickTransformItem = {
        type: "pipeline",
        id: "p1",
        name: "My Pipeline",
        description: "",
      };
      render(<QuickTransformParamsForm {...defaultProps} item={pipelineItem} />);
      expect(screen.getByText("Pipeline")).toBeInTheDocument();
    });

    it("does not show Pipeline badge for operation items", () => {
      render(<QuickTransformParamsForm {...defaultProps} />);
      expect(screen.queryByText("Pipeline")).not.toBeInTheDocument();
    });

    it("calls onBack when back button is clicked", () => {
      render(<QuickTransformParamsForm {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Back to search"));
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("parameter fields", () => {
    it("renders a field for each parameter", () => {
      const op = makeOperation({
        parameters: [
          { name: "a", label: "Field A", type: "string" },
          { name: "b", label: "Field B", type: "number", default: 0 },
        ],
      });
      render(
        <QuickTransformParamsForm
          {...defaultProps}
          operation={op}
          params={{ a: "", b: 0 }}
        />,
      );
      expect(screen.getByText("Field A")).toBeInTheDocument();
      expect(screen.getByText("Field B")).toBeInTheDocument();
    });

    it("calls onParamsChange when a field changes", () => {
      render(<QuickTransformParamsForm {...defaultProps} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "!!!" } });
      expect(defaultProps.onParamsChange).toHaveBeenCalledWith({ suffix: "!!!" });
    });
  });

  describe("Apply to every line toggle", () => {
    it("shows checkbox for configurable operations", () => {
      const op = makeOperation({ processingMode: "configurable" });
      render(<QuickTransformParamsForm {...defaultProps} operation={op} />);
      expect(screen.getByTestId("apply-per-line-toggle")).toBeInTheDocument();
      expect(screen.getByText("Apply to every line")).toBeInTheDocument();
    });

    it("does not show checkbox for entire-mode operations", () => {
      const op = makeOperation({ processingMode: "entire" });
      render(<QuickTransformParamsForm {...defaultProps} operation={op} />);
      expect(screen.queryByTestId("apply-per-line-toggle")).not.toBeInTheDocument();
    });

    it("does not show checkbox for line-mode operations (always per-line)", () => {
      const op = makeOperation({ processingMode: "line" });
      render(<QuickTransformParamsForm {...defaultProps} operation={op} />);
      expect(screen.queryByTestId("apply-per-line-toggle")).not.toBeInTheDocument();
    });

    it("does not show checkbox when processingMode is undefined", () => {
      const op = makeOperation({ processingMode: undefined });
      render(<QuickTransformParamsForm {...defaultProps} operation={op} />);
      expect(screen.queryByTestId("apply-per-line-toggle")).not.toBeInTheDocument();
    });

    it("renders checkbox as unchecked when applyPerLine is false", () => {
      const op = makeOperation({ processingMode: "configurable" });
      render(
        <QuickTransformParamsForm {...defaultProps} operation={op} applyPerLine={false} />,
      );
      const checkbox = screen.getByRole("checkbox", { name: /apply to every line/i });
      expect(checkbox).not.toBeChecked();
    });

    it("renders checkbox as checked when applyPerLine is true", () => {
      const op = makeOperation({ processingMode: "configurable" });
      render(
        <QuickTransformParamsForm {...defaultProps} operation={op} applyPerLine={true} />,
      );
      const checkbox = screen.getByRole("checkbox", { name: /apply to every line/i });
      expect(checkbox).toBeChecked();
    });

    it("calls onApplyPerLineChange with true when checkbox is checked", () => {
      const op = makeOperation({ processingMode: "configurable" });
      render(
        <QuickTransformParamsForm {...defaultProps} operation={op} applyPerLine={false} />,
      );
      fireEvent.click(screen.getByRole("checkbox", { name: /apply to every line/i }));
      expect(defaultProps.onApplyPerLineChange).toHaveBeenCalledWith(true);
    });

    it("calls onApplyPerLineChange with false when checkbox is unchecked", () => {
      const op = makeOperation({ processingMode: "configurable" });
      render(
        <QuickTransformParamsForm {...defaultProps} operation={op} applyPerLine={true} />,
      );
      fireEvent.click(screen.getByRole("checkbox", { name: /apply to every line/i }));
      expect(defaultProps.onApplyPerLineChange).toHaveBeenCalledWith(false);
    });
  });

  describe("keyboard handling", () => {
    it("calls onExecute on Enter in a text input", () => {
      render(<QuickTransformParamsForm {...defaultProps} />);
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(defaultProps.onExecute).toHaveBeenCalledTimes(1);
    });

    it("calls onBack on Escape", () => {
      render(<QuickTransformParamsForm {...defaultProps} />);
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it("does not call onExecute on Enter in a textarea", () => {
      const op = makeOperation({
        parameters: [{ name: "text", label: "Text", type: "textarea" }],
      });
      render(
        <QuickTransformParamsForm
          {...defaultProps}
          operation={op}
          params={{ text: "" }}
        />,
      );
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
      expect(defaultProps.onExecute).not.toHaveBeenCalled();
    });

    it("does not call onExecute when Enter is pressed on the Back button", () => {
      render(<QuickTransformParamsForm {...defaultProps} />);
      fireEvent.keyDown(screen.getByLabelText("Back to search"), { key: "Enter" });
      expect(defaultProps.onExecute).not.toHaveBeenCalled();
    });
  });

  describe("focus on mount", () => {
    it("focuses the checkbox when operation has no parameters but is configurable", () => {
      const op = makeOperation({ parameters: [], processingMode: "configurable" });
      render(<QuickTransformParamsForm {...defaultProps} operation={op} params={{}} />);
      const checkbox = screen.getByRole("checkbox", { name: /apply to every line/i });
      expect(document.activeElement).toBe(checkbox);
    });
  });

  describe("error display", () => {
    it("shows error message when error is provided", () => {
      render(<QuickTransformParamsForm {...defaultProps} error="Required: Suffix" />);
      expect(screen.getByText("Required: Suffix")).toBeInTheDocument();
    });

    it("shows footer hint when no error", () => {
      render(<QuickTransformParamsForm {...defaultProps} error={null} />);
      expect(screen.getByText("Esc to go back")).toBeInTheDocument();
    });
  });
});
