import React, { useState, useEffect, useCallback, useRef } from "react";
import { CronHeader } from "./components/CronHeader";
import { CronTabs } from "./components/CronTabs";
import { NaturalLanguageBuilder } from "./components/NaturalLanguageBuilder";
import { SegmentedBuilder } from "./components/SegmentedBuilder";
import { RawExpressionInput } from "./components/RawExpressionInput";
import { ExecutionPreview } from "./components/ExecutionPreview";
import { CronPatternLibrary } from "./components/CronPatternLibrary";
import { CronCodeExporter } from "./components/CronCodeExporter";
import { CronVisualizer } from "./components/CronVisualizer";
import { useCronEngine } from "./hooks/useCronEngine";
import { CronExpression, CronDialect, CronPattern, TimeZone } from "./types";

interface CronUIProps {
  state: {
    expression: CronExpression;
    dialect: CronDialect;
    timezone: TimeZone;
    savedPatterns: CronPattern[];
    history: CronExpression[];
    activeTab: "natural" | "segmented" | "raw";
  };
  onChange: (newState: CronUIProps["state"]) => void;
}

export const CronUI: React.FC<CronUIProps> = ({ state, onChange }) => {
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [showCodeExporter, setShowCodeExporter] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);

  const {
    humanReadable,
    nextExecutions,
    validationErrors,
    updateExpression,
    updateDialect,
    detectDialect,
    savePattern,
    deletePattern,
    exportToICS,
    exportToCSV,
    exportToJSON,
    copyAllTimes,
  } = useCronEngine(
    state.expression,
    state.dialect,
    state.timezone,
    state.savedPatterns,
  );

  // Handle expression changes from user input
  const handleExpressionChange = useCallback(
    (newExpression: string | CronExpression) => {
      const updatedExpression = updateExpression(newExpression);
      onChange({
        ...state,
        expression: updatedExpression,
      });
    },
    [state, onChange, updateExpression],
  );

  // Update expression when dialect changes
  const handleDialectChange = useCallback(
    (newDialect: CronDialect) => {
      const convertedExpression = updateDialect(newDialect);
      onChange({
        ...state,
        dialect: newDialect,
        expression: convertedExpression,
      });
    },
    [state, onChange, updateDialect],
  );

  // Update timezone
  const handleTimezoneChange = useCallback(
    (timezone: TimeZone) => {
      onChange({
        ...state,
        timezone,
      });
    },
    [state, onChange],
  );

  // Save a pattern
  const handleSavePattern = useCallback(
    (name: string, description?: string) => {
      const newPattern = savePattern(name, description);
      onChange({
        ...state,
        savedPatterns: [...state.savedPatterns, newPattern],
      });
    },
    [state, onChange, savePattern],
  );

  // Delete a pattern
  const handleDeletePattern = useCallback(
    (id: string) => {
      deletePattern(id);
      onChange({
        ...state,
        savedPatterns: state.savedPatterns.filter((p) => p.id !== id),
      });
    },
    [state, onChange, deletePattern],
  );

  // Load a pattern
  const handleLoadPattern = useCallback(
    (pattern: CronPattern) => {
      const newExpression = updateExpression(pattern.expression);
      const convertedExpression = updateDialect(pattern.dialect);
      onChange({
        ...state,
        expression: convertedExpression,
        dialect: pattern.dialect,
      });
      setShowPatternLibrary(false);
    },
    [state, onChange, updateExpression, updateDialect],
  );

  // Update active tab
  const handleTabChange = useCallback(
    (tab: "natural" | "segmented" | "raw") => {
      onChange({
        ...state,
        activeTab: tab,
      });
    },
    [state, onChange],
  );

  return (
    <div className="h-full bg-surface text-main flex flex-col overflow-hidden">
      <CronHeader
        dialect={state.dialect}
        onDialectChange={handleDialectChange}
        timezone={state.timezone}
        onTimezoneChange={handleTimezoneChange}
        onShowPatternLibrary={() => setShowPatternLibrary(true)}
        onShowCodeExporter={() => setShowCodeExporter(true)}
        onShowVisualizer={() => setShowVisualizer(true)}
      />

      <div className="flex-1 overflow-auto p-4 space-y-6 custom-scrollbar">
        <CronTabs activeTab={state.activeTab} onTabChange={handleTabChange} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {state.activeTab === "natural" && (
              <NaturalLanguageBuilder
                expression={state.expression}
                dialect={state.dialect}
                onExpressionChange={handleExpressionChange}
                validationErrors={validationErrors}
              />
            )}

            {state.activeTab === "segmented" && (
              <SegmentedBuilder
                expression={state.expression}
                dialect={state.dialect}
                onExpressionChange={handleExpressionChange}
                validationErrors={validationErrors}
              />
            )}

            {state.activeTab === "raw" && (
              <RawExpressionInput
                expression={state.expression.raw}
                dialect={state.dialect}
                onExpressionChange={(raw) => handleExpressionChange(raw)}
                onDialectDetect={detectDialect}
                validationErrors={validationErrors}
              />
            )}

            <div className="bg-surface-secondary rounded-lg p-4 border border-base">
              <h3 className="text-sm font-medium text-secondary mb-2">
                Human-Readable Translation
              </h3>
              <p className="text-main">{humanReadable}</p>
            </div>
          </div>

          <div>
            <ExecutionPreview
              executions={nextExecutions}
              timezone={state.timezone}
              onExportToICS={exportToICS}
              onExportToCSV={exportToCSV}
              onExportToJSON={exportToJSON}
              onCopyAllTimes={copyAllTimes}
            />
          </div>
        </div>
      </div>

      {showPatternLibrary && (
        <CronPatternLibrary
          patterns={state.savedPatterns}
          onClose={() => setShowPatternLibrary(false)}
          onSavePattern={handleSavePattern}
          onDeletePattern={handleDeletePattern}
          onLoadPattern={handleLoadPattern}
        />
      )}

      {showCodeExporter && (
        <CronCodeExporter
          expression={state.expression.raw}
          dialect={state.dialect}
          onClose={() => setShowCodeExporter(false)}
        />
      )}

      {showVisualizer && (
        <CronVisualizer
          expression={state.expression.raw}
          dialect={state.dialect}
          timezone={state.timezone}
          onClose={() => setShowVisualizer(false)}
        />
      )}
    </div>
  );
};
