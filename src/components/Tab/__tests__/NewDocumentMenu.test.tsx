import { fireEvent, render, screen } from "@testing-library/react";
import { NewDocumentMenu } from "../NewDocumentMenu";
import { useCalloutStore } from "../../../stores/calloutStore";
import type { SmartView } from "../../../views/registry";

describe("NewDocumentMenu", () => {
  const props = {
    onCreateText: jest.fn(),
    onCreateCanvas: jest.fn(),
    onCreateFromClipboard: jest.fn(),
    onOpenTools: jest.fn(),
    side: "left" as const,
  };

  beforeEach(() => jest.clearAllMocks());

  it("offers document and existing creation choices", () => {
    render(<NewDocumentMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose document type" }));

    expect(screen.getByRole("menuitem", { name: "Text Tab" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Canvas" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "From Clipboard" })).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Developer Tool" })).toBeVisible();
  });

  it("runs the selected action and closes the menu", () => {
    render(<NewDocumentMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose document type" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Canvas" }));

    expect(props.onCreateCanvas).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders the menu outside clipping tab-bar containers", () => {
    const { container } = render(
      <div className="overflow-hidden">
        <NewDocumentMenu {...props} />
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose document type" }));

    const menu = screen.getByRole("menu");
    expect(document.body).toContainElement(menu);
    expect(container).not.toContainElement(menu);
    expect(menu).toHaveClass("fixed");
  });

  it("closes on Escape and restores focus to the trigger", () => {
    render(<NewDocumentMenu {...props} />);
    const trigger = screen.getByRole("button", { name: "Choose document type" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("hides the smart view callout when opening, since it overlaps the menu", () => {
    useCalloutStore
      .getState()
      .showCallout("tab-1", { id: "json-tree" } as SmartView, "json");

    render(<NewDocumentMenu {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose document type" }));

    expect(useCalloutStore.getState().isVisible).toBe(false);
  });
});
