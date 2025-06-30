import React from 'react';
import { FileText, List, GitCompare, BarChart2, Search, AlertCircle, Loader } from 'lucide-react';
import { ParseResult } from '../types';

interface TabsProps {
  activeTab: 'editor' | 'explorer' | 'diff' | 'chart' | 'query';
  onTabChange: (tab: 'editor' | 'explorer' | 'diff' | 'chart' | 'query') => void;
  parseResult: ParseResult | null;
  isLoading: boolean;
  error: string | null;
}

export const Tabs: React.FC<TabsProps> = ({
  activeTab,
  onTabChange,
  parseResult,
  isLoading,
  error
}) => {
  const tabs = [
    { id: 'editor', label: 'Editor', icon: FileText },
    { id: 'explorer', label: 'Explorer', icon: List },
    { id: 'diff', label: 'Snapshots', icon: GitCompare },
    { id: 'chart', label: 'Chart', icon: BarChart2 },
    { id: 'query', label: 'Query', icon: Search }
  ] as const;

  return (
    <div className="border-b border-gray-700 bg-gray-800">
      <div className="flex items-center">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
        
        <div className="ml-auto flex items-center px-4">
          {isLoading ? (
            <div className="flex items-center text-blue-400">
              <Loader size={14} className="animate-spin mr-2" />
              <span className="text-xs">Parsing...</span>
            </div>
          ) : error ? (
            <div className="flex items-center text-red-400">
              <AlertCircle size={14} className="mr-2" />
              <span className="text-xs">Error</span>
            </div>
          ) : parseResult ? (
            <div className="text-xs text-gray-400">
              {parseResult.stats.uniqueMetricNames} metrics, {parseResult.stats.totalMetrics} samples
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};