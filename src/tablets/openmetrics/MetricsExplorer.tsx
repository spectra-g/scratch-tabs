import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, BarChart, Hash, Clock, Tag, Info } from 'lucide-react';
import { ParsedMetric, MetricSample } from './types';

interface MetricsExplorerProps {
  parsedMetrics: ParsedMetric[];
  onSelectMetric: (metricName: string, labels?: Record<string, string>) => void;
}

export const MetricsExplorer: React.FC<MetricsExplorerProps> = ({
  parsedMetrics,
  onSelectMetric
}) => {
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Group metrics by type
  const metricsByType = useMemo(() => {
    const grouped: Record<string, ParsedMetric[]> = {
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
      grouped[type].push(metric);
    });
    
    return grouped;
  }, [parsedMetrics]);

  // Filter metrics by search term
  const filteredMetrics = useMemo(() => {
    if (!searchTerm) return parsedMetrics;
    
    const term = searchTerm.toLowerCase();
    return parsedMetrics.filter(metric => 
      metric.name.toLowerCase().includes(term) || 
      metric.help?.toLowerCase().includes(term) ||
      metric.samples.some(sample => 
        Object.entries(sample.labels).some(([key, value]) => 
          key.toLowerCase().includes(term) || value.toLowerCase().includes(term)
        )
      )
    );
  }, [parsedMetrics, searchTerm]);

  const toggleMetricExpanded = (metricName: string) => {
    setExpandedMetrics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(metricName)) {
        newSet.delete(metricName);
      } else {
        newSet.add(metricName);
      }
      return newSet;
    });
  };

  const toggleLabelExpanded = (labelKey: string) => {
    setExpandedLabels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(labelKey)) {
        newSet.delete(labelKey);
      } else {
        newSet.add(labelKey);
      }
      return newSet;
    });
  };

  // Get unique label keys for a metric
  const getUniqueLabels = (samples: MetricSample[]): string[] => {
    const labelKeys = new Set<string>();
    samples.forEach(sample => {
      Object.keys(sample.labels).forEach(key => labelKeys.add(key));
    });
    return Array.from(labelKeys).sort();
  };

  // Get unique values for a label key
  const getLabelValues = (samples: MetricSample[], labelKey: string): string[] => {
    const values = new Set<string>();
    samples.forEach(sample => {
      if (sample.labels[labelKey] !== undefined) {
        values.add(sample.labels[labelKey]);
      }
    });
    return Array.from(values).sort();
  };

  // Render metrics grouped by type
  const renderMetricsByType = () => {
    return Object.entries(metricsByType)
      .filter(([_, metrics]) => metrics.length > 0)
      .map(([type, metrics]) => (
        <div key={type} className="mb-4">
          <div className="text-sm font-medium text-gray-300 mb-2 flex items-center">
            <TypeIcon type={type} />
            <span className="capitalize ml-1">{type}</span>
            <span className="text-gray-500 ml-2">({metrics.length})</span>
          </div>
          <div className="space-y-1 pl-2">
            {metrics.map(metric => renderMetric(metric))}
          </div>
        </div>
      ));
  };

  // Render filtered metrics (flat list)
  const renderFilteredMetrics = () => {
    return (
      <div className="space-y-1">
        {filteredMetrics.map(metric => renderMetric(metric))}
      </div>
    );
  };

  // Render a single metric with its samples
  const renderMetric = (metric: ParsedMetric) => {
    const isExpanded = expandedMetrics.has(metric.name);
    const uniqueLabels = getUniqueLabels(metric.samples);
    
    return (
      <div key={metric.name} className="mb-2">
        <div 
          className="flex items-center py-1 px-2 hover:bg-gray-800 rounded cursor-pointer"
          onClick={() => toggleMetricExpanded(metric.name)}
        >
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-400 mr-1" />
          ) : (
            <ChevronRight size={16} className="text-gray-400 mr-1" />
          )}
          <span className="text-sm font-mono">{metric.name}</span>
          <span className="text-xs text-gray-500 ml-2">({metric.samples.length})</span>
          <TypeBadge type={metric.type} />
        </div>
        
        {isExpanded && (
          <div className="pl-6 mt-1 space-y-1">
            {metric.help && (
              <div className="flex items-start text-xs text-gray-400 mb-1">
                <Info size={12} className="text-gray-500 mr-1 mt-0.5 flex-shrink-0" />
                <span>{metric.help}</span>
              </div>
            )}
            
            {uniqueLabels.length > 0 ? (
              <div className="space-y-1">
                {uniqueLabels.map(labelKey => renderLabelGroup(metric, labelKey))}
              </div>
            ) : (
              <div 
                className="text-xs text-gray-400 py-1 px-2 hover:bg-gray-800 rounded cursor-pointer"
                onClick={() => onSelectMetric(metric.name)}
              >
                <span className="font-mono">{metric.name}</span>
                <span className="ml-2">{metric.samples[0]?.value}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render a group of samples with the same label key
  const renderLabelGroup = (metric: ParsedMetric, labelKey: string) => {
    const isExpanded = expandedLabels.has(`${metric.name}:${labelKey}`);
    const labelValues = getLabelValues(metric.samples, labelKey);
    
    return (
      <div key={`${metric.name}:${labelKey}`}>
        <div 
          className="flex items-center py-1 px-2 hover:bg-gray-800 rounded cursor-pointer"
          onClick={() => toggleLabelExpanded(`${metric.name}:${labelKey}`)}
        >
          {isExpanded ? (
            <ChevronDown size={14} className="text-gray-400 mr-1" />
          ) : (
            <ChevronRight size={14} className="text-gray-400 mr-1" />
          )}
          <Tag size={12} className="text-gray-500 mr-1" />
          <span className="text-xs font-mono">{labelKey}</span>
          <span className="text-xs text-gray-500 ml-2">({labelValues.length})</span>
        </div>
        
        {isExpanded && (
          <div className="pl-6 space-y-0.5">
            {labelValues.map(value => {
              // Find samples with this label value
              const samples = metric.samples.filter(s => s.labels[labelKey] === value);
              
              return samples.map(sample => (
                <div 
                  key={`${metric.name}:${labelKey}:${value}:${JSON.stringify(sample.labels)}`}
                  className="text-xs py-1 px-2 hover:bg-gray-800 rounded cursor-pointer"
                  onClick={() => onSelectMetric(metric.name, sample.labels)}
                >
                  <div className="flex items-center">
                    <span className="font-mono text-blue-400">{value}</span>
                    <span className="ml-2 text-gray-300">{sample.value}</span>
                    {sample.timestamp && (
                      <span className="ml-2 text-gray-500 flex items-center">
                        <Clock size={10} className="mr-1" />
                        {new Date(sample.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {Object.entries(sample.labels)
                    .filter(([k]) => k !== labelKey)
                    .map(([k, v]) => (
                      <div key={k} className="pl-4 text-gray-500">
                        {k}="{v}"
                      </div>
                    ))}
                </div>
              ));
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-700">
        <input
          type="text"
          placeholder="Search metrics, labels, or values..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>
      
              <div className="flex-1 overflow-auto custom-scrollbar p-3">
        {searchTerm ? renderFilteredMetrics() : renderMetricsByType()}
      </div>
    </div>
  );
};

// Helper components
const TypeIcon: React.FC<{ type: string | undefined }> = ({ type }) => {
  switch (type) {
    case 'counter':
      return <Hash size={16} className="text-blue-400" />;
    case 'gauge':
      return <BarChart size={16} className="text-green-400" />;
    case 'histogram':
      return <BarChart size={16} className="text-purple-400" />;
    case 'summary':
      return <BarChart size={16} className="text-yellow-400" />;
    default:
      return <BarChart size={16} className="text-gray-400" />;
  }
};

const TypeBadge: React.FC<{ type: string | undefined }> = ({ type }) => {
  if (!type) return null;
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'counter': return 'bg-blue-500/20 text-blue-400';
      case 'gauge': return 'bg-green-500/20 text-green-400';
      case 'histogram': return 'bg-purple-500/20 text-purple-400';
      case 'summary': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  
  return (
    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${getTypeColor(type)}`}>
      {type}
    </span>
  );
};