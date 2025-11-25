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
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-success';
      case 'POST': return 'text-info';
      case 'PUT': return 'text-warning';
      case 'DELETE': return 'text-danger';
      case 'PATCH': return 'text-primary';
      default: return 'text-secondary';
    }
  };

  return (
    <div className="border-b border-base bg-surface-secondary p-4">
      <div className="flex items-center justify-between">
        {/* Document info */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Terminal size={20} className="text-info" />
            <h2 className="text-lg font-semibold text-main">
              Curl Request Workbench
            </h2>
          </div>

          {/* Summary stats */}
          <div className="flex items-center space-x-4 text-sm text-secondary">
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
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showOptionsPalette
              ? 'bg-primary text-white'
              : 'bg-element text-main hover:bg-element-hover'
              }`}
            title="Toggle options palette"
          >
            <Palette size={16} />
            <span>Options</span>
          </button>

          <button
            onClick={onAddCommand}
            className="flex items-center space-x-2 px-3 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            <span>Add Command</span>
          </button>
        </div>
      </div>

      {/* Domain list (if multiple) */}
      {summary.domains.length > 1 && (
        <div className="mt-3 pt-3 border-t border-base/50">
          <div className="flex items-center space-x-2 text-xs text-muted">
            <span>Domains:</span>
            <div className="flex flex-wrap gap-1">
              {summary.domains.map((domain, index) => (
                <span
                  key={domain}
                  className="px-2 py-1 bg-element rounded text-secondary"
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