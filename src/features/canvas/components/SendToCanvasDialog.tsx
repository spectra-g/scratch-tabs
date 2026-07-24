import { useMemo, useState } from "react";
import { Layers, Plus, X } from "../../../components/Icons";
import { useWorkspaceStore } from "../../../stores/workspaceStore";
import {
  canvasActionService,
  type CanvasTargetSummary,
} from "../services/CanvasActionService";
import type { CanvasSendSource } from "../utils/canvasSendSource";
import { canvasSendSourceToInputs } from "../utils/canvasSendSource";

interface SendToCanvasDialogProps {
  source: CanvasSendSource;
  side: "left" | "right";
  onClose: () => void;
}

export const SendToCanvasDialog = ({
  source,
  side,
  onClose,
}: SendToCanvasDialogProps) => {
  const workspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const targets = useMemo<CanvasTargetSummary[]>(
    () => (workspaceId ? canvasActionService.getTargets(workspaceId) : []),
    [workspaceId],
  );

  const send = async (targetId?: string) => {
    if (!workspaceId || sending) return;
    setSending(true);
    setError(null);
    try {
      const inputs = canvasSendSourceToInputs(source);
      await canvasActionService.send(
        workspaceId,
        inputs,
        targetId
          ? { kind: "existing", tabId: targetId }
          : { kind: "new", side },
      );
      onClose();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "The content could not be sent to Canvas.",
      );
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-command flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-to-canvas-title"
      data-testid="send-to-canvas-dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-base bg-surface p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="send-to-canvas-title" className="text-base font-semibold text-main">
              Send to Canvas
            </h2>
            <p className="mt-1 text-xs text-muted">
              Create a Canvas or add near an existing Canvas viewport.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-element-hover hover:text-main"
            aria-label="Close Send to Canvas"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending}
            className="flex w-full items-center gap-3 rounded border border-primary/40 bg-primary/10 p-3 text-left text-main hover:bg-primary/15 disabled:opacity-50"
            data-testid="send-to-new-canvas"
          >
            <Plus size={18} className="text-primary" />
            <span>
              <span className="block text-sm font-medium">New Canvas</span>
              <span className="block text-xs text-muted">Create in this workspace</span>
            </span>
          </button>

          {targets.map((target) => (
            <button
              key={target.id}
              type="button"
              onClick={() => void send(target.id)}
              disabled={sending}
              className="flex w-full items-center gap-3 rounded border border-base p-3 text-left text-main hover:bg-element-hover disabled:opacity-50"
              data-testid={`send-to-canvas-${target.id}`}
            >
              <Layers size={18} className="text-secondary" />
              <span className="truncate text-sm font-medium">{target.title}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};
