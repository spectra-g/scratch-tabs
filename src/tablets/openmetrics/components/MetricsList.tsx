import React from 'react';
import { MetricCard } from './MetricCard';
import { ParsedMetric, MetricTypeInfo } from '../types';

interface MetricsListProps {
  parsedMetrics: ParsedMetric[];
  onSelectMetric: (metricName: string) => void;
}

export const MetricsList: React.FC<MetricsListProps> = ({ parsedMetrics, onSelectMetric }) => {
  // Group metrics by type
  const metricsByType = React.useMemo(() => {
    const grouped: Record<string, MetricTypeInfo[]> = {
      counter: [],
      gauge: [],
      histogram: [],
      summary: [],
      untyped: []
    };
    
    parsedMetrics.forEach(metric => {
      const type = metric.type || 'untyped';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      
      grouped[type].push({
        name: metric.name,
        type,
        help: metric.help,
        count: metric.samples.length
      });
    });
    
    // Sort each group by name
    Object.keys(grouped).forEach(type => {
      grouped[type].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    return grouped;
  }, [parsedMetrics]);

  return (
    <div>
      {Object.entries(metricsByType)
        .filter(([_, metrics]) => metrics.length > 0)
        .map(([type, metrics]) => (
          <div key={type} className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3 capitalize">
              {type} Metrics ({metrics.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map(metricInfo => {
                const samples = parsedMetrics.find(m => m.name === metricInfo.name)?.samples || [];
                return (
                  <MetricCard
                    key={metricInfo.name}
                    metricInfo={metricInfo}
                    samples={samples}
                    onSelect={() => onSelectMetric(metricInfo.name)}
                  />
                );
              })}
            </div>
          </div>
        ))}
    </div>
  );
};