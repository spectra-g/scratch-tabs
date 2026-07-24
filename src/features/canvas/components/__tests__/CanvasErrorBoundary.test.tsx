import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasErrorBoundary } from "../CanvasErrorBoundary";

const BrokenCanvas = () => {
  throw new Error("lazy Canvas chunk unavailable");
};

describe("CanvasErrorBoundary", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => consoleError.mockRestore());

  it("contains renderer failures and offers recovery without claiming data loss", () => {
    const onClose = jest.fn();
    const onReload = jest.fn();
    render(
      <CanvasErrorBoundary onClose={onClose} onReload={onReload}>
        <BrokenCanvas />
      </CanvasErrorBoundary>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Your local Canvas data is still stored");
    fireEvent.click(screen.getByTestId("canvas-render-reload"));
    fireEvent.click(screen.getByRole("button", { name: "Close Canvas" }));

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
