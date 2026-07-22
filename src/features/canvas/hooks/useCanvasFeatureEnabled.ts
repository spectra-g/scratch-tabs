import { useEffect, useState } from "react";
import { getCanvasFeatureEnabled } from "../utils/canvasFeatureFlag";

export const useCanvasFeatureEnabled = (): boolean => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    getCanvasFeatureEnabled()
      .then((isEnabled) => {
        if (active) setEnabled(isEnabled);
      })
      .catch((error) => {
        console.error("Failed to load Canvas feature setting:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  return enabled;
};
