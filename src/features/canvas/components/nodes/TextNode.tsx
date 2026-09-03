import { memo, useEffect, useRef, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { MIN_TEXT_ITEM_HEIGHT, MIN_TEXT_ITEM_WIDTH } from "../../constants";
import type { CanvasFlowNode } from "../../utils/canvasFlowMapping";
import { getCanvasItemAccessibleLabel } from "../../utils/canvasAccessibility";
import { useCanvasNodeInteraction } from "./CanvasNodeInteractionContext";
import { CanvasNodeHandles } from "./CanvasNodeHandles";

const TextNodeComponent = ({
  id,
  data,
  selected,
}: NodeProps<CanvasFlowNode>) => {
  const { item, isEditing, isFocused } = data;
  const {
    beginEditing,
    cancelEditing,
    commitResize,
    commitText,
    preparePointerSelection,
    completePointerSelection,
    syncFocusedItem,
  } = useCanvasNodeInteraction();
  const [draft, setDraft] = useState(item.text);
  const initialTextRef = useRef(item.text);
  const cardRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(item.text);
      initialTextRef.current = item.text;
      return;
    }
    initialTextRef.current = item.text;
    setDraft(item.text);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, [isEditing, item.text]);

  const commit = () => commitText(id, draft);
  const cancel = () => {
    setDraft(initialTextRef.current);
    cancelEditing(id);
    requestAnimationFrame(() =>
      cardRef.current?.focus({ preventScroll: true }),
    );
  };

  return (
    <article
      ref={cardRef}
      className="canvas-text-node h-full w-full overflow-hidden rounded-lg border bg-surface shadow-sm"
      data-testid={`canvas-item-${id}`}
      data-item-id={id}
      data-item-type="text"
      data-x={item.x}
      data-y={item.y}
      data-width={item.width}
      data-height={item.height}
      data-z-index={item.zIndex}
      data-editing={isEditing}
      data-focused={isFocused}
      tabIndex={isFocused ? 0 : -1}
      aria-label={getCanvasItemAccessibleLabel(item)}
      aria-selected={selected}
      onFocus={() => syncFocusedItem(id, "keyboard")}
      onPointerDownCapture={(event) => {
        if (!isEditing && event.button === 0) {
          preparePointerSelection(
            id,
            event.metaKey || event.ctrlKey || event.shiftKey,
          );
          syncFocusedItem(id, "pointer");
          event.currentTarget.focus({ preventScroll: true });
        }
      }}
      onClickCapture={() => {
        requestAnimationFrame(() => completePointerSelection(id));
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        beginEditing(id);
      }}
    >
      <CanvasNodeHandles />
      <NodeResizer
        isVisible={selected && !isEditing}
        minWidth={MIN_TEXT_ITEM_WIDTH}
        minHeight={MIN_TEXT_ITEM_HEIGHT}
        onResizeEnd={(_event, bounds) => commitResize(id, bounds)}
      />
      {isEditing ? (
        <textarea
          ref={editorRef}
          className="nodrag nowheel h-full w-full resize-none bg-transparent p-4 text-sm leading-6 text-main outline-none"
          data-testid="canvas-text-editor"
          aria-label="Edit text card"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            } else if (
              event.key === "Enter" &&
              (event.metaKey || event.ctrlKey)
            ) {
              event.preventDefault();
              commit();
            }
          }}
        />
      ) : (
        <div className="h-full whitespace-pre-wrap break-words p-4 text-sm leading-6 text-main">
          {item.text || (
            <span className="text-muted">Double-click to edit</span>
          )}
        </div>
      )}
    </article>
  );
};

export const TextNode = memo(TextNodeComponent);
