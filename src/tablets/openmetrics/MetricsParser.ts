import { MetricSample, ParsedMetric, ParseResult, ParseError } from './types';

/**
 * Parses OpenMetrics exposition format text into structured metrics
 */
export function parseMetrics(text: string): ParseResult {
  const lines = text.split('\n');
  const metrics: MetricSample[] = [];
  const errors: ParseError[] = [];
  
  let currentMetricName = '';
  let currentMetricType = '';
  let currentMetricHelp = '';
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and EOF marker
    if (line === '' || line === '# EOF') continue;
    
    try {
      // Process metadata lines
      if (line.startsWith('# HELP ')) {
        const parts = line.substring(7).split(' ');
        currentMetricName = parts[0];
        currentMetricHelp = parts.slice(1).join(' ');
        continue;
      }
      
      if (line.startsWith('# TYPE ')) {
        const parts = line.substring(7).split(' ');
        currentMetricName = parts[0];
        currentMetricType = parts[1];
        continue;
      }
      
      // Skip other comment lines
      if (line.startsWith('#')) continue;
      
      // Process metric lines
      const metricMatch = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)((?:{.*})?)\s+([0-9.eE+-]+)(?:\s+(\d+))?$/);
      
      if (!metricMatch) {
        errors.push({
          line: i + 1,
          message: 'Invalid metric format',
          text: line
        });
        continue;
      }
      
      const [, name, labelsStr, valueStr, timestampStr] = metricMatch;
      
      // Parse labels
      const labels: Record<string, string> = {};
      if (labelsStr && labelsStr !== '{}') {
        const labelsContent = labelsStr.substring(1, labelsStr.length - 1);
        const labelPairs = labelsContent.split(',');
        
        for (const pair of labelPairs) {
          const [key, quotedValue] = pair.split('=');
          if (!key || !quotedValue) {
            errors.push({
              line: i + 1,
              message: `Invalid label format: ${pair}`,
              text: line
            });
            continue;
          }
          
          // Remove quotes from value
          const value = quotedValue.replace(/^"(.*)"$/, '$1');
          labels[key.trim()] = value;
        }
      }
      
      // Parse value and timestamp
      const value = parseFloat(valueStr);
      if (isNaN(value)) {
        errors.push({
          line: i + 1,
          message: `Invalid metric value: ${valueStr}`,
          text: line
        });
        continue;
      }
      
      const timestamp = timestampStr ? parseInt(timestampStr, 10) : undefined;
      
      // Create metric sample
      const metricSample: MetricSample = {
        name,
        labels,
        value,
        timestamp,
        type: name === currentMetricName ? currentMetricType : undefined,
        help: name === currentMetricName ? currentMetricHelp : undefined
      };
      
      metrics.push(metricSample);
    } catch (error) {
      errors.push({
        line: i + 1,
        message: error instanceof Error ? error.message : String(error),
        text: line
      });
    }
  }
  
  // Group metrics by name for the parsed metrics structure
  const metricsByName = new Map<string, ParsedMetric>();
  
  for (const sample of metrics) {
    if (!metricsByName.has(sample.name)) {
      metricsByName.set(sample.name, {
        name: sample.name,
        type: sample.type,
        help: sample.help,
        samples: []
      });
    }
    
    const parsedMetric = metricsByName.get(sample.name)!;
    parsedMetric.samples.push(sample);
  }
  
  // Calculate statistics
  const uniqueMetricNames = new Set(metrics.map(m => m.name));
  const allLabelNames = new Set<string>();
  const allLabelPairs = new Set<string>();
  
  metrics.forEach(metric => {
    Object.entries(metric.labels).forEach(([key, value]) => {
      allLabelNames.add(key);
      allLabelPairs.add(`${key}=${value}`);
    });
  });
  
  return {
    metrics,
    parsedMetrics: Array.from(metricsByName.values()),
    errors,
    stats: {
      totalMetrics: metrics.length,
      uniqueMetricNames: uniqueMetricNames.size,
      totalLabels: allLabelPairs.size,
      uniqueLabelNames: allLabelNames.size
    }
  };
}

/**
 * Formats a metric sample back to OpenMetrics text format
 */
export function formatMetricSample(sample: MetricSample): string {
  const labelsStr = Object.entries(sample.labels)
    .map(([key, value]) => `${key}="${value}"`)
    .join(',');
  
  const labelsFormatted = labelsStr ? `{${labelsStr}}` : '';
  const timestampStr = sample.timestamp ? ` ${sample.timestamp}` : '';
  
  return `${sample.name}${labelsFormatted} ${sample.value}${timestampStr}`;
}

/**
 * Formats a collection of metrics back to OpenMetrics text format
 */
export function formatMetrics(metrics: MetricSample[]): string {
  // Group metrics by name
  const metricsByName = new Map<string, MetricSample[]>();
  
  for (const metric of metrics) {
    if (!metricsByName.has(metric.name)) {
      metricsByName.set(metric.name, []);
    }
    metricsByName.get(metric.name)!.push(metric);
  }
  
  // Format each group
  const lines: string[] = [];
  
  for (const [name, samples] of metricsByName.entries()) {
    // Add metadata if available from the first sample
    const firstSample = samples[0];
    
    if (firstSample.help) {
      lines.push(`# HELP ${name} ${firstSample.help}`);
    }
    
    if (firstSample.type) {
      lines.push(`# TYPE ${name} ${firstSample.type}`);
    }
    
    // Add samples
    for (const sample of samples) {
      lines.push(formatMetricSample(sample));
    }
    
    // Add a blank line between metric groups
    lines.push('');
  }
  
  // Add EOF marker
  lines.push('# EOF');
  
  return lines.join('\n');
}