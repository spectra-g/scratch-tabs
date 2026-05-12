import React from 'react';
import {
  Download,
  Copy,
  Check,
  RefreshCw,
  Settings,
  FileDown,
  Code,
  Palette,
  BookOpen,
  Split,
  Maximize
} from '../../../components/Icons';
import { MermaidTheme, ExportSettings } from '../types';

interface ToolbarProps {
  onExportSvg: () => void;
  onExportPng: () => void;
  onCopyCode: () => void;
  onCopyOptimized: () => void;
  onOptimize: () => void;
  onShowTemplates: () => void;
  onRefresh: () => void;
  theme: MermaidTheme;
  onThemeChange: (theme: MermaidTheme) => void;
  isRendering: boolean;
  isOptimizing: boolean;
  copyCodeSuccess?: boolean;
  optimizeSuccess?: boolean;
  exportSettings: ExportSettings;
  onExportSettingsChange: (settings: Partial<ExportSettings>) => void;
  statistics?: {
    totalElements: number;
    codeLines: number;
    codeSize: number;
  } | null;
  viewMode: 'split' | 'preview';
  onViewModeChange: (mode: 'split' | 'preview') => void;
}

const THEMES: { value: MermaidTheme; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'base', label: 'Base' },
  { value: 'neutral', label: 'Neutral' }
];

export const Toolbar: React.FC<ToolbarProps> = React.memo(({
  onExportSvg,
  onExportPng,
  onCopyCode,
  onCopyOptimized,
  onOptimize,
  onShowTemplates,
  onRefresh,
  theme,
  onThemeChange,
  isRendering,
  isOptimizing,
  copyCodeSuccess = false,
  optimizeSuccess = false,
  statistics,
  viewMode,
  onViewModeChange
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showThemeMenu, setShowThemeMenu] = React.useState(false);

  const ToolbarButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success';
  }> = ({ onClick, disabled = false, title, children, variant = 'secondary' }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
        ${variant === 'primary'
          ? 'bg-primary hover:bg-opacity-90 text-white'
          : variant === 'success'
            ? 'bg-success hover:bg-opacity-90 text-white'
            : 'bg-element hover:bg-element-hover text-main'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center justify-between p-3 bg-surface-raised border-b border-base">
      {/* Left side - Main actions */}
      <div className="flex items-center space-x-2">
        <ToolbarButton
          onClick={onShowTemplates}
          title="Browse diagram templates"
        >
          <BookOpen size={16} />
          <span>Templates</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={onOptimize}
          disabled={isOptimizing}
          title={optimizeSuccess ? "Optimized!" : "Optimize diagram code"}
          variant={optimizeSuccess ? "success" : "primary"}
        >
          {isOptimizing ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : optimizeSuccess ? (
            <Check size={16} />
          ) : (
            <Settings size={16} />
          )}
          <span>{isOptimizing ? 'Optimizing...' : optimizeSuccess ? 'Optimized!' : 'Optimize'}</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={onRefresh}
          disabled={isRendering}
          title="Force re-render diagram"
        >
          <RefreshCw size={16} className={isRendering ? 'animate-spin' : ''} />
        </ToolbarButton>
      </div>

      {/* Center - Statistics */}
      {statistics && (
        <div className="flex items-center space-x-4 text-xs text-muted">
          <span>{statistics.codeLines} lines</span>
          <span>{statistics.totalElements} elements</span>
          <span>{(statistics.codeSize / 1024).toFixed(1)}KB</span>
        </div>
      )}

      {/* Right side - Export and theme */}
      <div className="flex items-center space-x-2">
        {/* Theme selector */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            title="Change diagram theme"
          >
            <Palette size={16} />
            <span className="capitalize">{theme}</span>
          </ToolbarButton>

          {showThemeMenu && (
            <div className="absolute top-full right-0 mt-1 bg-surface border border-base rounded-md shadow-lg z-50 min-w-[120px]">
              {THEMES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    onThemeChange(value);
                    setShowThemeMenu(false);
                  }}
                  className={`
                    w-full text-left px-3 py-2 text-sm hover:bg-element-hover transition-colors
                    ${theme === value ? 'bg-element-active text-info' : 'text-main'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View mode toggle */}
        <ToolbarButton
          onClick={() => onViewModeChange(viewMode === 'split' ? 'preview' : 'split')}
          title={viewMode === 'split' ? 'Maximize diagram view' : 'Show editor and diagram'}
        >
          {viewMode === 'split' ? <Maximize size={16} /> : <Split size={16} />}
        </ToolbarButton>

        {/* Copy actions */}
        <ToolbarButton
          onClick={onCopyCode}
          title={copyCodeSuccess ? "Copied!" : "Copy diagram code to clipboard"}
          variant={copyCodeSuccess ? "success" : "secondary"}
        >
          {copyCodeSuccess ? <Check size={16} /> : <Copy size={16} />}
          <span>{copyCodeSuccess ? 'Copied!' : 'Copy Code'}</span>
        </ToolbarButton>

        {/* Export menu */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export diagram"
          >
            <Download size={16} />
            <span>Export</span>
          </ToolbarButton>

          {showExportMenu && (
            <div className="absolute top-full right-0 mt-1 bg-surface border border-base rounded-md shadow-lg z-50 min-w-[140px]">
              <button
                onClick={() => {
                  onExportSvg();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-element-hover transition-colors text-main flex items-center space-x-2"
              >
                <FileDown size={14} />
                <span>Export as SVG</span>
              </button>
              <button
                onClick={() => {
                  onExportPng();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-element-hover transition-colors text-main flex items-center space-x-2"
              >
                <FileDown size={14} />
                <span>Export as PNG</span>
              </button>
              <div className="border-t border-base my-1"></div>
              <button
                onClick={() => {
                  onCopyOptimized();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-element-hover transition-colors text-main flex items-center space-x-2"
              >
                <Code size={14} />
                <span>Copy Optimized</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click outside handlers */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        />
      )}
      {showThemeMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowThemeMenu(false)}
        />
      )}
    </div>
  );
});