import React, { useState, useMemo, useCallback } from 'react';
import { SmartViewProps } from '../../../../views/registry';
import { parseDiff, ParsedDiff, reconstructDiff } from '../../utils/parser';
import { DiffToolbar } from './DiffToolbar';
import { FileNavigator } from './FileNavigator';
import { SideBySideDiffView } from './SideBySideDiffView';
import { UnifiedDiffView } from './UnifiedDiffView';

export type ViewMode = 'side-by-side' | 'unified';

export const DiffViewer: React.FC<SmartViewProps> = ({
  content,
}) => {
  // View state
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [hideWhitespaceChanges, setHideWhitespaceChanges] = useState(false);
  const [fileFilter, setFileFilter] = useState('');
  const [collapsedHunks, setCollapsedHunks] = useState<Set<string>>(new Set());

  // Parse the diff content
  const parsedDiff = useMemo<ParsedDiff>(() => {
    try {
      return parseDiff(content);
    } catch (error) {
      console.error('Failed to parse diff:', error);
      return {
        files: [],
        preamble: [],
        stats: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 }
      };
    }
  }, [content]);

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!fileFilter) return parsedDiff.files;

    const filterLower = fileFilter.toLowerCase();
    return parsedDiff.files.filter(file =>
      file.fileName.toLowerCase().includes(filterLower) ||
      file.originalPath.toLowerCase().includes(filterLower) ||
      file.newPath.toLowerCase().includes(filterLower)
    );
  }, [parsedDiff.files, fileFilter]);

  // Get currently selected file
  const selectedFile = useMemo(() => {
    if (!selectedFileId) return null;
    return parsedDiff.files.find(file => file.id === selectedFileId) || null;
  }, [parsedDiff.files, selectedFileId]);

  // Auto-select first file when files change
  React.useEffect(() => {
    if (filteredFiles.length > 0 && !selectedFileId) {
      setSelectedFileId(filteredFiles[0].id);
    } else if (filteredFiles.length === 0) {
      setSelectedFileId(null);
    } else if (selectedFileId && !filteredFiles.find(f => f.id === selectedFileId)) {
      setSelectedFileId(filteredFiles[0].id);
    }
  }, [filteredFiles, selectedFileId]);

  // Handle file selection
  const handleFileSelect = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, []);

  // Handle hunk collapse toggle
  const handleToggleHunk = useCallback((hunkId: string) => {
    setCollapsedHunks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hunkId)) {
        newSet.delete(hunkId);
      } else {
        newSet.add(hunkId);
      }
      return newSet;
    });
  }, []);

  // Handle copy functionality
  const handleCopyDiff = useCallback(async () => {
    try {
      const filteredDiff = {
        ...parsedDiff,
        files: filteredFiles
      };

      const reconstructed = reconstructDiff(filteredDiff, {
        hideWhitespaceChanges,
        includeHunk: (hunk) => !collapsedHunks.has(hunk.id)
      });

      await navigator.clipboard.writeText(reconstructed);
    } catch (error) {
      console.error('Failed to copy diff:', error);
    }
  }, [parsedDiff, filteredFiles, hideWhitespaceChanges, collapsedHunks]);

  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full bg-canvas text-secondary">
        <p>No diff content to display</p>
      </div>
    );
  }

  if (parsedDiff.files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-canvas text-secondary">
        <div className="text-center">
          <p className="mb-2">No valid diff found</p>
          <p className="text-sm">Make sure the content is a valid unified diff format</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-canvas text-main" data-testid="diff-viewer">
      {/* Toolbar */}
      <DiffToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hideWhitespaceChanges={hideWhitespaceChanges}
        onToggleWhitespaceChanges={setHideWhitespaceChanges}
        fileFilter={fileFilter}
        onFileFilterChange={setFileFilter}
        onCopyDiff={handleCopyDiff}
        parsedDiff={parsedDiff}
        filteredFiles={filteredFiles}
      />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* File Navigator */}
        <div className="w-80 border-r border-base flex flex-col">
          <FileNavigator
            files={filteredFiles}
            selectedFileId={selectedFileId}
            onFileSelect={handleFileSelect}
          />
        </div>

        {/* Diff Content */}
        <div className="flex-1 min-w-0">
          {selectedFile ? (
            viewMode === 'side-by-side' ? (
              <SideBySideDiffView
                file={selectedFile}
                hideWhitespaceChanges={hideWhitespaceChanges}
                collapsedHunks={collapsedHunks}
                onToggleHunk={handleToggleHunk}
              />
            ) : (
              <UnifiedDiffView
                file={selectedFile}
                hideWhitespaceChanges={hideWhitespaceChanges}
                collapsedHunks={collapsedHunks}
                onToggleHunk={handleToggleHunk}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-secondary">
              <p>Select a file to view its changes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};