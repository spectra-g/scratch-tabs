import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SelectionRectangle } from "../components/SelectionRectangle";
import { SelectionRectangle as SelectionRectangleType } from "../hooks/useSelectionRectangle";

describe("SelectionRectangle", () => {
  const createSelectionRectangle = (
    isActive: boolean,
    startPoint = { x: 10, y: 10 },
    endPoint = { x: 50, y: 50 },
    justCompleted = false
  ): SelectionRectangleType => ({
    isActive,
    startPoint,
    endPoint,
    justCompleted,
  });

  it("should not render when selection is not active", () => {
    const selectionRectangle = createSelectionRectangle(false);

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="dark"
        />
      </svg>
    );

    expect(screen.queryByTestId("selection-rectangle")).not.toBeInTheDocument();
  });

  it("should render when selection is active", () => {
    const selectionRectangle = createSelectionRectangle(true);

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="dark"
        />
      </svg>
    );

    expect(screen.getByTestId("selection-rectangle")).toBeInTheDocument();
  });

  it("should render rectangle with correct dimensions for normal drag", () => {
    const selectionRectangle = createSelectionRectangle(
      true,
      { x: 10, y: 20 },
      { x: 60, y: 80 }
    );

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="dark"
        />
      </svg>
    );

    const rect = screen.getByTestId("selection-rectangle");
    expect(rect).toHaveAttribute("x", "10");
    expect(rect).toHaveAttribute("y", "20");
    expect(rect).toHaveAttribute("width", "50");
    expect(rect).toHaveAttribute("height", "60");
  });

  it("should render rectangle with correct dimensions for reverse drag", () => {
    const selectionRectangle = createSelectionRectangle(
      true,
      { x: 60, y: 80 },
      { x: 10, y: 20 }
    );

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="dark"
        />
      </svg>
    );

    const rect = screen.getByTestId("selection-rectangle");
    expect(rect).toHaveAttribute("x", "10");
    expect(rect).toHaveAttribute("y", "20");
    expect(rect).toHaveAttribute("width", "50");
    expect(rect).toHaveAttribute("height", "60");
  });

  it("should apply dark mode styles", () => {
    const selectionRectangle = createSelectionRectangle(true);

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="dark"
        />
      </svg>
    );

    const rect = screen.getByTestId("selection-rectangle");
    expect(rect).toHaveAttribute("stroke", "#60a5fa");
    expect(rect).toHaveAttribute("fill", "rgba(96, 165, 250, 0.1)");
  });

  it("should apply light mode styles", () => {
    const selectionRectangle = createSelectionRectangle(true);

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="light"
        />
      </svg>
    );

    const rect = screen.getByTestId("selection-rectangle");
    expect(rect).toHaveAttribute("stroke", "#2563eb");
    expect(rect).toHaveAttribute("fill", "rgba(37, 99, 235, 0.1)");
  });

  it("should have correct styling attributes", () => {
    const selectionRectangle = createSelectionRectangle(true);

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="dark"
        />
      </svg>
    );

    const rect = screen.getByTestId("selection-rectangle");
    expect(rect).toHaveAttribute("stroke-width", "1");
    expect(rect).toHaveAttribute("stroke-dasharray", "4,2");
    expect(rect).toHaveAttribute("pointer-events", "none");
  });

  it("should handle zero-width rectangles", () => {
    const selectionRectangle = createSelectionRectangle(
      true,
      { x: 10, y: 20 },
      { x: 10, y: 50 }
    );

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="dark"
        />
      </svg>
    );

    const rect = screen.getByTestId("selection-rectangle");
    expect(rect).toHaveAttribute("width", "0");
    expect(rect).toHaveAttribute("height", "30");
  });

  it("should handle zero-height rectangles", () => {
    const selectionRectangle = createSelectionRectangle(
      true,
      { x: 10, y: 20 },
      { x: 50, y: 20 }
    );

    render(
      <svg>
        <SelectionRectangle
          selectionRectangle={selectionRectangle}
          canvasMode="dark"
        />
      </svg>
    );

    const rect = screen.getByTestId("selection-rectangle");
    expect(rect).toHaveAttribute("width", "40");
    expect(rect).toHaveAttribute("height", "0");
  });
});