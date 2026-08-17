import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SmartViewCalloutWidget } from "../SmartViewCalloutWidget";
import { formatRegistry } from "../../../formats";

jest.mock("../../../formats", () => ({
  formatRegistry: {
    getById: jest.fn(),
  },
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

describe("SmartViewCalloutWidget", () => {
  const onSwitch = jest.fn();
  const onDismiss = jest.fn();
  const view = {
    id: "json-workbench",
    languageId: "json",
    label: "JSON Workbench",
    icon: () => null,
    component: () => null,
    mode: "replaces" as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (formatRegistry.getById as jest.Mock).mockReturnValue({ name: "JSON" });
  });

  it("presents Data View as the primary action", () => {
    render(
      <SmartViewCalloutWidget
        view={view}
        languageId="json"
        onSwitch={onSwitch}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByTestId("smart-view-callout-message")).toHaveTextContent("Data View available");
    expect(screen.getByTestId("smart-view-callout-message")).toHaveTextContent("JSON detected");
    expect(screen.getByTestId("smart-view-callout")).not.toHaveClass("border-l-primary");
    expect(screen.getByTestId("smart-view-callout-icon")).toHaveClass("text-secondary");
    expect(screen.getByTestId("smart-view-callout-data-view")).toHaveTextContent("Data View");
    expect(screen.getByTestId("smart-view-callout-data-view")).toHaveAttribute("aria-label", "Open Data View");
    expect(screen.getByTestId("smart-view-callout-data-view")).toHaveAttribute("title", "Open Data View (JSON Workbench)");
  });

  it("opens Data View and dismisses from their respective actions", () => {
    render(
      <SmartViewCalloutWidget
        view={view}
        languageId="json"
        onSwitch={onSwitch}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByTestId("smart-view-callout-data-view"));
    fireEvent.click(screen.getByTestId("smart-view-callout-dismiss"));

    expect(onSwitch).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
