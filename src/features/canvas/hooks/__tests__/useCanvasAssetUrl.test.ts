import { act, renderHook, waitFor } from "@testing-library/react";
import type { CanvasAssetRepositoryContract } from "../../services/CanvasAssetRepository";
import type { CanvasAssetRecord } from "../../types";
import { useCanvasAssetUrl } from "../useCanvasAssetUrl";

const asset: CanvasAssetRecord = {
  id: "asset-1",
  workspaceId: "workspace-1",
  blob: new Blob(["image"], { type: "image/png" }),
  mimeType: "image/png",
  originalName: "diagram.png",
  byteLength: 5,
  width: 100,
  height: 50,
  createdAt: 1,
};

describe("useCanvasAssetUrl", () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:canvas-image");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
  });

  it("creates one scoped object URL and revokes it on unmount", async () => {
    const repository: CanvasAssetRepositoryContract = {
      get: jest.fn().mockResolvedValue(asset),
    };
    const { result, unmount } = renderHook(() =>
      useCanvasAssetUrl(asset.id, repository),
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(URL.createObjectURL).toHaveBeenCalledWith(asset.blob);
    expect(result.current.url).toBe("blob:canvas-image");

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:canvas-image");
  });

  it("reports a missing record without creating an object URL", async () => {
    const repository: CanvasAssetRepositoryContract = {
      get: jest.fn().mockResolvedValue(undefined),
    };
    const { result } = renderHook(() =>
      useCanvasAssetUrl("missing", repository),
    );

    await act(async () => Promise.resolve());
    await waitFor(() => expect(result.current.status).toBe("missing"));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
