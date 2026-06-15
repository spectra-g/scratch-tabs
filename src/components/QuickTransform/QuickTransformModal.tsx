import React, { useCallback, useEffect, useRef, useState } from "react";
import { SavedPipeline } from "../../services/pipeline/types";
import { QuickTransformItem, RecentItem } from "../../services/quickTransform/types";
import { filterByRecents, searchItems } from "../../services/quickTransform/quickTransformSearch";
import { addRecentItem, getRecentItems } from "../../services/quickTransform/quickTransformRecents";
import {
  buildInitialParams,
  executeQuickTransformItem,
  validateParams,
} from "../../services/quickTransform/quickTransformExecutor";
import { QuickTransformTextContext } from "../../stores/quickTransformStore";
import { QuickTransformResultItem } from "./QuickTransformResultItem";
import { QuickTransformParamsForm } from "./QuickTransformParamsForm";
import { EditorRange } from "../../types";
import { db } from "../../db";
import { operationRegistry } from "../../services/pipeline/OperationRegistry";
import { OperationDefinition } from "../../services/pipeline/types";

const MODAL_WIDTH = 340;
const MODAL_HEIGHT = 280;

function clampPosition(x: number, y: number): { x: number; y: number } {
  const margin = 8;
  const clampedX =
    x + MODAL_WIDTH + margin > window.innerWidth
      ? window.innerWidth - MODAL_WIDTH - margin
      : x;
  const clampedY =
    y + MODAL_HEIGHT + margin > window.innerHeight ? y - MODAL_HEIGHT : y;
  return { x: Math.max(margin, clampedX), y: Math.max(margin, clampedY) };
}

type Phase =
  | { kind: "search" }
  | {
      kind: "params";
      item: QuickTransformItem;
      operation: OperationDefinition;
      params: Record<string, unknown>;
      applyPerLine: boolean;
    };

interface Props {
  position: { x: number; y: number };
  textContext: QuickTransformTextContext;
  onApply: (content: string, range?: EditorRange | null) => void;
  onClose: () => void;
}

export const QuickTransformModal: React.FC<Props> = ({
  position,
  textContext,
  onApply,
  onClose,
}) => {
  const [phase, setPhase] = useState<Phase>({ kind: "search" });
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<QuickTransformItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const savedPipelinesRef = useRef<SavedPipeline[]>([]);
  const recentsRef = useRef<RecentItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const { x, y } = clampPosition(position.x, position.y);

  useEffect(() => {
    Promise.all([db.pipelines.toArray(), getRecentItems()]).then(
      ([pipelines, recents]) => {
        savedPipelinesRef.current = pipelines;
        recentsRef.current = recents;
        setIsLoaded(true);
      },
    );
  }, []);

  useEffect(() => {
    if (!isLoaded || phase.kind !== "search") return;
    const items = query
      ? searchItems(query, savedPipelinesRef.current)
      : filterByRecents(recentsRef.current, savedPipelinesRef.current);
    setResults(items);
    setSelectedIndex(0);
    setError(null);
  }, [query, isLoaded, phase.kind]);

  useEffect(() => {
    if (phase.kind === "search") {
      inputRef.current?.focus();
    }
  }, [phase.kind]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // If the target was removed from the DOM by a phase transition that our own
      // onMouseDown triggered, document.contains returns false — don't close in that case.
      if (!document.contains(target)) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const executeItem = useCallback(
    async (
      item: QuickTransformItem,
      params?: Record<string, unknown>,
      applyPerLine?: boolean,
    ) => {
      if (isExecuting) return;

      if (item.type === "operation" && params !== undefined) {
        const op = operationRegistry.getById(item.id);
        if (op) {
          const validationError = validateParams(op.parameters, params);
          if (validationError) {
            setError(validationError);
            return;
          }
        }
      }

      setIsExecuting(true);
      setError(null);

      try {
        const result = await executeQuickTransformItem(
          item,
          textContext.text,
          savedPipelinesRef.current,
          params,
          applyPerLine,
        );
        if (!result.success) {
          setError(result.error ?? "Operation failed");
          setIsExecuting(false);
          return;
        }
        await addRecentItem({ type: item.type, id: item.id });
        onApply(result.output, textContext.selectionRange);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error");
        setIsExecuting(false);
      }
    },
    [isExecuting, textContext, onApply, onClose],
  );

  const selectItem = useCallback(
    (item: QuickTransformItem) => {
      if (item.type === "pipeline") {
        executeItem(item);
        return;
      }

      const op = operationRegistry.getById(item.id);
      const needsForm =
        op && (op.parameters.length > 0 || op.processingMode === "configurable");

      if (!needsForm) {
        executeItem(item);
        return;
      }

      setError(null);
      setPhase({
        kind: "params",
        item,
        operation: op,
        params: buildInitialParams(op.parameters),
        applyPerLine: false,
      });
    },
    [executeItem],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (results.length ? (i + 1) % results.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) =>
          results.length ? (i - 1 + results.length) % results.length : 0,
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = results[selectedIndex];
        if (item) selectItem(item);
      }
    },
    [results, selectedIndex, selectItem, onClose],
  );

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Quick Transform"
      style={{ position: "fixed", left: x, top: y, width: MODAL_WIDTH, zIndex: 9999 }}
      className="bg-surface border border-base rounded-lg shadow-xl overflow-hidden flex flex-col"
    >
      {phase.kind === "search" ? (
        <>
          <div className="px-3 pt-2.5 pb-1.5 border-b border-base">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search operations and pipelines…"
              disabled={isExecuting}
              className="w-full bg-transparent text-sm text-main placeholder:text-muted outline-none"
              aria-label="Search operations"
              data-testid="quick-transform-search"
            />
          </div>

          <div role="listbox" aria-label="Results" className="py-1">
            {!isLoaded && (
              <p className="px-3 py-2 text-xs text-muted">Loading…</p>
            )}
            {isLoaded && results.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted">
                {query ? "No results" : "No recent transforms"}
              </p>
            )}
            {isLoaded &&
              results.map((item, index) => (
                <QuickTransformResultItem
                  key={`${item.type}:${item.id}`}
                  item={item}
                  isSelected={index === selectedIndex}
                  onSelect={() => setSelectedIndex(index)}
                  onExecute={() => selectItem(item)}
                />
              ))}
          </div>

          {error ? (
            <div className="px-3 py-1.5 border-t border-base">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          ) : (
            <div className="px-3 py-1 border-t border-base flex items-center justify-between">
              <span className="text-xs text-muted">
                {textContext.isSelection ? "Selection" : "Full content"}
              </span>
              <span className="text-xs text-muted">↑↓ navigate · ↵ apply</span>
            </div>
          )}
        </>
      ) : (
        <QuickTransformParamsForm
          item={phase.item}
          operation={phase.operation}
          params={phase.params}
          onParamsChange={(updated) =>
            setPhase((p) => (p.kind === "params" ? { ...p, params: updated } : p))
          }
          applyPerLine={phase.applyPerLine}
          onApplyPerLineChange={(value) =>
            setPhase((p) => (p.kind === "params" ? { ...p, applyPerLine: value } : p))
          }
          onExecute={() =>
            phase.kind === "params" &&
            executeItem(phase.item, phase.params, phase.applyPerLine)
          }
          onBack={() => {
            setError(null);
            setPhase({ kind: "search" });
          }}
          isExecuting={isExecuting}
          error={error}
        />
      )}
    </div>
  );
};
