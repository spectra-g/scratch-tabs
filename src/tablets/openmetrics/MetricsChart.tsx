import React, { useState, useMemo } from 'react';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Tag, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, LineChart, PieChart, Pie, Cell } from 'recharts';
import { MetricSample } from './types';
import { groupMetricsByLabels, formatLabelsForDisplay } from './utils';

interface MetricsChartProps {
  metrics: MetricSample[];
  selectedMetricName: string | null;
  selectedLabels: Record<string, string>;
  chartConfig: {
    type: 'bar' | 'line' | 'pie';
    groupByLabels: string[];
  };
  onUpdateChartConfig: (config: { type: 'bar' | 'line' | 'pie'; groupByLabels: string[] }) => void;
  onSelectMetric: (metricName: string, labels?: Record<string, string>) => void;
}

export const MetricsChart: React.FC<MetricsChartProps> = ({
  metrics,
  selectedMetricName,
  selectedLabels,
  chartConfig,
  onUpdateChartConfig,
  onSelectMetric
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Get all unique metric names
  const metricNames = useMemo(() => {
    const names = new Set<string>();
    metrics.forEach(metric => names.add(metric.name));
    return Array.from(names).sort();
  }, [metrics]);

  // Filter metric names by search term
  const filteredMetricNames = useMemo(() => {
    if (!searchTerm) return metricNames;
    const term = searchTerm.toLowerCase();
    return metricNames.filter(name => name.toLowerCase().includes(term));
  }, [metricNames, searchTerm]);

  // Get all samples for the selected metric
  const selectedMetricSamples = useMemo(() => {
    if (!selectedMetricName) return [];
    
    // If we have specific labels selected, filter by those
    if (Object.keys(selectedLabels).length > 0) {
      return metrics.filter(metric => 
        metric.name === selectedMetricName &&
        Object.entries(selectedLabels).every(([key, value]) => 
          metric.labels[key] === value
        )
      );
    }
    
    // Otherwise, get all samples for this metric name
    return metrics.filter(metric => metric.name === selectedMetricName);
  }, [metrics, selectedMetricName, selectedLabels]);

  // Get all unique label keys for the selected metric
  const availableLabelKeys = useMemo(() => {
    if (!selectedMetricSamples.length) return [];
    
    const labelKeys = new Set<string>();
    selectedMetricSamples.forEach(sample => {
      Object.keys(sample.labels).forEach(key => labelKeys.add(key));
    });
    
    return Array.from(labelKeys).sort();
  }, [selectedMetricSamples]);

  // Prepare chart data based on selected metric and grouping
  const chartData = useMemo(() => {
    if (!selectedMetricName || selectedMetricSamples.length === 0) return [];
    
    // If no grouping labels are selected, just return the raw values
    if (chartConfig.groupByLabels.length === 0) {
      return selectedMetricSamples.map(sample => ({
        name: formatLabelsForDisplay(sample.labels),
        value: sample.value
      }));
    }
    
    // Group metrics by the selected labels
    return groupMetricsByLabels(selectedMetricSamples, chartConfig.groupByLabels);
  }, [selectedMetricName, selectedMetricSamples, chartConfig.groupByLabels]);

  // Toggle a label for grouping
  const toggleGroupByLabel = (labelKey: string) => {
    const newGroupByLabels = [...chartConfig.groupByLabels];
    const index = newGroupByLabels.indexOf(labelKey);
    
    if (index === -1) {
      newGroupByLabels.push(labelKey);
    } else {
      newGroupByLabels.splice(index, 1);
    }
    
    onUpdateChartConfig({
      ...chartConfig,
      groupByLabels: newGroupByLabels
    });
  };

  // Set chart type
  const setChartType = (type: 'bar' | 'line' | 'pie') => {
    onUpdateChartConfig({
      ...chartConfig,
      type
    });
  };

  // Generate colors for chart elements
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Render the appropriate chart based on the selected type
  const renderChart = () => {
    if (!selectedMetricName || chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <BarChartIcon size={48} className="mb-4 opacity-50" />
          <p>Select a metric to visualize</p>
        </div>
      );
    }

    switch (chartConfig.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#aaa' }} 
                tickLine={{ stroke: '#666' }}
                axisLine={{ stroke: '#666' }}
              />
              <YAxis 
                tick={{ fill: '#aaa' }} 
                tickLine={{ stroke: '#666' }}
                axisLine={{ stroke: '#666' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', borderColor: '#555' }}
                labelStyle={{ color: '#eee' }}
              />
              <Legend wrapperStyle={{ color: '#aaa' }} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#aaa' }} 
                tickLine={{ stroke: '#666' }}
                axisLine={{ stroke: '#666' }}
              />
              <YAxis 
                tick={{ fill: '#aaa' }} 
                tickLine={{ stroke: '#666' }}
                axisLine={{ stroke: '#666' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', borderColor: '#555' }}
                labelStyle={{ color: '#eee' }}
              />
              <Legend wrapperStyle={{ color: '#aaa' }} />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#333', borderColor: '#555' }}
                labelStyle={{ color: '#eee' }}
              />
              <Legend wrapperStyle={{ color: '#aaa' }} />
            </PieChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3">
          <div className="mb-2 md:mb-0">
            <h3 className="text-sm font-medium text-gray-300">Metric Chart</h3>
            {selectedMetricName && (
              <div className="text-xs text-gray-400 mt-1">
                {selectedMetricName}
                {Object.keys(selectedLabels).length > 0 && (
                  <span className="ml-2">
                    {formatLabelsForDisplay(selectedLabels)}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded ${chartConfig.type === 'bar' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-700'}`}
              title="Bar Chart"
            >
              <BarChartIcon size={16} />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded ${chartConfig.type === 'line' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-700'}`}
              title="Line Chart"
            >
              <LineChartIcon size={16} />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 rounded ${chartConfig.type === 'pie' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-700'}`}
              title="Pie Chart"
            >
              <PieChartIcon size={16} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:space-x-4">
          {/* Metric selector */}
          <div className="w-full md:w-1/3 mb-3 md:mb-0">
            <div className="text-xs text-gray-400 mb-1">Select Metric</div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search metrics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="mt-2 max-h-32 overflow-y-auto bg-gray-800 border border-gray-700 rounded">
              {filteredMetricNames.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">No metrics found</div>
              ) : (
                filteredMetricNames.map(name => (
                  <div
                    key={name}
                    className={`p-2 text-sm cursor-pointer hover:bg-gray-700 ${
                      name === selectedMetricName ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300'
                    }`}
                    onClick={() => onSelectMetric(name)}
                  >
                    {name}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Group by selector */}
          {selectedMetricName && availableLabelKeys.length > 0 && (
            <div className="w-full md:w-1/3">
              <div className="text-xs text-gray-400 mb-1">Group By Labels</div>
              <div className="bg-gray-800 border border-gray-700 rounded p-2 max-h-32 overflow-y-auto">
                {availableLabelKeys.map(labelKey => (
                  <div key={labelKey} className="flex items-center mb-1 last:mb-0">
                    <input
                      type="checkbox"
                      id={`group-by-${labelKey}`}
                      checked={chartConfig.groupByLabels.includes(labelKey)}
                      onChange={() => toggleGroupByLabel(labelKey)}
                      className="mr-2"
                    />
                    <label 
                      htmlFor={`group-by-${labelKey}`}
                      className="text-sm text-gray-300 flex items-center"
                    >
                      <Tag size={12} className="mr-1 text-gray-500" />
                      {labelKey}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-auto">
        {renderChart()}
      </div>
    </div>
  );
};