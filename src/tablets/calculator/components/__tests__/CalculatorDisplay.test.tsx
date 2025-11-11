import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CalculatorDisplay } from "../CalculatorDisplay";
import { CalculatorMode } from "../../useCalculatorEngine";

describe("CalculatorDisplay", () => {
  it("should render simple humanized expression in standard mode", () => {
    render(<CalculatorDisplay expression="2+3" display="5" mode="standard" />);

    // Should show simple humanized expression with operators as symbols
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should render simple humanized expression in scientific mode", () => {
    render(<CalculatorDisplay expression="1000*2000" display="2000000" mode="scientific" />);

    // Should show magnitude-based humanization
    const expressionElement = screen.getByText(/thousand/i);
    expect(expressionElement).toBeInTheDocument();
    expect(screen.getByText("2000000")).toBeInTheDocument();
  });

  it("should NOT humanize expression in programmer mode", () => {
    render(<CalculatorDisplay expression="0xFF+0x01" display="256" mode="programmer" />);

    // Should show raw expression
    expect(screen.getByText("0xFF+0x01")).toBeInTheDocument();
    expect(screen.getByText("256")).toBeInTheDocument();
  });

  it("should display default value when display is empty", () => {
    render(<CalculatorDisplay expression="" display="" mode="standard" />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should apply correct font size for short display", () => {
    render(<CalculatorDisplay expression="2+3" display="5" mode="standard" />);

    const displayElement = screen.getByText("5");
    expect(displayElement).toHaveClass("text-3xl");
  });

  it("should apply correct font size for medium display", () => {
    const longDisplay = "12345678901234567"; // 17 characters, should be text-2xl
    render(<CalculatorDisplay expression="complex" display={longDisplay} mode="programmer" />);

    const displayElement = screen.getByText(longDisplay);
    expect(displayElement).toHaveClass("text-2xl");
  });

  it("should apply correct font size for long display", () => {
    const veryLongDisplay = "12345678901234567890123456789";
    render(<CalculatorDisplay expression="very complex" display={veryLongDisplay} mode="programmer" />);

    const displayElement = screen.getByText(veryLongDisplay);
    expect(displayElement).toHaveClass("text-xl");
  });

  it("should have proper accessibility attributes", () => {
    render(<CalculatorDisplay expression="2+3" display="5" mode="standard" />);

    // Find the expression element - it will have the simple humanized text
    const expressionElements = screen.getAllByText(/2/);
    const expressionElement = expressionElements.find(el => el.getAttribute('aria-live') === 'polite');

    expect(expressionElement).toHaveAttribute("aria-live", "polite");
    expect(expressionElement).toHaveAttribute("title", "2+3");

    const displayElement = screen.getByText("5");
    expect(displayElement).toHaveAttribute("title", "5");
  });

  it("should handle null display gracefully", () => {
    render(<CalculatorDisplay expression="2+3" display={null as any} mode="standard" />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should truncate long expressions", () => {
    const longExpression = "1+2+3+4+5+6+7+8+9+10+11+12+13+14+15";
    render(<CalculatorDisplay expression={longExpression} display="105" mode="programmer" />);

    const expressionElement = screen.getByText(longExpression);
    expect(expressionElement).toHaveClass("truncate");
  });

  it("should show simple humanization for large numbers in standard mode", () => {
    render(<CalculatorDisplay expression="2000000/4" display="500000" mode="standard" />);

    // Should use simple magnitude-based format
    const expressionText = screen.getByText(/million/i);
    expect(expressionText).toBeInTheDocument();
  });

  it("should show original expression tooltip", () => {
    render(<CalculatorDisplay expression="6000/2" display="3000" mode="standard" />);

    // The title attribute should show the original expression
    const expressionElements = screen.getAllByText(/thousand/i);
    const expressionElement = expressionElements.find(el => el.getAttribute('title'));

    expect(expressionElement).toHaveAttribute("title", "6000/2");
  });

  it("should show empty string for zero expression in humanized mode", () => {
    render(<CalculatorDisplay expression="0" display="0" mode="standard" />);

    // The expression area should be empty (humanizeExpressionSimple returns "")
    // But display should show "0"
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
