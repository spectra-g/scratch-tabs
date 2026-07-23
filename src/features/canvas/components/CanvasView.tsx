import "@xyflow/react/dist/style.css";
import type { Tab } from "../../../types";
import { useCanvasDocument } from "../hooks/useCanvasDocument";
import { useCanvasImageOperations } from "../hooks/useCanvasImageOperations";
import { canvasEdgesToFlowEdges } from "../utils/canvasFlowMapping";
import { CanvasScene } from "./CanvasScene";
import "./canvas.css";

interface CanvasViewProps {
  tab: Tab;
}

const CanvasView = ({ tab }: CanvasViewProps) => {
  const imageOperations = useCanvasImageOperations(tab);
  const { activeDocument, status, revision, error, saveViewport, updateItems } =
    useCanvasDocument(tab);

  if (status === "error" && !activeDocument) {
    return (
      <div
        className="flex h-full items-center justify-center bg-canvas p-6 text-danger"
        role="alert"
        data-testid="canvas-load-error"
      >
        <div className="max-w-md rounded border border-danger/40 bg-surface p-4 text-center">
          <p className="font-semibold">This Canvas could not be opened.</p>
          <p className="mt-1 text-sm text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (!activeDocument) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
        Loading Canvas...
      </div>
    );
  }

  return (
    <CanvasScene
      key={activeDocument.document.id}
      tab={tab}
      initialItems={activeDocument.document.items}
      edges={canvasEdgesToFlowEdges(activeDocument.document.edges)}
      viewport={activeDocument.session.viewport}
      background={activeDocument.document.settings.background}
      status={status}
      revision={revision}
      error={error}
      updateItems={updateItems}
      imageOperations={imageOperations}
      saveViewport={saveViewport}
    />
  );
};

export default CanvasView;
