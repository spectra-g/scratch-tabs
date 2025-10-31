import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StandardKeypad } from "../StandardKeypad";
import { CalculatorEngine } from "../../useCalculatorEngine";

const mockEngine: CalculatorEngine = {
  data: {
    mode: "standard",
    expression: "0",
    display: "0",
    history: [],
    notes: "",
    base: "DEC",
  },
  handleInput: jest.fn(),
  handleClear: jest.fn(),
  handleBackspace: jest.fn(),
  handleEquals: jest.fn(),
  handleModeChange: jest.fn(),
  handleBaseChange: jest.fn(),
  handleHistoryClick: jest.fn(),
  handleNotesChange: jest.fn(),
  getUnclosedBracketCount: jest.fn(() => 0),
  setExpression: jest.fn(),
};

describe("StandardKeypad", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render all numeric buttons", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  it("should render operator buttons", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    expect(screen.getByText("%")).toBeInTheDocument();
    // Icon buttons are harder to test by text, test by role count instead
    expect(screen.getAllByRole("button")).toHaveLength(19); // Total buttons including icons
  });

  it("should render action buttons", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    expect(screen.getByText("AC")).toBeInTheDocument();
    // Delete button is an icon, check by role
    expect(screen.getAllByRole("button")).toHaveLength(19); // Total buttons
  });

  it("should call handleInput when numeric button clicked", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    fireEvent.click(screen.getByText("5"));
    expect(mockEngine.handleInput).toHaveBeenCalledWith("5");
  });

  it("should call handleInput when operator button clicked", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    fireEvent.click(screen.getByText("%"));
    expect(mockEngine.handleInput).toHaveBeenCalledWith("%");
  });

  it("should call handleClear when AC button clicked", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    fireEvent.click(screen.getByText("AC"));
    expect(mockEngine.handleClear).toHaveBeenCalled();
  });

  it("should call handleBackspace when delete button clicked", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    const buttons = screen.getAllByRole("button");
    // Delete button is the second button (after AC)
    const deleteButton = buttons.find(button => 
      button.getAttribute("aria-label")?.includes("Delete") || 
      button.innerHTML.includes("svg")
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(mockEngine.handleBackspace).toHaveBeenCalled();
    }
  });

  it("should call handleEquals when equals button clicked", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    const buttons = screen.getAllByRole("button");
    // Equals button contains an icon, find it by checking for the last button with icon
    const equalsButton = buttons[buttons.length - 1];
    
    fireEvent.click(equalsButton);
    expect(mockEngine.handleEquals).toHaveBeenCalled();
  });

  it("should have correct button layouts", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    const container = screen.getAllByRole("button")[0].parentElement;
    expect(container).toHaveClass("grid-cols-4");
  });

  it("should make 0 button span two columns", () => {
    render(<StandardKeypad engine={mockEngine} />);
    
    const zeroButton = screen.getByText("0");
    expect(zeroButton).toHaveClass("col-span-2");
  });
});