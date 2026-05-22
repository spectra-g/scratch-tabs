import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SmartViewButtons } from "../SmartViewButtons";
import { smartViewRegistry } from "../../../views/registry";
import { useRootStore } from "../../../stores";

jest.mock("../../../views/registry", () => ({
  smartViewRegistry: {
    getViewsForLanguage: jest.fn(),
  },
}));

jest.mock("../../../stores", () => ({
  useRootStore: jest.fn(),
}));

// Render framer-motion primitives without animation so DOM state is testable
jest.mock("framer-motion", () => ({
  motion: {
    button: ({ children, className, onClick, title, "data-testid": testId }: any) => (
      <button className={className} onClick={onClick} title={title} data-testid={testId}>
        {children}
      </button>
    ),
    span: ({ children, className, style }: any) => (
      <span className={className} style={style}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const MockIcon = ({ size }: { size: number }) => <svg data-testid="view-icon" width={size} />;

const mockView = {
  id: "json-tree",
  label: "JSON Tree",
  languageId: "json",
  icon: MockIcon,
  component: () => null,
  mode: "replaces" as const,
};

describe("SmartViewButtons", () => {
  const mockSetActiveView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRootStore as jest.Mock).mockReturnValue({
      getActiveView: jest.fn(() => null),
      setActiveView: mockSetActiveView,
    });
  });

  it("renders nothing when no views are registered for the language", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([]);
    const { container } = render(<SmartViewButtons language="plaintext" tabId="tab-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an icon-only button when the view is inactive", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView]);
    render(<SmartViewButtons language="json" tabId="tab-1" />);

    expect(screen.getByTestId("table-view-button")).toBeInTheDocument();
    expect(screen.getByTestId("view-icon")).toBeInTheDocument();
    expect(screen.queryByText("JSON Tree")).not.toBeInTheDocument();
  });

  it("renders icon + label + × when the view is active", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView]);
    (useRootStore as jest.Mock).mockReturnValue({
      getActiveView: jest.fn(() => "json-tree"),
      setActiveView: mockSetActiveView,
    });

    render(<SmartViewButtons language="json" tabId="tab-1" />);

    expect(screen.getByText("JSON Tree")).toBeInTheDocument();
    expect(screen.getByTestId("table-view-button")).toHaveAttribute("title", "Close JSON Tree");
  });

  it("calls setActiveView with the view id when clicking an inactive button", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView]);
    render(<SmartViewButtons language="json" tabId="tab-1" />);

    fireEvent.click(screen.getByTestId("table-view-button"));
    expect(mockSetActiveView).toHaveBeenCalledWith("tab-1", "json-tree");
  });

  it("calls setActiveView with null when clicking an active button", () => {
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView]);
    (useRootStore as jest.Mock).mockReturnValue({
      getActiveView: jest.fn(() => "json-tree"),
      setActiveView: mockSetActiveView,
    });

    render(<SmartViewButtons language="json" tabId="tab-1" />);

    fireEvent.click(screen.getByTestId("table-view-button"));
    expect(mockSetActiveView).toHaveBeenCalledWith("tab-1", null);
  });

  it("renders one button per registered view", () => {
    const secondView = { ...mockView, id: "json-schema", label: "Schema" };
    (smartViewRegistry.getViewsForLanguage as jest.Mock).mockReturnValue([mockView, secondView]);

    render(<SmartViewButtons language="json" tabId="tab-1" />);

    expect(screen.getAllByTestId("table-view-button")).toHaveLength(2);
  });
});
