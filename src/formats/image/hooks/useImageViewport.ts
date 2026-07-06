import { RefObject, useCallback, useEffect, useState } from "react";
import {
  ImageViewport,
  clampZoom,
  getCenteredViewport,
  getFillZoom,
  getFitZoom,
  zoomAtPoint,
} from "../utils/viewport";

const DEFAULT_VIEWPORT: ImageViewport = { zoom: 1, offsetX: 0, offsetY: 0 };

export function useImageViewport(
  stageRef: RefObject<HTMLElement>,
  imageSize: { width: number; height: number },
) {
  const [viewport, setViewport] = useState<ImageViewport>(DEFAULT_VIEWPORT);

  const getStageSize = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }, [stageRef]);

  const centerWithZoom = useCallback((zoom: number) => {
    const stage = getStageSize();
    setViewport(getCenteredViewport(stage, imageSize, zoom));
  }, [getStageSize, imageSize.height, imageSize.width]);

  const fit = useCallback(() => {
    const zoom = getFitZoom(getStageSize(), imageSize);
    centerWithZoom(zoom);
  }, [centerWithZoom, getStageSize, imageSize]);

  const fill = useCallback(() => {
    const zoom = getFillZoom(getStageSize(), imageSize);
    centerWithZoom(zoom);
  }, [centerWithZoom, getStageSize, imageSize]);

  const actualSize = useCallback(() => centerWithZoom(1), [centerWithZoom]);
  const reset = fit;

  const zoomBy = useCallback((factor: number, point?: { x: number; y: number }) => {
    setViewport((current) => {
      const stage = getStageSize();
      const zoomPoint = point ?? { x: stage.width / 2, y: stage.height / 2 };
      return zoomAtPoint(current, current.zoom * factor, zoomPoint);
    });
  }, [getStageSize]);

  const panBy = useCallback((dx: number, dy: number) => {
    setViewport((current) => ({
      ...current,
      offsetX: current.offsetX + dx,
      offsetY: current.offsetY + dy,
    }));
  }, []);

  useEffect(() => {
    if (imageSize.width > 0 && imageSize.height > 0) {
      fit();
    }
  }, [fit, imageSize.height, imageSize.width]);

  return {
    viewport,
    setViewport,
    fit,
    fill,
    actualSize,
    reset,
    zoomBy,
    panBy,
  };
}
