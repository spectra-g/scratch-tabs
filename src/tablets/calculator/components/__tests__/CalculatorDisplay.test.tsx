import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CalculatorDisplay } from "../CalculatorDisplay";

describe("CalculatorDisplay", () => {
  it("should render expression and display", () => {
    render(<CalculatorDisplay expression="2+3" display="5" />);
    
    expect(screen.getByText("2+3")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should display default value when display is empty", () => {
    render(<CalculatorDisplay expression="" display="" />);
    
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should apply correct font size for short display", () => {
    render(<CalculatorDisplay expression="2+3" display="5" />);
    
    const displayElement = screen.getByText("5");
    expect(displayElement).toHaveClass("text-3xl");
  });

  it("should apply correct font size for medium display", () => {
    const longDisplay = "12345678901234567"; // 17 characters, should be text-2xl
    render(<CalculatorDisplay expression="complex" display={longDisplay} />);
    
    const displayElement = screen.getByText(longDisplay);
    expect(displayElement).toHaveClass("text-2xl");
  });

  it("should apply correct font size for long display", () => {
    const veryLongDisplay = "12345678901234567890123456789";
    render(<CalculatorDisplay expression="very complex" display={veryLongDisplay} />);
    
    const displayElement = screen.getByText(veryLongDisplay);
    expect(displayElement).toHaveClass("text-xl");
  });

  it("should have proper accessibility attributes", () => {
    render(<CalculatorDisplay expression="2+3" display="5" />);
    
    const expressionElement = screen.getByText("2+3");
    expect(expressionElement).toHaveAttribute("aria-live", "polite");
    
    const displayElement = screen.getByText("5");
    expect(displayElement).toHaveAttribute("title", "5");
  });

  it("should handle null display gracefully", () => {
    render(<CalculatorDisplay expression="2+3" display={null as any} />);
    
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should truncate long expressions", () => {
    const longExpression = "1+2+3+4+5+6+7+8+9+10+11+12+13+14+15";
    render(<CalculatorDisplay expression={longExpression} display="105" />);
    
    const expressionElement = screen.getByText(longExpression);
    expect(expressionElement).toHaveClass("truncate");
  });
});