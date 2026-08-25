import { render, waitFor } from "@testing-library/react";
import { ShareURLHandler } from "../ShareURLHandler";
import { shareService } from "../../../services/shareService";
import { dynamicTabletRegistry } from "../../../tablets/dynamicRegistry";

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockNavigate = jest.fn();

import type { Tablet } from "../../../tablets/types";

const fakeTabletDef = {
  id: "spinthewheel",
  label: "Spin the Wheel",
  serializeState: (state: unknown) => JSON.stringify(state),
  deserializeState: (json: string) => ({ type: "spinthewheel", data: JSON.parse(json).data }),
} as unknown as Tablet;

describe("ShareURLHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.hash = "";
  });

  afterEach(() => {
    window.location.hash = "";
  });

  function mountWithHash(hash: string) {
    window.history.replaceState(null, "", `/${hash}`);
    return render(<ShareURLHandler />);
  }

  it("routes tablet-type payloads to a new tablet tab via pendingShare", async () => {
    const payload = JSON.stringify({
      type: "spinthewheel",
      data: { title: "Team Wheel", entries: [{ id: "e1", label: "Alice", enabled: true }] },
    });
    const hash = shareService.generateShareUrl("spinthewheel", payload);
    jest.spyOn(dynamicTabletRegistry, "getById").mockResolvedValue(fakeTabletDef);

    mountWithHash(hash);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    const [path, options] = mockNavigate.mock.calls[0];
    expect(path).toBe("/");
    expect(options.replace).toBe(true);
    const pending = options.state.pendingShare;
    expect(pending.title).toBe("Shared Spin the Wheel");
    expect(pending.isTablet).toBe(true);
    const restored = JSON.parse(pending.tabletState);
    expect(restored.type).toBe("spinthewheel");
    expect(restored.data.entries[0].label).toBe("Alice");
    expect(window.location.hash).toBe("");
  });

  it("still opens an editor tab for non-tablet share types", async () => {
    jest.spyOn(dynamicTabletRegistry, "getById").mockResolvedValue(undefined);

    mountWithHash(shareService.generateShareUrl("javascript", "const x = 1;"));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    const [, options] = mockNavigate.mock.calls[0];
    expect(options.state.pendingShare).toEqual(
      expect.objectContaining({
        content: "const x = 1;",
        language: "javascript",
        languageLocked: true,
      }),
    );
    expect(options.state.pendingShare.isTablet).toBeUndefined();
  });

  it("navigates home when the tablet state cannot be restored", async () => {
    const brokenDef = {
      ...fakeTabletDef,
      deserializeState: () => {
        throw new Error("corrupt");
      },
    };
    jest.spyOn(dynamicTabletRegistry, "getById").mockResolvedValue(brokenDef);

    mountWithHash(
      shareService.generateShareUrl("spinthewheel", JSON.stringify({ type: "spinthewheel", data: {} })),
    );

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }));
  });
});
