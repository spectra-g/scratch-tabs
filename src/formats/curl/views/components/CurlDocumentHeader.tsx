import React from 'react';
import { Plus, Palette, BarChart3, Terminal } from '../../../../components/Icons';

interface CurlDocumentHeaderProps {
  summary: {
    totalCommands: number;
    methods: Record<string, number>;
    domains: string[];
  };
  onAddCommand: () => void;
  onToggleOptionsPalette: () => void;
  showOptionsPalette: boolean;
}

export const CurlDocumentHeader: React.FC<CurlDocumentHeaderProps> = ({
  summary,
  onAddCommand,
  onToggleOptionsPalette,
  showOptionsPalette,
}) => {
  // Get method color
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-green-400';
      case 'POST': return 'text-blue-400';
      case 'PUT': return 'text-yellow-400';
      case 'DELETE': return 'text-red-400';
      case 'PATCH': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="border-b border-gray-700 bg-gray-800/50 p-4">
      <div className="flex items-center justify-between">
        {/* Document info */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Terminal size={20} className="text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-200">
              cURL Request Workbench
            </h2>
          </div>

          {/* Summary stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <BarChart3 size={14} />
              <span>{summary.totalCommands} commands</span>
            </div>
            
            {/* Method breakdown */}
            {Object.entries(summary.methods).map(([method, count]) => (
              <span key={method} className={`${getMethodColor(method)} font-medium`}>
                {count} {method}
              </span>
            ))}
            
            {/* Domain count */}
            {summary.domains.length > 0 && (
              <span>
                {summary.domains.length} domain{summary.domains.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleOptionsPalette}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOptionsPalette
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Toggle options palette"
          >
            <Palette size={16} />
            <span>Options</span>
          </button>
          
          <button
            onClick={onAddCommand}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            <span>Add Command</span>
          </button>
        </div>
      </div>

      {/* Domain list (if multiple) */}
      {summary.domains.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Domains:</span>
            <div className="flex flex-wrap gap-1">
              {summary.domains.map((domain, index) => (
                <span
                  key={domain}
                  className="px-2 py-1 bg-gray-700/50 rounded text-gray-400"
                >
                  {domain}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};