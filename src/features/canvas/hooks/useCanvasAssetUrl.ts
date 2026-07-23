import { useEffect, useState } from "react";
import type { CanvasAssetRecord } from "../types";
import {
  canvasAssetRepository,
  type CanvasAssetRepositoryContract,
} from "../services/CanvasAssetRepository";

export type CanvasAssetUrlState =
  | { status: "loading"; asset: null; url: null; error: null }
  | { status: "ready"; asset: CanvasAssetRecord; url: string; error: null }
  | { status: "missing" | "error"; asset: null; url: null; error: string };

export const useCanvasAssetUrl = (
  assetId: string,
  repository: CanvasAssetRepositoryContract = canvasAssetRepository,
): CanvasAssetUrlState => {
  const [state, setState] = useState<CanvasAssetUrlState>({
    status: "loading",
    asset: null,
    url: null,
    error: null,
  });

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;
    setState({ status: "loading", asset: null, url: null, error: null });

    void repository
      .get(assetId)
      .then((asset) => {
        if (disposed) return;
        if (!asset) {
          setState({
            status: "missing",
            asset: null,
            url: null,
            error: "This image is missing from local storage.",
          });
          return;
        }
        objectUrl = URL.createObjectURL(asset.blob);
        setState({ status: "ready", asset, url: objectUrl, error: null });
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setState({
          status: "error",
          asset: null,
          url: null,
          error:
            error instanceof Error
              ? error.message
              : "This image could not be loaded from local storage.",
        });
      });

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, repository]);

  return state;
};
