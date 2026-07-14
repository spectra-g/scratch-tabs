import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { WelcomeScreen } from "../WelcomeScreen";
import { useRootStore } from "../../../stores";

jest.mock("../../../stores", () => ({
  useRootStore: jest.fn(),
}));

jest.mock("../../Tab/TabActions", () => ({
  TabActions: () => <div data-testid="tab-actions" />,
}));

jest.mock("../../ToolSelector", () => ({
  ToolSelectorModal: () => <div data-testid="tool-selector" />,
}));

jest.mock("../../../services/toolService", () => ({
  toolService: { executeTool: jest.fn() },
}));

describe("WelcomeScreen", () => {
  const handleNewTab = jest.fn();
  const handleNewPopulatedTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRootStore as jest.Mock).mockReturnValue({
      handleNewTab,
      handleNewPopulatedTab,
    });
  });

  const renderWelcomeScreen = () =>
    render(
      <BrowserRouter>
        <WelcomeScreen />
      </BrowserRouter>,
    );

  it("uses a dedicated scroll container for the welcome content", () => {
    renderWelcomeScreen();

    expect(screen.getByTestId("welcome-scroll-container")).toHaveClass(
      "overflow-y-auto",
      "justify-start",
      "md:justify-center",
    );
  });

  it("shows a mobile-only desktop recommendation without removing desktop actions", () => {
    renderWelcomeScreen();

    expect(screen.getByTestId("mobile-desktop-recommendation")).toHaveTextContent(
      "Best on desktop",
    );
    expect(screen.getByTestId("mobile-desktop-recommendation")).toHaveClass("md:hidden");
    expect(screen.getByTestId("desktop-secondary-actions")).toHaveClass("hidden", "md:block");
    expect(screen.getByTestId("mobile-secondary-actions")).toHaveClass("md:hidden");
  });

  it("keeps the primary mobile actions available", () => {
    renderWelcomeScreen();

    fireEvent.click(screen.getByRole("button", { name: /new scratch tab/i }));

    expect(handleNewTab).toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: /format json/i })).toHaveClass("md:p-6");
  });
});
