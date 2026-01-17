/**
 * Pipeline Editor Modal
 *
 * Main container for the pipeline editing interface.
 * Three-panel layout:
 * - Left: Operation palette (categories accordion)
 * - Middle: Pipeline canvas (sortable steps)
 * - Right: Input/Output preview (stacked)
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { X, Save, FolderOpen, RotateCcw, Play, Loader2 } from "../Icons";
import { OperationPalette } from "./OperationPalette";
import { PipelineCanvas } from "./PipelineCanvas";
import { PipelinePreview } from "./PipelinePreview";
import { PipelineToolbar } from "./PipelineToolbar";
import {
  Pipeline,
  PipelineStep,
  PipelineResult,
  OperationDefinition,
} from "../../services/pipeline/types";
import {
  operationRegistry,
  runPipelineAsync,
  createStep,
} from "../../services/pipeline";
import {
  savePipeline,
  getAllPipelines,
  deletePipeline,
  toPipeline,
  SavedPipeline,
} from "../../services/pipeline/pipelineStorage";

// Ensure operations are loaded
import "../../services/pipeline/loadOperations";

interface PipelineEditorModalProps {
  initialContent: string;
  onApply: (content: string) => void;
  onClose: () => void;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const PipelineEditorModal: React.FC<PipelineEditorModalProps> = ({
  initialContent,
  onApply,
  onClose,
}) => {
  // Pipeline state
  const [pipeline, setPipeline] = useState<Pipeline>({
    id: generateUUID(),
    name: null,
    steps: [],
  });

  // Input/output state
  const [input, setInput] = useState(initialContent);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Saved pipelines state
  const [savedPipelines, setSavedPipelines] = useState<SavedPipeline[]>([]);
  const [showSavedPipelines, setShowSavedPipelines] = useState(false);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");

  // Refs for click-outside detection
  const loadDropdownRef = useRef<HTMLDivElement>(null);
  const saveDropdownRef = useRef<HTMLDivElement>(null);

  // Force re-render when registry changes
  const [, setRegistryVersion] = useState(0);

  // Subscribe to registry changes
  useEffect(() => {
    const unsubscribe = operationRegistry.subscribe(() => {
      setRegistryVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Load saved pipelines on mount
  useEffect(() => {
    getAllPipelines().then(setSavedPipelines);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        loadDropdownRef.current &&
        !loadDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSavedPipelines(false);
      }
      if (
        saveDropdownRef.current &&
        !saveDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSaveInput(false);
      }
    };

    if (showSavedPipelines || showSaveInput) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSavedPipelines, showSaveInput]);

  // Run pipeline whenever input or steps change
  useEffect(() => {
    if (pipeline.steps.length === 0) {
      setResult(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsRunning(true);
      try {
        const pipelineResult = await runPipelineAsync(input, pipeline);
        setResult(pipelineResult);
      } catch (error) {
        setResult({
          success: false,
          output: input,
          error: error instanceof Error ? error.message : String(error),
          stepResults: [],
          totalDuration: 0,
          variables: {},
        });
      } finally {
        setIsRunning(false);
      }
    }, 150); // Debounce

    return () => clearTimeout(timeoutId);
  }, [input, pipeline]);

  // Add operation to pipeline
  const handleAddOperation = useCallback((operation: OperationDefinition) => {
    const step = createStep(operation.id);
    setPipeline((prev) => ({
      ...prev,
      steps: [...prev.steps, step],
    }));
  }, []);

  // Update step
  const handleUpdateStep = useCallback(
    (stepId: string, updates: Partial<PipelineStep>) => {
      setPipeline((prev) => ({
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === stepId ? { ...step, ...updates } : step,
        ),
      }));
    },
    [],
  );

  // Remove step
  const handleRemoveStep = useCallback((stepId: string) => {
    setPipeline((prev) => ({
      ...prev,
      steps: prev.steps.filter((step) => step.id !== stepId),
    }));
  }, []);

  // Reorder steps
  const handleReorderSteps = useCallback((newSteps: PipelineStep[]) => {
    setPipeline((prev) => ({
      ...prev,
      steps: newSteps,
    }));
  }, []);

  // Reset pipeline
  const handleReset = useCallback(() => {
    setPipeline({
      id: generateUUID(),
      name: null,
      steps: [],
    });
    setResult(null);
  }, []);

  // Open save dialog
  const handleSaveClick = useCallback(() => {
    if (pipeline.steps.length === 0) return;
    setSaveName(pipeline.name || "");
    setShowSaveInput(true);
  }, [pipeline.name, pipeline.steps.length]);

  // Save pipeline with name
  const handleSaveConfirm = useCallback(async () => {
    const name = saveName.trim();
    if (!name || pipeline.steps.length === 0) return;

    const updatedPipeline = { ...pipeline, name };
    await savePipeline(updatedPipeline);
    setPipeline(updatedPipeline);

    // Refresh saved pipelines list
    const updated = await getAllPipelines();
    setSavedPipelines(updated);
    setShowSaveInput(false);
    setSaveName("");
  }, [pipeline, saveName]);

  // Load pipeline
  const handleLoad = useCallback((saved: SavedPipeline) => {
    const loaded = toPipeline(saved);
    setPipeline(loaded);
    setShowSavedPipelines(false);
  }, []);

  // Delete saved pipeline
  const handleDeleteSaved = useCallback(async (id: string) => {
    await deletePipeline(id);
    const updated = await getAllPipelines();
    setSavedPipelines(updated);
  }, []);

  // Apply result to editor
  const handleApply = useCallback(() => {
    if (result?.success && result.output !== input) {
      onApply(result.output);
      onClose();
    }
  }, [result, input, onApply, onClose]);

  // Compute if there are changes
  const hasChanges = useMemo(() => {
    return result?.success && result.output !== input;
  }, [result, input]);

  // Output for preview
  const output = result?.output || input;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-2xl w-[95vw] h-[90vh] max-w-[1800px] flex flex-col border border-base"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base bg-surface">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Play className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-medium text-main">Pipeline Editor</h2>
            </div>
            {pipeline.name && (
              <span className="text-sm text-main bg-element px-2 py-1 rounded">
                {pipeline.name}
              </span>
            )}
            {isRunning && (
              <Loader2 className="w-4 h-4 text-secondary animate-spin" />
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Load Button */}
            <div className="relative" ref={loadDropdownRef}>
              <button
                onClick={() => setShowSavedPipelines(!showSavedPipelines)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-surface-highlight hover:bg-element-hover rounded text-sm text-main transition-colors focus:outline-none focus:ring-2 focus:border-focus"
                title="Load saved pipeline"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Load</span>
              </button>

              {/* Saved Pipelines Dropdown */}
              {showSavedPipelines && (
                <div className="absolute top-full right-0 mt-1 z-50 w-80 max-h-96 overflow-auto custom-scrollbar bg-surface border border-base rounded-lg shadow-xl">
                  <div className="p-3 border-b border-base">
                    <h3 className="text-sm font-medium text-main">Saved Pipelines</h3>
                  </div>
                  {savedPipelines.length === 0 ? (
                    <div className="p-4 text-sm text-muted text-center">
                      No saved pipelines
                    </div>
                  ) : (
                    <div className="divide-y divide-base">
                      {savedPipelines.map((saved) => (
                        <div
                          key={saved.id}
                          className="flex items-center justify-between p-3 hover:bg-element-hover cursor-pointer"
                          onClick={() => handleLoad(saved)}
                        >
                          <div>
                            <div className="text-sm text-main">
                              {saved.name || "Unnamed Pipeline"}
                            </div>
                            <div className="text-xs text-muted">
                              {JSON.parse(saved.steps).length} steps
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSaved(saved.id);
                            }}
                            className="p-1 text-muted hover:text-danger rounded"
                            title="Delete pipeline"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="relative" ref={saveDropdownRef}>
              <button
                onClick={handleSaveClick}
                disabled={pipeline.steps.length === 0}
                className="flex items-center space-x-1 px-3 py-1.5 bg-surface-highlight hover:bg-element-hover rounded text-sm text-main transition-colors focus:outline-none focus:ring-2 focus:border-focus disabled:opacity-50 disabled:cursor-not-allowed"
                title="Save pipeline"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>

              {/* Save Input Dropdown */}
              {showSaveInput && (
                <div className="absolute top-full right-0 mt-1 z-50 w-72 bg-surface border border-base rounded-lg shadow-xl p-3">
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Pipeline Name
                  </label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveConfirm();
                      if (e.key === "Escape") setShowSaveInput(false);
                    }}
                    placeholder="Enter pipeline name..."
                    className="w-full px-3 py-2 text-sm bg-element border border-base rounded focus:outline-none focus:border-focus text-main placeholder-muted mb-3"
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowSaveInput(false)}
                      className="px-3 py-1.5 text-sm text-secondary hover:text-main rounded hover:bg-element-hover"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveConfirm}
                      disabled={!saveName.trim()}
                      className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-3 py-1.5 bg-surface-highlight hover:bg-element-hover rounded text-sm text-main transition-colors focus:outline-none focus:ring-2 focus:border-focus"
              title="Reset pipeline"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded-full transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:border-focus"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - 3 Panel Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Operation Palette */}
          <div className="w-64 bg-surface-secondary border-r border-base flex flex-col">
            <div className="p-3 border-b border-base">
              <h3 className="text-sm font-medium text-main">Operations</h3>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
              <OperationPalette onAddOperation={handleAddOperation} />
            </div>
          </div>

          {/* Middle Panel - Pipeline Canvas */}
          <div className="w-80 bg-surface border-r border-base flex flex-col">
            <div className="p-3 border-b border-base">
              <h3 className="text-sm font-medium text-main">Pipeline Steps</h3>
              <p className="text-xs text-muted mt-1">
                {pipeline.steps.length} steps
              </p>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar p-3">
              <PipelineCanvas
                steps={pipeline.steps}
                onUpdateStep={handleUpdateStep}
                onRemoveStep={handleRemoveStep}
                onReorderSteps={handleReorderSteps}
                stepResults={result?.stepResults}
              />
            </div>
          </div>

          {/* Right Panel - Input/Output Preview */}
          <div className="flex-1 flex flex-col min-w-0 bg-surface">
            <PipelinePreview
              input={input}
              output={output}
              onInputChange={setInput}
              isRunning={isRunning}
              error={result?.error}
              stats={{
                inputLength: input.length,
                outputLength: output.length,
                duration: result?.totalDuration || 0,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-base bg-surface-secondary">
          <div className="text-sm text-muted">
            {pipeline.steps.length === 0
              ? "Add operations from the left panel to build a pipeline"
              : result?.success
                ? `Pipeline executed in ${result.totalDuration.toFixed(0)}ms`
                : result?.error
                  ? "Pipeline has errors"
                  : "Running..."}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-secondary hover:text-main bg-surface-highlight hover:bg-element-hover rounded transition-colors focus:outline-none focus:ring-2 focus:border-focus"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={!hasChanges || isRunning}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  !hasChanges || isRunning
                    ? "bg-surface-highlight text-muted cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary/90"
                }
                focus:outline-none focus:ring-2 focus:border-focus
              `}
            >
              <Play className="w-4 h-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
