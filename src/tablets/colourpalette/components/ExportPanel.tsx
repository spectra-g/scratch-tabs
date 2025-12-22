import React, { useState } from 'react';
import { Copy, Download, Check, FileCode, ExternalLink } from '../../../components/Icons';
import { ColorInfo, ExportFormat } from '../types';
import {
  generateCssVariables,
  generateScssVariables,
  generateTailwindConfig,
  generateJsonArray
} from '../utils/colourUtils';

interface ExportPanelProps {
  colors: ColorInfo[];
  onCreateNewTab?: (content: string, language: string, title: string) => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  colors,
  onCreateNewTab,
}) => {
  const [selectedFormat, setSelectedFormat] = useState('css');
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const exportFormats: ExportFormat[] = [
    {
      name: 'CSS Variables',
      extension: 'css',
      generator: generateCssVariables,
    },
    {
      name: 'SCSS Variables',
      extension: 'scss',
      generator: generateScssVariables,
    },
    {
      name: 'Tailwind Config',
      extension: 'js',
      generator: generateTailwindConfig,
    },
    {
      name: 'JSON Array',
      extension: 'json',
      generator: generateJsonArray,
    },
  ];

  const currentFormat = exportFormats.find(f => f.extension === selectedFormat) || exportFormats[0];
  const generatedCode = currentFormat.generator(colors);

  const handleCopy = async (format: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch {
      // Silently fail if clipboard access is denied
    }
  };

  const handleDownload = (format: ExportFormat, code: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `color-palette.${format.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateTab = () => {
    if (onCreateNewTab) {
      const language = selectedFormat === 'js' ? 'javascript' : selectedFormat;
      onCreateNewTab(generatedCode, language, `Colour Palette - ${currentFormat.name}`);
    }
  };

  const getLanguageForFormat = (extension: string): string => {
    switch (extension) {
      case 'css':
      case 'scss':
        return 'css';
      case 'js':
        return 'javascript';
      case 'json':
        return 'json';
      default:
        return 'plaintext';
    }
  };

  if (colors.length === 0) {
    return (
      <div className="text-center py-8">
        <FileCode size={32} className="text-secondary mx-auto mb-2" />
        <p className="text-sm text-secondary">Generate a palette to see export options</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-main">Export Palette</h3>
        <div className="text-xs text-secondary">{colors.length} colors</div>
      </div>

      {/* Format Selection */}
      <div className="grid grid-cols-2 gap-2">
        {exportFormats.map((format) => (
          <button
            key={format.extension}
            onClick={() => setSelectedFormat(format.extension)}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${selectedFormat === format.extension
                ? 'bg-primary text-white'
                : 'bg-element text-secondary hover:bg-element-hover'
              }`}
          >
            {format.name}
          </button>
        ))}
      </div>

      {/* Code Preview */}
      <div className="relative">
        <pre className="bg-surface-secondary border border-base rounded-lg p-3 text-xs text-main font-mono overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
          <code className={`language-${getLanguageForFormat(selectedFormat)}`}>
            {generatedCode}
          </code>
        </pre>

        {/* Copy Button Overlay */}
        <button
          onClick={() => handleCopy(selectedFormat, generatedCode)}
          className="absolute top-2 right-2 p-1.5 bg-element/80 hover:bg-element-hover rounded transition-colors"
          title="Copy to clipboard"
        >
          {copiedFormat === selectedFormat ? (
            <Check size={14} className="text-success" />
          ) : (
            <Copy size={14} className="text-secondary" />
          )}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => handleCopy(selectedFormat, generatedCode)}
          className="px-3 py-2 bg-element hover:bg-element-hover text-main rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {copiedFormat === selectedFormat ? (
            <Check size={14} className="text-success" />
          ) : (
            <Copy size={14} />
          )}
          <span>Copy</span>
        </button>

        <button
          onClick={() => handleDownload(currentFormat, generatedCode)}
          className="px-3 py-2 bg-element hover:bg-element-hover text-main rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <Download size={14} />
          <span>Download</span>
        </button>

        {onCreateNewTab && (
          <button
            onClick={handleCreateTab}
            className="px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded text-sm font-medium transition-colors flex items-center justify-center space-x-2"
            title="Create new tab with this code"
          >
            <ExternalLink size={14} />
            <span>New Tab</span>
          </button>
        )}
      </div>

      {/* Format Info */}
      <div className="text-xs text-secondary text-center">
        Ready-to-use {currentFormat.name.toLowerCase()} for your project
      </div>
    </div>
  );
};