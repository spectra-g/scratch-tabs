import { Suspense, useLayoutEffect, useRef, useState } from "react";
import type { Tab } from "../../../types";
import { useIsMobile } from "../../../hooks/useIsMobile";
import { useRootStore } from "../../../stores/rootStore";
import { useTabsStore } from "../../../stores/tabsStore";
import { MIN_CANVAS_PANE_WIDTH } from "../constants";
import { resolveCanvasPaneWidth } from "../utils/canvasPaneWidth";
import { DesktopOnlyCanvasNotice } from "./DesktopOnlyCanvasNotice";
import { CanvasErrorBoundary } from "./CanvasErrorBoundary";
import { lazyWithReload } from "../../../utils/chunkLoadUtils";

const CanvasView = lazyWithReload(() => import("./CanvasView"), "canvas");

interface CanvasRendererProps {
  tab: Tab;
}

export const CanvasRenderer = ({ tab }: CanvasRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const tabs = useTabsStore((state) => state.tabs);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = (observedWidth?: number) => {
      const measuredWidth = container.getBoundingClientRect().width;
      setPaneWidth((previousWidth) =>
        resolveCanvasPaneWidth({
          observedWidth,
          measuredWidth,
          previousWidth,
        }),
      );
    };
    updateWidth();

    const observer = new ResizeObserver((entries) => {
      updateWidth(entries[0]?.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const otherTab = tabs.find(
    (candidate) =>
      candidate.workspaceId === tab.workspaceId && candidate.id !== tab.id,
  );
  const isSupported =
    paneWidth !== null && !isMobile && paneWidth >= MIN_CANVAS_PANE_WIDTH;

  return (
    <div ref={containerRef} className="h-full w-full" data-testid="canvas-shell">
      {paneWidth === null ? (
        <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
          Loading Canvas...
        </div>
      ) : !isSupported ? (
        <DesktopOnlyCanvasNotice
          onClose={() => useRootStore.getState().removeTab(tab.id)}
          onReturnToTabs={
            otherTab
              ? () => useRootStore.getState().setActiveTab(otherTab.id)
              : undefined
          }
        />
      ) : (
        <CanvasErrorBoundary
          onClose={() => useRootStore.getState().removeTab(tab.id)}
          onReload={() => window.location.reload()}
        >
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
                Loading Canvas...
              </div>
            }
          >
            <CanvasView tab={tab} />
          </Suspense>
        </CanvasErrorBoundary>
      )}
    </div>
  );
};
