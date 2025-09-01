import React from 'react';
import { 
  Download, 
  Copy, 
  RefreshCw, 
  Settings, 
  FileDown,
  Code,
  Palette,
  BookOpen
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
  exportSettings: ExportSettings;
  onExportSettingsChange: (settings: Partial<ExportSettings>) => void;
  statistics?: {
    totalElements: number;
    codeLines: number;
    codeSize: number;
  } | null;
}

const THEMES: { value: MermaidTheme; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'base', label: 'Base' },
  { value: 'neutral', label: 'Neutral' }
];

export const Toolbar: React.FC<ToolbarProps> = ({
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
  statistics
}) => {
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showThemeMenu, setShowThemeMenu] = React.useState(false);

  const ToolbarButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
  }> = ({ onClick, disabled = false, title, children, variant = 'secondary' }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
        ${variant === 'primary' 
          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
          : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
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
          title="Optimize diagram code"
          variant="primary"
        >
          {isOptimizing ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Settings size={16} />
          )}
          <span>{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>
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
        <div className="flex items-center space-x-4 text-xs text-gray-400">
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
            <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 min-w-[120px]">
              {THEMES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    onThemeChange(value);
                    setShowThemeMenu(false);
                  }}
                  className={`
                    w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors
                    ${theme === value ? 'bg-gray-700 text-blue-400' : 'text-gray-200'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy actions */}
        <ToolbarButton
          onClick={onCopyCode}
          title="Copy diagram code to clipboard"
        >
          <Copy size={16} />
          <span>Copy Code</span>
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
            <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 min-w-[140px]">
              <button
                onClick={() => {
                  onExportSvg();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors text-gray-200 flex items-center space-x-2"
              >
                <FileDown size={14} />
                <span>Export as SVG</span>
              </button>
              <button
                onClick={() => {
                  onExportPng();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors text-gray-200 flex items-center space-x-2"
              >
                <FileDown size={14} />
                <span>Export as PNG</span>
              </button>
              <div className="border-t border-gray-700 my-1"></div>
              <button
                onClick={() => {
                  onCopyOptimized();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors text-gray-200 flex items-center space-x-2"
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
};