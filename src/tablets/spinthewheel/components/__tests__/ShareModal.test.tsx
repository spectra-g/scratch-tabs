import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareModal } from "../ShareModal";

describe("ShareModal", () => {
  function setup(overrides: Partial<Parameters<typeof ShareModal>[0]> = {}) {
    const onClose = jest.fn();
    render(
      <ShareModal
        url="https://scratchtabs.com/#/s/v1/spinthewheel/full/abc123"
        percentUsed={42}
        entriesText={"Alice\nBob"}
        onClose={onClose}
        {...overrides}
      />,
    );
    return { onClose };
  }

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  it("shows the shareable URL with a working copy button", async () => {
    setup();

    const input = screen.getByTestId("spinthewheel-share-url");
    expect(input).toHaveValue("https://scratchtabs.com/#/s/v1/spinthewheel/full/abc123");

    await userEvent.click(screen.getByRole("button", { name: /^copy$/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://scratchtabs.com/#/s/v1/spinthewheel/full/abc123",
    );
    expect(await screen.findByRole("button", { name: /^copied$/i })).toBeInTheDocument();
  });

  it("closes via the close button, backdrop click, and Escape", async () => {
    const { onClose } = setup();

    await userEvent.click(screen.getByRole("button", { name: /close share dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(2);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("warns and offers a names fallback when the URL does not fit", async () => {
    setup({ url: null, percentUsed: 187 });

    expect(screen.getByRole("alert")).toHaveTextContent(/too large for a shareable link/i);

    await userEvent.click(
      screen.getByRole("button", { name: /copy names instead/i }),
    );
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Alice\nBob");
    expect(await screen.findByRole("button", { name: /names copied/i })).toBeInTheDocument();
  });

  it("does not offer the fallback when the URL fits", () => {
    setup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy names instead/i })).not.toBeInTheDocument();
  });
});
