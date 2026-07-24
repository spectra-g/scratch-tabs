import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasConflictNotice } from "../CanvasConflictNotice";

describe("CanvasConflictNotice", () => {
  it("explains the unsaved state and exposes both explicit recovery choices", () => {
    const onReload = jest.fn();
    const onTakeOver = jest.fn();
    render(
      <CanvasConflictNotice
        remoteRevision={7}
        isResolving={false}
        onReload={onReload}
        onTakeOver={onTakeOver}
      />,
    );

    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("Your unsaved changes are still visible");
    expect(notice).toHaveAttribute("data-remote-revision", "7");

    fireEvent.click(screen.getByTestId("canvas-conflict-reload"));
    fireEvent.click(screen.getByTestId("canvas-conflict-take-over"));

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onTakeOver).toHaveBeenCalledTimes(1);
  });
});
