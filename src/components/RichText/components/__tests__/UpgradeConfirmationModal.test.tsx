import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { UpgradeConfirmationModal } from "../UpgradeConfirmationModal";

const renderModal = (isCurrentTabEmpty: boolean) => {
  const actions = {
    onCancel: jest.fn(),
    onPasteAsDataUrl: jest.fn(),
    onPasteInRichText: jest.fn(),
    onPasteInCanvas: jest.fn(),
  };

  render(
    <UpgradeConfirmationModal
      isOpen
      isCurrentTabEmpty={isCurrentTabEmpty}
      {...actions}
    />,
  );

  return actions;
};

describe("UpgradeConfirmationModal", () => {
  it("offers to paste the data URL into an empty Monaco tab", () => {
    renderModal(true);

    expect(
      screen.getByRole("button", { name: /Paste as data URL/i }),
    ).toHaveTextContent("Insert the image's raw data into this tab.");
    expect(
      screen.getByRole("button", { name: /Paste in Rich Text/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Paste in Canvas/i }),
    ).toBeInTheDocument();
  });

  it("offers to open the data URL in a new tab when Monaco has content", () => {
    renderModal(false);

    expect(
      screen.getByRole("button", { name: /Open data URL in new tab/i }),
    ).toHaveTextContent("Keep this tab unchanged");
  });

  it("runs the selected data URL action", () => {
    const actions = renderModal(false);

    fireEvent.click(
      screen.getByRole("button", { name: /Open data URL in new tab/i }),
    );

    expect(actions.onPasteAsDataUrl).toHaveBeenCalledTimes(1);
  });

  it("closes when Escape is pressed", () => {
    const actions = renderModal(true);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(actions.onCancel).toHaveBeenCalledTimes(1);
  });
});
