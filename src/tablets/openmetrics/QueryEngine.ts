import { MetricSample, QueryResult } from './types';

/**
 * Simple query language parser and executor for OpenMetrics
 */
export function executeQuery(metrics: MetricSample[], queryString: string): QueryResult {
  // Trim whitespace
  const query = queryString.trim();
  
  // Check for aggregation functions
  const aggregationMatch = query.match(/^(sum|avg|count|min|max)\((.*)\)$/);
  
  if (aggregationMatch) {
    const [, aggregationType, innerQuery] = aggregationMatch;
    return executeAggregationQuery(metrics, innerQuery.trim(), aggregationType);
  }
  
  // Regular metric query
  return executeMetricQuery(metrics, query);
}

/**
 * Execute a basic metric query with optional label filters
 */
function executeMetricQuery(metrics: MetricSample[], query: string): QueryResult {
  // Parse metric name and label filters
  const metricMatch = query.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)((?:{.*})?)?$/);
  
  if (!metricMatch) {
    throw new Error(`Invalid query format: ${query}`);
  }
  
  const [, metricName, labelsStr] = metricMatch;
  const labelFilters = parseLabelFilters(labelsStr || '');
  
  // Filter metrics by name and labels
  const filteredMetrics = metrics.filter(metric => {
    // Match metric name
    if (metric.name !== metricName) {
      return false;
    }
    
    // Apply label filters
    for (const [key, { value, operator }] of Object.entries(labelFilters)) {
      const metricValue = metric.labels[key];
      
      // If the label doesn't exist in the metric
      if (metricValue === undefined) {
        return false;
      }
      
      // Apply the operator
      switch (operator) {
        case '=':
          if (metricValue !== value) return false;
          break;
        case '!=':
          if (metricValue === value) return false;
          break;
        case '=~':
          if (!new RegExp(value).test(metricValue)) return false;
          break;
        case '!~':
          if (new RegExp(value).test(metricValue)) return false;
          break;
      }
    }
    
    return true;
  });
  
  // Return the result
  return {
    metric: metricName,
    groupedBy: [],
    values: filteredMetrics.map(metric => ({
      labels: metric.labels,
      value: metric.value
    }))
  };
}

/**
 * Execute an aggregation query
 */
function executeAggregationQuery(
  metrics: MetricSample[], 
  innerQuery: string, 
  aggregationType: string
): QueryResult {
  // First, get the filtered metrics
  const { metric, values } = executeMetricQuery(metrics, innerQuery);
  
  // If there are no values, return empty result
  if (values.length === 0) {
    return { metric, groupedBy: [], values: [] };
  }
  
  // Perform the aggregation
  let result: number;
  
  switch (aggregationType) {
    case 'sum':
      result = values.reduce((sum, { value }) => sum + value, 0);
      break;
    case 'avg':
      result = values.reduce((sum, { value }) => sum + value, 0) / values.length;
      break;
    case 'count':
      result = values.length;
      break;
    case 'min':
      result = Math.min(...values.map(({ value }) => value));
      break;
    case 'max':
      result = Math.max(...values.map(({ value }) => value));
      break;
    default:
      throw new Error(`Unsupported aggregation function: ${aggregationType}`);
  }
  
  // Return the aggregated result
  return {
    metric: `${aggregationType}(${metric})`,
    groupedBy: [],
    values: [{ labels: {}, value: result }]
  };
}

/**
 * Parse label filters from a label selector string
 * Format: {label1="value1",label2!="value2",...}
 */
function parseLabelFilters(labelsStr: string): Record<string, { value: string; operator: '=' | '!=' | '=~' | '!~' }> {
  const filters: Record<string, { value: string; operator: '=' | '!=' | '=~' | '!~' }> = {};
  
  // If no labels, return empty filters
  if (!labelsStr || labelsStr === '{}') {
    return filters;
  }
  
  // Extract the content inside the curly braces
  const labelsMatch = labelsStr.match(/^\{(.*)\}$/);
  if (!labelsMatch) {
    throw new Error(`Invalid label selector format: ${labelsStr}`);
  }
  
  const labelsContent = labelsMatch[1];
  
  // Split by commas, but not inside quotes
  const labelPairs = labelsContent.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  
  for (const pair of labelPairs) {
    // Match label, operator, and value
    const labelMatch = pair.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(=|!=|=~|!~)\s*"(.*)"\s*$/);
    
    if (!labelMatch) {
      throw new Error(`Invalid label filter: ${pair}`);
    }
    
    const [, key, operator, value] = labelMatch;
    
    filters[key] = { 
      value, 
      operator: operator as '=' | '!=' | '=~' | '!~'
    };
  }
  
  return filters;
}