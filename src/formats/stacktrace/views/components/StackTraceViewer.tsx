import React, { useState, useMemo, useCallback } from 'react';
import { SmartViewProps } from '../../../../views/registry';
import { parseStackTrace, reconstructStackTrace, getStackTraceSummary } from '../../utils/parser';
import { StackTraceToolbar } from './StackTraceToolbar';
import { FrameList } from './FrameList';
import { ErrorInfoDisplay } from './ErrorInfoDisplay';

export const StackTraceViewer: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive,
}) => {
  const [hideLibraryFrames, setHideLibraryFrames] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Parse the stack trace content
  const parsedTrace = useMemo(() => {
    try {
      return parseStackTrace(content);
    } catch (error) {
      console.error('Failed to parse stack trace:', error);
      return {
        language: 'unknown' as const,
        errorInfo: { raw: content.split('\n')[0] || '', errorMessage: 'Parse error' },
        frames: [],
      };
    }
  }, [content]);

  // Get summary statistics
  const summary = useMemo(() => getStackTraceSummary(parsedTrace), [parsedTrace]);

  // Handle copying cleaned trace
  const handleCopyCleanedTrace = useCallback(async () => {
    try {
      const cleanedTrace = reconstructStackTrace(parsedTrace, {
        includeLibraryFrames: !hideLibraryFrames,
        searchFilter,
      });
      await navigator.clipboard.writeText(cleanedTrace);
    } catch (error) {
      console.error('Failed to copy cleaned trace:', error);
    }
  }, [parsedTrace, hideLibraryFrames, searchFilter]);

  // Handle section collapse/expand
  const handleToggleSection = useCallback((sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Render a single stack trace section (main or caused by)
  const renderStackTraceSection = useCallback((
    trace: typeof parsedTrace,
    sectionId: string,
    title?: string,
    isNested: boolean = false
  ) => {
    const isCollapsed = collapsedSections.has(sectionId);
    
    return (
      <div key={sectionId} className={`${isNested ? 'ml-4 border-l-2 border-gray-600 pl-4' : ''}`}>
        {title && (
          <div className="mb-2">
            <button
              onClick={() => handleToggleSection(sectionId)}
              className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors"
            >
              <span className="text-sm font-medium">{title}</span>
              <span className="text-xs">
                {isCollapsed ? '▶' : '▼'}
              </span>
            </button>
          </div>
        )}
        
        {!isCollapsed && (
          <>
            <ErrorInfoDisplay errorInfo={trace.errorInfo} />
            <FrameList
              frames={trace.frames}
              hideLibraryFrames={hideLibraryFrames}
              searchFilter={searchFilter}
            />
          </>
        )}
        
        {/* Recursively render caused by sections */}
        {!isCollapsed && trace.causedBy && (
          <div className="mt-4">
            {renderStackTraceSection(
              trace.causedBy,
              `${sectionId}-caused-by`,
              'Caused by:',
              true
            )}
          </div>
        )}
      </div>
    );
  }, [collapsedSections, hideLibraryFrames, searchFilter, handleToggleSection]);

  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        <p>No stack trace content to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200" data-testid="stack-trace-viewer">
      {/* Toolbar */}
      <StackTraceToolbar
        hideLibraryFrames={hideLibraryFrames}
        onToggleLibraryFrames={setHideLibraryFrames}
        searchFilter={searchFilter}
        onSearchFilterChange={setSearchFilter}
        onCopyCleanedTrace={handleCopyCleanedTrace}
        summary={summary}
        language={parsedTrace.language}
      />

      {/* Main content */}
      <div className="flex-1 overflow-auto custom-scrollbar p-4">
        {renderStackTraceSection(parsedTrace, 'main')}
      </div>
    </div>
  );
};