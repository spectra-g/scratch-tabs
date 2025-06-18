import React from 'react';

interface FileProgress {
  file: string;
  loaded: number;
  total?: number;
  percent?: number;
  status?: string;
  completed: boolean;
  lastUpdateTime: number;
}

interface AITooltipProps {
  status: string;
  progress: number;
  error: string | null;
  position: { x: number; y: number } | null;
  visible: boolean;
  files?: Record<string, FileProgress>;
  codegenStatus?: string;
  codegenProgress?: number;
  codegenError?: string | null;
  codegenFiles?: Record<string, FileProgress>;
}

export const AITooltip: React.FC<AITooltipProps> = ({ status, progress, error, position, visible, files, codegenStatus, codegenProgress, codegenError, codegenFiles }) => {
  if (!visible || !position) {
    return null;
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translateX(-50%) translateY(-100%) translateY(-10px)', // Position above the icon
    zIndex: 100,
    pointerEvents: 'none',
  };

  // Helper to render a progress bar for a model
  const renderProgress = (label: string, status: string, progress: number, files?: Record<string, FileProgress>) => {
    // Filter files: show only non-completed or recently completed (within 10s)
    const visibleFiles = files ? Object.values(files).filter(file =>
      !file.completed || (Date.now() - file.lastUpdateTime < 10000)
    ) : [];
    return (
      <div className="mb-2 last:mb-0">
        <div className="font-semibold text-blue-300 capitalize mb-1">{label} {status}...</div>
        {visibleFiles.length > 0 ? (
          <div className="space-y-2 mt-2">
            {visibleFiles.map(file => (
              <div key={file.file} className="flex items-center space-x-2">
                <div className="flex-grow bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${file.percent || 0}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-300 whitespace-nowrap">
                  {file.percent !== undefined ? `${file.percent}%` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1.5 mb-1 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-center text-gray-400">{progress}%</div>
          </>
        )}
      </div>
    );
  };

  let content: React.ReactNode = null;
  if (error) {
    content = (
      <>
        <div className="font-semibold text-red-400">Error</div>
        <div className="text-xs mt-1 text-red-300">{error}</div>
      </>
    );
  } else if (codegenError) {
    content = (
      <>
        <div className="font-semibold text-red-400">Codegen Error</div>
        <div className="text-xs mt-1 text-red-300">{codegenError}</div>
      </>
    );
  } else if (status === 'ready' && (!codegenStatus || codegenStatus === 'ready')) {
    content = <div className="text-center font-semibold text-green-200">AI Ready</div>;
  } else {
    content = (
      <>
        {(status === 'initializing' || status === 'progress' || status === 'downloading') &&
          renderProgress('Summary Model', status, progress, files)}
        {(codegenStatus && (codegenStatus === 'initializing' || codegenStatus === 'progress' || codegenStatus === 'downloading')) &&
          renderProgress('Codegen Model', codegenStatus, codegenProgress || 0, codegenFiles)}
        {(!((status === 'initializing' || status === 'progress' || status === 'downloading') || (codegenStatus && (codegenStatus === 'initializing' || codegenStatus === 'progress' || codegenStatus === 'downloading')))) &&
          <div className="font-semibold text-gray-400 capitalize">{status || 'Initializing...'}</div>}
      </>
    );
  }

  return (
    <div
      style={style}
      className="bg-gray-900 text-gray-200 text-xs rounded-md shadow-lg border border-gray-700 whitespace-nowrap overflow-hidden min-w-[180px]"
      role="tooltip"
    >
      <div className="px-3 py-2">
        {content}
      </div>
    </div>
  );
};