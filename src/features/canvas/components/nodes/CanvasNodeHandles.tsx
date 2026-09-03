import { Handle, Position } from "@xyflow/react";

/**
 * Edge anchors for every card. Manual connections stay off
 * (ReactFlow `nodesConnectable={false}`); these only let
 * system-created transform edges attach to cards.
 */
export const CanvasNodeHandles = () => (
  <>
    <Handle
      type="target"
      position={Position.Left}
      isConnectable={false}
      className="canvas-node-handle"
      aria-hidden="true"
    />
    <Handle
      type="source"
      position={Position.Right}
      isConnectable={false}
      className="canvas-node-handle"
      aria-hidden="true"
    />
  </>
);
