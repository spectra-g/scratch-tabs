import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, jest } from "@jest/globals";
import { OperationParamField } from "../OperationParamField";
import { ParameterDefinition } from "../../../services/pipeline/types";

const field = (overrides: Partial<ParameterDefinition> = {}): ParameterDefinition => ({
  name: "value",
  label: "Value",
  type: "string",
  ...overrides,
});

describe("OperationParamField", () => {
  describe("label", () => {
    it("renders the param label", () => {
      render(<OperationParamField param={field({ label: "My Label" })} value="" onChange={jest.fn()} />);
      expect(screen.getByText("My Label")).toBeInTheDocument();
    });

    it("shows required indicator for required params", () => {
      render(<OperationParamField param={field({ required: true })} value="" onChange={jest.fn()} />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("does not show required indicator for optional params", () => {
      render(<OperationParamField param={field()} value="" onChange={jest.fn()} />);
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });
  });

  describe("string type", () => {
    it("renders a text input", () => {
      render(<OperationParamField param={field()} value="hello" onChange={jest.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("hello");
    });

    it("calls onChange with new string value", () => {
      const onChange = jest.fn();
      render(<OperationParamField param={field()} value="" onChange={onChange} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "world" } });
      expect(onChange).toHaveBeenCalledWith("world");
    });

    it("uses declared default when value is undefined", () => {
      render(<OperationParamField param={field({ default: "default-val" })} value={undefined} onChange={jest.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("default-val");
    });

    it("renders placeholder text", () => {
      render(<OperationParamField param={field({ placeholder: "Enter text…" })} value="" onChange={jest.fn()} />);
      expect(screen.getByPlaceholderText("Enter text…")).toBeInTheDocument();
    });
  });

  describe("number type", () => {
    it("renders a number input", () => {
      render(<OperationParamField param={field({ type: "number" })} value={42} onChange={jest.fn()} />);
      expect(screen.getByRole("spinbutton")).toHaveValue(42);
    });

    it("calls onChange with a number", () => {
      const onChange = jest.fn();
      render(<OperationParamField param={field({ type: "number" })} value={0} onChange={onChange} />);
      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "7" } });
      expect(onChange).toHaveBeenCalledWith(7);
    });

    it("respects min and max attributes", () => {
      render(
        <OperationParamField param={field({ type: "number", min: 1, max: 100 })} value={50} onChange={jest.fn()} />,
      );
      const input = screen.getByRole("spinbutton");
      expect(input).toHaveAttribute("min", "1");
      expect(input).toHaveAttribute("max", "100");
    });
  });

  describe("boolean type", () => {
    it("renders a checkbox", () => {
      render(<OperationParamField param={field({ type: "boolean" })} value={false} onChange={jest.fn()} />);
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("renders checked when value is true", () => {
      render(<OperationParamField param={field({ type: "boolean" })} value={true} onChange={jest.fn()} />);
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("calls onChange with boolean", () => {
      const onChange = jest.fn();
      render(<OperationParamField param={field({ type: "boolean" })} value={false} onChange={onChange} />);
      fireEvent.click(screen.getByRole("checkbox"));
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("shows description as checkbox label text", () => {
      render(
        <OperationParamField
          param={field({ type: "boolean", description: "Enable feature" })}
          value={false}
          onChange={jest.fn()}
        />,
      );
      expect(screen.getByText("Enable feature")).toBeInTheDocument();
    });
  });

  describe("select type", () => {
    const selectParam = field({
      type: "select",
      options: [
        { value: "a", label: "Option A" },
        { value: "b", label: "Option B" },
      ],
    });

    it("renders a select with options", () => {
      render(<OperationParamField param={selectParam} value="a" onChange={jest.fn()} />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("Option A")).toBeInTheDocument();
      expect(screen.getByText("Option B")).toBeInTheDocument();
    });

    it("calls onChange with selected value", () => {
      const onChange = jest.fn();
      render(<OperationParamField param={selectParam} value="a" onChange={onChange} />);
      fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
      expect(onChange).toHaveBeenCalledWith("b");
    });
  });

  describe("textarea type", () => {
    it("renders a textarea", () => {
      render(<OperationParamField param={field({ type: "textarea" })} value="some text" onChange={jest.fn()} />);
      expect(screen.getByRole("textbox")).toHaveValue("some text");
    });

    it("calls onChange with new text", () => {
      const onChange = jest.fn();
      render(<OperationParamField param={field({ type: "textarea" })} value="" onChange={onChange} />);
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "multi\nline" } });
      expect(onChange).toHaveBeenCalledWith("multi\nline");
    });
  });

  describe("description", () => {
    it("shows description below non-boolean fields", () => {
      render(
        <OperationParamField
          param={field({ description: "Help text here" })}
          value=""
          onChange={jest.fn()}
        />,
      );
      expect(screen.getByText("Help text here")).toBeInTheDocument();
    });

    it("does not show description below boolean fields (shown inline instead)", () => {
      const { container } = render(
        <OperationParamField
          param={field({ type: "boolean", description: "Toggle this" })}
          value={false}
          onChange={jest.fn()}
        />,
      );
      const paragraphs = container.querySelectorAll("p");
      expect(paragraphs).toHaveLength(0);
    });
  });
});
