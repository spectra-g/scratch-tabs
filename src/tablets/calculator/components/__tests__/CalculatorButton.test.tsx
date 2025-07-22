import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CalculatorButton } from "../CalculatorButton";

describe("CalculatorButton", () => {
  const mockOnClick = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render with string value", () => {
    render(<CalculatorButton value="5" onClick={mockOnClick} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should render with React node value", () => {
    const icon = <div data-testid="test-icon">Icon</div>;
    render(<CalculatorButton value={icon} onClick={mockOnClick} />);
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    render(<CalculatorButton value="5" onClick={mockOnClick} />);
    fireEvent.click(screen.getByText("5"));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("should apply default variant styles", () => {
    render(<CalculatorButton value="5" onClick={mockOnClick} />);
    const button = screen.getByText("5");
    expect(button).toHaveClass("bg-gray-700/50");
  });

  it("should apply operator variant styles", () => {
    render(<CalculatorButton value="+" onClick={mockOnClick} variant="operator" />);
    const button = screen.getByText("+");
    expect(button).toHaveClass("bg-blue-500/20");
  });

  it("should apply action variant styles", () => {
    render(<CalculatorButton value="AC" onClick={mockOnClick} variant="action" />);
    const button = screen.getByText("AC");
    expect(button).toHaveClass("bg-gray-600/60");
  });

  it("should apply equals variant styles", () => {
    render(<CalculatorButton value="=" onClick={mockOnClick} variant="equals" />);
    const button = screen.getByText("=");
    expect(button).toHaveClass("bg-green-500/30");
  });

  it("should apply mode variant styles when active", () => {
    render(<CalculatorButton value="STD" onClick={mockOnClick} variant="mode" isActive={true} />);
    const button = screen.getByText("STD");
    expect(button).toHaveClass("bg-blue-500/20");
  });

  it("should apply mode variant styles when inactive", () => {
    render(<CalculatorButton value="STD" onClick={mockOnClick} variant="mode" isActive={false} />);
    const button = screen.getByText("STD");
    expect(button).toHaveClass("bg-gray-800/50");
  });

  it("should apply custom className", () => {
    render(<CalculatorButton value="5" onClick={mockOnClick} className="custom-class" />);
    const button = screen.getByText("5");
    expect(button).toHaveClass("custom-class");
  });

  it("should set aria-label from ariaLabel prop", () => {
    render(<CalculatorButton value="5" onClick={mockOnClick} ariaLabel="Number Five" />);
    const button = screen.getByText("5");
    expect(button).toHaveAttribute("aria-label", "Number Five");
  });

  it("should set aria-label from string value when no ariaLabel provided", () => {
    render(<CalculatorButton value="5" onClick={mockOnClick} />);
    const button = screen.getByText("5");
    expect(button).toHaveAttribute("aria-label", "5");
  });

  it("should not set aria-label for React node value when no ariaLabel provided", () => {
    const icon = <div>Icon</div>;
    render(<CalculatorButton value={icon} onClick={mockOnClick} />);
    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("aria-label");
  });
});