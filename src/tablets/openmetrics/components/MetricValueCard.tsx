import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { MetricSample } from '../types';
import { formatNumber, formatLabelsForDisplay } from '../utils';

interface MetricValueCardProps {
  metric: MetricSample;
  comparison?: {
    value: number;
    percentChange: number;
  };
}

export const MetricValueCard: React.FC<MetricValueCardProps> = ({ metric, comparison }) => {
  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="font-medium text-sm mb-2 truncate">{metric.name}</div>
      
      {Object.keys(metric.labels).length > 0 && (
        <div className="text-xs text-gray-400 mb-3 font-mono">
          {formatLabelsForDisplay(metric.labels)}
        </div>
      )}
      
      <div className="text-2xl font-semibold text-blue-400 mb-2">
        {formatNumber(metric.value)}
      </div>
      
      {comparison && (
        <div className={`flex items-center text-xs ${
          comparison.percentChange > 0 
            ? 'text-green-400' 
            : comparison.percentChange < 0 
              ? 'text-red-400' 
              : 'text-gray-400'
        }`}>
          {comparison.percentChange > 0 ? (
            <ArrowUp size={12} className="mr-1" />
          ) : comparison.percentChange < 0 ? (
            <ArrowDown size={12} className="mr-1" />
          ) : null}
          
          <span>
            {comparison.percentChange > 0 ? '+' : ''}
            {comparison.percentChange.toFixed(2)}% from {formatNumber(comparison.value)}
          </span>
        </div>
      )}
      
      {metric.timestamp && (
        <div className="text-xs text-gray-500 mt-2">
          Timestamp: {new Date(metric.timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};