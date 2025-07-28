import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HelpGuide } from "../HelpGuide";

describe("HelpGuide", () => {
  it("should render the help guide with title and info icon", () => {
    render(<HelpGuide />);
    
    expect(screen.getByText("How to use JSON Mapper")).toBeInTheDocument();
    expect(screen.getByTitle("Show help guide")).toBeInTheDocument();
  });

  it("should expand and show steps when info icon is clicked", () => {
    render(<HelpGuide />);
    
    const infoButton = screen.getByTitle("Show help guide");
    fireEvent.click(infoButton);
    
    // Check that all 7 steps are visible
    expect(screen.getByText("Add a source JSON file")).toBeInTheDocument();
    expect(screen.getByText("Enter the target JSON structure")).toBeInTheDocument();
    expect(screen.getByText("Click Analyse & Suggest Mappings")).toBeInTheDocument();
    expect(screen.getByText("Inspect and edit mappings")).toBeInTheDocument();
    expect(screen.getByText("Click the Test button")).toBeInTheDocument();
    expect(screen.getByText("Tweak the mappings if required")).toBeInTheDocument();
    expect(screen.getByText("Save the mapping")).toBeInTheDocument();
    
    // Check that X button appears when expanded
    expect(screen.getByTitle("Close help guide")).toBeInTheDocument();
  });

  it("should collapse when info icon is clicked again", () => {
    render(<HelpGuide />);
    
    const infoButton = screen.getByTitle("Show help guide");
    
    // Expand first
    fireEvent.click(infoButton);
    expect(screen.getByText("Add a source JSON file")).toBeInTheDocument();
    
    // Collapse
    fireEvent.click(infoButton);
    expect(screen.queryByText("Add a source JSON file")).not.toBeInTheDocument();
  });

  it("should collapse when X button is clicked", () => {
    render(<HelpGuide />);
    
    const infoButton = screen.getByTitle("Show help guide");
    
    // Expand first
    fireEvent.click(infoButton);
    expect(screen.getByText("Add a source JSON file")).toBeInTheDocument();
    
    // Click X button to close
    const closeButton = screen.getByTitle("Close help guide");
    fireEvent.click(closeButton);
    expect(screen.queryByText("Add a source JSON file")).not.toBeInTheDocument();
  });

  it("should display step numbers correctly", () => {
    render(<HelpGuide />);
    
    const infoButton = screen.getByTitle("Show help guide");
    fireEvent.click(infoButton);
    
    // Check that step numbers 1-7 are displayed
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });

  it("should apply custom className when provided", () => {
    const { container } = render(<HelpGuide className="custom-class" />);
    
    const helpGuideElement = container.querySelector(".custom-class");
    expect(helpGuideElement).toBeInTheDocument();
  });

  it("should start expanded when isExpanded prop is true", () => {
    render(<HelpGuide isExpanded={true} />);
    
    // Steps should be visible immediately
    expect(screen.getByText("Add a source JSON file")).toBeInTheDocument();
    expect(screen.getByTitle("Close help guide")).toBeInTheDocument();
  });

  it("should call onToggle when info icon is clicked", () => {
    const mockOnToggle = jest.fn();
    render(<HelpGuide onToggle={mockOnToggle} />);
    
    const infoButton = screen.getByTitle("Show help guide");
    fireEvent.click(infoButton);
    
    expect(mockOnToggle).toHaveBeenCalledWith(true);
  });

  it("should call onToggle when X button is clicked", () => {
    const mockOnToggle = jest.fn();
    render(<HelpGuide isExpanded={true} onToggle={mockOnToggle} />);
    
    const closeButton = screen.getByTitle("Close help guide");
    fireEvent.click(closeButton);
    
    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });
}); 