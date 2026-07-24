import { fireEvent, render, screen } from "@testing-library/react";
import { CanvasSaveErrorNotice } from "../CanvasSaveErrorNotice";

describe("CanvasSaveErrorNotice", () => {
  it("states that changes are unsaved and exposes an explicit retry", () => {
    const onRetry = jest.fn();
    render(
      <CanvasSaveErrorNotice
        error="Storage quota exceeded"
        isRetrying={false}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This Canvas has unsaved changes",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Storage quota exceeded",
    );
    fireEvent.click(screen.getByTestId("canvas-save-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate retries while one is in progress", () => {
    render(
      <CanvasSaveErrorNotice
        error="Write failed"
        isRetrying
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByTestId("canvas-save-retry")).toBeDisabled();
    expect(screen.getByTestId("canvas-save-retry")).toHaveTextContent(
      "Retrying...",
    );
  });
});
