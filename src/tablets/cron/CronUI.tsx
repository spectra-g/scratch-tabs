import React, { useState, useEffect } from 'react';
import { CronHeader } from './components/CronHeader';
import { CronTabs } from './components/CronTabs';
import { NaturalLanguageBuilder } from './components/NaturalLanguageBuilder';
import { SegmentedBuilder } from './components/SegmentedBuilder';
import { RawExpressionInput } from './components/RawExpressionInput';
import { ExecutionPreview } from './components/ExecutionPreview';
import { CronPatternLibrary } from './components/CronPatternLibrary';
import { CronCodeExporter } from './components/CronCodeExporter';
import { CronVisualizer } from './components/CronVisualizer';
import { useCronEngine } from './hooks/useCronEngine';
import { CronExpression, CronDialect, CronPattern, TimeZone } from './types';

interface CronUIProps {
  state: {
    expression: CronExpression;
    dialect: CronDialect;
    timezone: TimeZone;
    savedPatterns: CronPattern[];
    history: CronExpression[];
    activeTab: 'natural' | 'segmented' | 'raw';
  };
  onChange: (newState: CronUIProps['state']) => void;
}

export const CronUI: React.FC<CronUIProps> = ({ state, onChange }) => {
  const [showPatternLibrary, setShowPatternLibrary] = useState(false);
  const [showCodeExporter, setShowCodeExporter] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);

  const {
    expression,
    humanReadable,
    nextExecutions,
    validationErrors,
    updateExpression,
    updateDialect,
    updateTimezone,
    detectDialect,
    savePattern,
    deletePattern,
    exportToICS,
    exportToCSV,
    exportToJSON,
    copyAllTimes
  } = useCronEngine(state.expression, state.dialect, state.timezone, state.savedPatterns);

  // Update parent state when expression changes
  useEffect(() => {
    onChange({
      ...state,
      expression,
      dialect: state.dialect
    });
  }, [expression, state.dialect]);

  // Update expression when dialect changes
  const handleDialectChange = (dialect: CronDialect) => {
    updateDialect(dialect);
    onChange({
      ...state,
      dialect
    });
  };

  // Update timezone
  const handleTimezoneChange = (timezone: TimeZone) => {
    updateTimezone(timezone);
    onChange({
      ...state,
      timezone
    });
  };

  // Save a pattern
  const handleSavePattern = (name: string, description?: string) => {
    const newPattern = savePattern(name, description);
    onChange({
      ...state,
      savedPatterns: [...state.savedPatterns, newPattern]
    });
  };

  // Delete a pattern
  const handleDeletePattern = (id: string) => {
    deletePattern(id);
    onChange({
      ...state,
      savedPatterns: state.savedPatterns.filter(p => p.id !== id)
    });
  };

  // Load a pattern
  const handleLoadPattern = (pattern: CronPattern) => {
    updateExpression(pattern.expression);
    handleDialectChange(pattern.dialect);
    setShowPatternLibrary(false);
  };

  // Update active tab
  const handleTabChange = (tab: 'natural' | 'segmented' | 'raw') => {
    onChange({
      ...state,
      activeTab: tab
    });
  };

  return (
    <div className="h-full bg-gray-900 text-gray-200 flex flex-col overflow-hidden">
      <CronHeader 
        dialect={state.dialect}
        onDialectChange={handleDialectChange}
        timezone={state.timezone}
        onTimezoneChange={handleTimezoneChange}
        onShowPatternLibrary={() => setShowPatternLibrary(true)}
        onShowCodeExporter={() => setShowCodeExporter(true)}
        onShowVisualizer={() => setShowVisualizer(true)}
      />

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <CronTabs 
          activeTab={state.activeTab} 
          onTabChange={handleTabChange}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {state.activeTab === 'natural' && (
              <NaturalLanguageBuilder 
                expression={expression}
                dialect={state.dialect}
                onExpressionChange={updateExpression}
                validationErrors={validationErrors}
              />
            )}
            
            {state.activeTab === 'segmented' && (
              <SegmentedBuilder 
                expression={expression}
                dialect={state.dialect}
                onExpressionChange={updateExpression}
                validationErrors={validationErrors}
              />
            )}
            
            {state.activeTab === 'raw' && (
              <RawExpressionInput 
                expression={expression.raw}
                dialect={state.dialect}
                onExpressionChange={(raw) => updateExpression(raw)}
                onDialectDetect={detectDialect}
                validationErrors={validationErrors}
              />
            )}

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Human-Readable Translation</h3>
              <p className="text-gray-200">{humanReadable}</p>
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
          expression={expression.raw}
          dialect={state.dialect}
          onClose={() => setShowCodeExporter(false)}
        />
      )}

      {showVisualizer && (
        <CronVisualizer
          expression={expression.raw}
          dialect={state.dialect}
          timezone={state.timezone}
          onClose={() => setShowVisualizer(false)}
        />
      )}
    </div>
  );
};