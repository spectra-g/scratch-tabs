import { fireEvent, render, screen } from "@testing-library/react";
import { TabActions } from "../TabActions";

const mockHandleNewTab = jest.fn();
const mockHandleNewTabFromPaste = jest.fn();
const mockHandleNewCanvas = jest.fn();

jest.mock("../../../stores", () => ({
  useRootStore: () => ({
    handleNewTab: mockHandleNewTab,
    handleNewTabFromPaste: mockHandleNewTabFromPaste,
    handleNewCanvas: mockHandleNewCanvas,
  }),
}));

describe("TabActions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps clipboard and Tool Selector actions exclusively in the document menu", () => {
    const onShowTabletSelector = jest.fn();
    render(<TabActions onShowTabletSelector={onShowTabletSelector} />);

    expect(screen.getByTestId("icon-new-tab")).toBeVisible();
    expect(screen.getByTestId("new-document-menu-trigger")).toBeVisible();
    expect(
      screen.queryByTestId("icon-new-tab-from-clipboard"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("icon-new-tools")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("new-document-menu-trigger"));
    fireEvent.click(screen.getByRole("menuitem", { name: "From Clipboard" }));
    expect(mockHandleNewTabFromPaste).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByTestId("new-document-menu-trigger"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Developer Tool" }));
    expect(onShowTabletSelector).toHaveBeenCalledTimes(1);
  });
});
