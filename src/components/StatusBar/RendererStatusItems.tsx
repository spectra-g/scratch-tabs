import { useRendererStatusStore } from "../../stores/rendererStatusStore";

interface RendererStatusItemsProps {
  tabId: string;
  fallbackLabel: string;
}

export const RendererStatusItems = ({
  tabId,
  fallbackLabel,
}: RendererStatusItemsProps) => {
  const contribution = useRendererStatusStore(
    (state) => state.contributions[tabId],
  );

  if (!contribution) return <span className="font-medium">{fallbackLabel}</span>;

  const saveText = contribution.save
    ? contribution.save.state === "saving"
      ? "Saving..."
      : contribution.save.state === "conflict"
        ? "Save conflict"
        : contribution.save.state === "error"
          ? contribution.save.error || "Save failed"
          : contribution.save.state === "loading"
            ? "Loading..."
            : "Saved"
    : null;

  return (
    <span
      className="flex items-center gap-2"
      data-testid={contribution.save ? "canvas-save-status" : undefined}
      data-renderer-tab-id={tabId}
      data-save-state={contribution.save?.state}
      data-save-revision={contribution.save?.revision}
      aria-live={contribution.save ? "polite" : undefined}
    >
      <span className="font-medium">{contribution.label}</span>
      {contribution.itemCount !== undefined && (
        <span>
          {contribution.itemCount} {contribution.itemCount === 1 ? "item" : "items"}
        </span>
      )}
      {contribution.selectionCount !== undefined && (
        <span>{contribution.selectionCount} selected</span>
      )}
      {contribution.zoomPercent !== undefined && (
        <span>{contribution.zoomPercent}%</span>
      )}
      {contribution.save && (
        <>
          <span className="text-muted">{contribution.save.scopeLabel}</span>
          <span>{saveText}</span>
        </>
      )}
    </span>
  );
};
