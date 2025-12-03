import React, { useMemo } from "react";
import { BarChart3, Hash, Type, Layers, ArrowUpDown, TrendingUp, FileText } from "lucide-react";
import { analyzeJson } from "../../utils/jsonAnalyzer";
import { Tab } from "../../../../types";

interface InsightsProps {
  content: string;
  addTab?: (tab: Tab) => void;
}

export const Insights: React.FC<InsightsProps> = ({ content, addTab }) => {
  const stats = useMemo(() => {
    if (!content.trim()) return null;
    
    try {
      return analyzeJson(content);
    } catch (error) {
      return null;
    }
  }, [content]);

  if (!stats) {
    return (
      <div className="p-4 text-center text-muted">
        <div className="mb-2">
          <BarChart3 size={24} className="mx-auto mb-2 text-muted" />
        </div>
        <p className="text-xs">No valid JSON to analyze</p>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatBytes = (kb: number): string => {
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb.toFixed(1)} KB`;
  };

  const formatNumberValue = (num: number): { display: string; full: string } => {
    const fullValue = num.toString();
    // If the number is too long, truncate it
    if (fullValue.length > 12) {
      return {
        display: fullValue.substring(0, 12) + '...',
        full: fullValue
      };
    }
    return {
      display: fullValue,
      full: fullValue
    };
  };

  const generateMarkdownReport = () => {
    if (!stats || !addTab) return;

    const reportDate = new Date();
    const timestamp = reportDate.toLocaleString();
    
    let markdown = `# JSON Insights & Statistics Report\n\n`;
    markdown += `**Generated:** ${timestamp}\n\n`;
    
    // JSON Sample
    markdown += `## 📄 JSON Sample (First 30 Lines)\n\n`;
    const lines = content.split('\n');
    const sampleLines = lines.slice(0, 30);
    const truncated = lines.length > 30;
    
    markdown += "```json\n";
    markdown += sampleLines.join('\n');
    if (truncated) {
      markdown += `\n... (${lines.length - 30} more lines)`;
    }
    markdown += "\n```\n\n";
    
    // Overall Statistics
    markdown += `## 📊 Overall Statistics\n\n`;
    markdown += `| Metric | Value |\n`;
    markdown += `|--------|-------|\n`;
    markdown += `| Total Keys | ${formatNumber(stats.overallStats.totalKeys)} |\n`;
    markdown += `| Max Depth | ${stats.overallStats.maxDepth} |\n`;
    markdown += `| File Size | ${formatBytes(stats.overallStats.objectSizeKB)} |\n`;
    markdown += `| Total Nodes | ${formatNumber(stats.overallStats.totalNodes)} |\n\n`;

    // Data Types
    markdown += `## 🎯 Data Type Distribution\n\n`;
    const sortedTypes = Object.entries(stats.valueAnalysis)
      .sort(([,a], [,b]) => b.percentage - a.percentage);
    
    if (sortedTypes.length > 0) {
      markdown += `| Type | Count | Percentage |\n`;
      markdown += `|------|-------|------------|\n`;
      sortedTypes.forEach(([type, data]) => {
        markdown += `| ${type.charAt(0).toUpperCase() + type.slice(1)} | ${formatNumber(data.count)} | ${data.percentage.toFixed(1)}% |\n`;
      });
      markdown += `\n`;
    }

    // Top Keys
    if (Object.keys(stats.keyAnalysis).length > 0) {
      markdown += `## 🔑 Most Frequent Keys\n\n`;
      const topKeys = Object.entries(stats.keyAnalysis)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      markdown += `| Key | Frequency |\n`;
      markdown += `|-----|----------|\n`;
      topKeys.forEach(([key, count]) => {
        markdown += `| \`${key}\` | ${count} |\n`;
      });
      markdown += `\n`;
    }

    // Array Statistics
    if (stats.arrayStats.totalArrays > 0) {
      markdown += `## 📋 Array Analysis\n\n`;
      markdown += `- **Total Arrays:** ${stats.arrayStats.totalArrays}\n`;
      markdown += `- **Average Length:** ${stats.arrayStats.lengths.average.toFixed(1)}\n`;
      markdown += `- **Length Range:** ${stats.arrayStats.lengths.min} - ${stats.arrayStats.lengths.max}\n\n`;
      
      if (stats.arrayStats.arrayDetails.length > 0) {
        markdown += `### Largest Arrays\n\n`;
        markdown += `| Path | Length | Element Types |\n`;
        markdown += `|------|--------|---------------|\n`;
        stats.arrayStats.arrayDetails
          .sort((a, b) => b.length - a.length)
          .slice(0, 5)
          .forEach(arr => {
            markdown += `| \`${arr.path}\` | ${arr.length} | ${arr.elementTypes.join(', ')} |\n`;
          });
        markdown += `\n`;
      }
    }

    // String Statistics
    if (stats.stringStats.totalStrings > 0) {
      markdown += `## 📝 String Analysis\n\n`;
      markdown += `- **Total Strings:** ${formatNumber(stats.stringStats.totalStrings)}\n`;
      markdown += `- **Average Length:** ${stats.stringStats.lengths.average.toFixed(0)} characters\n`;
      markdown += `- **Length Range:** ${stats.stringStats.lengths.min} - ${stats.stringStats.lengths.max} characters\n\n`;
      
      if (stats.stringStats.examples.longest) {
        markdown += `### Longest String Sample\n\n`;
        markdown += "```\n" + (stats.stringStats.examples.longest.length > 200 
          ? stats.stringStats.examples.longest.substring(0, 200) + '...'
          : stats.stringStats.examples.longest
        ) + "\n```\n\n";
      }
    }

    // Number Statistics
    if (stats.numberStats.totalNumbers > 0) {
      markdown += `## 🔢 Number Analysis\n\n`;
      markdown += `| Metric | Value |\n`;
      markdown += `|--------|-------|\n`;
      markdown += `| Total Numbers | ${formatNumber(stats.numberStats.totalNumbers)} |\n`;
      markdown += `| Integers | ${formatNumber(stats.numberStats.integers)} |\n`;
      markdown += `| Floats | ${formatNumber(stats.numberStats.floats)} |\n`;
      markdown += `| Value Range | ${stats.numberStats.range.min} to ${stats.numberStats.range.max} |\n\n`;
    }

    markdown += `---\n\n`;
    markdown += `*Report generated by JSON SmartView*\n`;

    // Create a new tab with the markdown report
    const now = Date.now();
    addTab({
      id: crypto.randomUUID(),
      title: `JSON Insights Report`,
      content: markdown,
      language: "markdown",
      languageLocked: true,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: now,
      lastModified: now,
      workspaceId: "", // Will be set by the tab system
    });
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      {/* Overall Stats */}
      <div className="p-3 border-b border-base">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Hash size={14} className="mr-2 text-info" />
            <h4 className="text-xs font-medium text-main">Overall Statistics</h4>
          </div>
          {addTab && (
            <button
              onClick={generateMarkdownReport}
              className="p-1 text-secondary hover:text-info hover:bg-info-subtle rounded transition-colors"
              title="Export insights as Markdown report"
            >
              <FileText size={12} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-element p-2 rounded">
            <div className="text-muted">Total Keys</div>
            <div className="text-main font-mono">{formatNumber(stats.overallStats.totalKeys)}</div>
          </div>
          <div className="bg-element p-2 rounded">
            <div className="text-muted">Max Depth</div>
            <div className="text-main font-mono">{stats.overallStats.maxDepth}</div>
          </div>
          <div className="bg-element p-2 rounded">
            <div className="text-muted">File Size</div>
            <div className="text-main font-mono">{formatBytes(stats.overallStats.objectSizeKB)}</div>
          </div>
          <div className="bg-element p-2 rounded">
            <div className="text-muted">Total Nodes</div>
            <div className="text-main font-mono">{formatNumber(stats.overallStats.totalNodes)}</div>
          </div>
        </div>
      </div>

      {/* Value Analysis */}
      <div className="p-3 border-b border-base">
        <div className="flex items-center mb-2">
          <Type size={14} className="mr-2 text-success" />
          <h4 className="text-xs font-medium text-main">Data Types</h4>
        </div>
        <div className="space-y-1">
          {Object.entries(stats.valueAnalysis)
            .sort(([,a], [,b]) => b.percentage - a.percentage)
            .map(([type, data]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  <div
                    className="w-2 h-2 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        type === 'string' ? '#22c55e' :
                        type === 'number' ? '#3b82f6' :
                        type === 'boolean' ? '#f59e0b' :
                        type === 'object' ? '#8b5cf6' :
                        type === 'array' ? '#ec4899' :
                        '#6b7280'
                    }}
                  />
                  <span className="text-secondary capitalize">{type}</span>
                </div>
                <div className="text-muted">
                  {data.percentage.toFixed(1)}% ({formatNumber(data.count)})
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Key Analysis */}
      {Object.keys(stats.keyAnalysis).length > 0 && (
        <div className="p-3 border-b border-base">
          <div className="flex items-center mb-2">
            <Layers size={14} className="mr-2 text-info" />
            <h4 className="text-xs font-medium text-main">Top Keys</h4>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
            {Object.entries(stats.keyAnalysis)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 10)
              .map(([key, count]) => (
                <div key={key} className="flex items-center justify-between text-xs pr-2">
                  <span className="text-secondary font-mono truncate mr-3" title={key}>
                    {key.length > 15 ? `${key.substring(0, 15)}...` : key}
                  </span>
                  <span className="text-muted flex-shrink-0">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Array Stats */}
      {stats.arrayStats.totalArrays > 0 && (
        <div className="p-3 border-b border-base">
          <div className="flex items-center mb-2">
            <ArrowUpDown size={14} className="mr-2 text-warning" />
            <h4 className="text-xs font-medium text-main">Arrays</h4>
          </div>
          <div className="grid grid-cols-3 gap-1 text-xs mb-2">
            <div className="bg-element p-1.5 rounded text-center">
              <div className="text-muted">Count</div>
              <div className="text-main font-mono">{stats.arrayStats.totalArrays}</div>
            </div>
            <div className="bg-element p-1.5 rounded text-center">
              <div className="text-muted">Avg Length</div>
              <div className="text-main font-mono">{stats.arrayStats.lengths.average.toFixed(1)}</div>
            </div>
            <div className="bg-element p-1.5 rounded text-center">
              <div className="text-muted">Max Length</div>
              <div className="text-main font-mono">{stats.arrayStats.lengths.max}</div>
            </div>
          </div>
          {stats.arrayStats.arrayDetails.length > 0 && (
            <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
              {stats.arrayStats.arrayDetails
                .sort((a, b) => b.length - a.length)
                .slice(0, 5)
                .map((arr, index) => (
                  <div key={index} className="flex items-center justify-between text-xs pr-2">
                    <span className="text-secondary font-mono truncate mr-3" title={arr.path}>
                      {arr.path.length > 12 ? `...${arr.path.substring(arr.path.length - 12)}` : arr.path}
                    </span>
                    <div className="text-muted flex-shrink-0">
                      {arr.length} [{arr.elementTypes.join(', ')}]
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* String Stats */}
      {stats.stringStats.totalStrings > 0 && (
        <div className="p-3 border-b border-base">
          <div className="flex items-center mb-2">
            <TrendingUp size={14} className="mr-2 text-info" />
            <h4 className="text-xs font-medium text-main">Strings</h4>
          </div>
          <div className="grid grid-cols-3 gap-1 text-xs mb-2">
            <div className="bg-element p-1.5 rounded text-center">
              <div className="text-muted">Count</div>
              <div className="text-main font-mono">{formatNumber(stats.stringStats.totalStrings)}</div>
            </div>
            <div className="bg-element p-1.5 rounded text-center">
              <div className="text-muted">Avg Length</div>
              <div className="text-main font-mono">{stats.stringStats.lengths.average.toFixed(0)}</div>
            </div>
            <div className="bg-element p-1.5 rounded text-center">
              <div className="text-muted">Max Length</div>
              <div className="text-main font-mono">{stats.stringStats.lengths.max}</div>
            </div>
          </div>
          {stats.stringStats.examples.longest && (
            <div className="space-y-1">
              <div className="text-xs">
                <div className="text-muted mb-1">Longest:</div>
                <div className="bg-element p-1.5 rounded text-secondary font-mono text-xs break-all">
                  {stats.stringStats.examples.longest.length > 100
                    ? `${stats.stringStats.examples.longest.substring(0, 100)}...`
                    : stats.stringStats.examples.longest
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Number Stats */}
      {stats.numberStats.totalNumbers > 0 && (
        <div className="p-3">
          <div className="flex items-center mb-2">
            <Hash size={14} className="mr-2 text-warning" />
            <h4 className="text-xs font-medium text-main">Numbers</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-element p-2 rounded">
              <div className="text-muted">Integers</div>
              <div
                className="text-main font-mono truncate cursor-help"
                title={stats.numberStats.integers.toString()}
              >
                {formatNumber(stats.numberStats.integers)}
              </div>
            </div>
            <div className="bg-element p-2 rounded">
              <div className="text-muted">Floats</div>
              <div
                className="text-main font-mono truncate cursor-help"
                title={stats.numberStats.floats.toString()}
              >
                {formatNumber(stats.numberStats.floats)}
              </div>
            </div>
            <div className="bg-element p-2 rounded">
              <div className="text-muted">Min Value</div>
              <div
                className="text-main font-mono truncate cursor-help"
                title={formatNumberValue(stats.numberStats.range.min).full}
              >
                {formatNumberValue(stats.numberStats.range.min).display}
              </div>
            </div>
            <div className="bg-element p-2 rounded">
              <div className="text-muted">Max Value</div>
              <div
                className="text-main font-mono truncate cursor-help"
                title={formatNumberValue(stats.numberStats.range.max).full}
              >
                {formatNumberValue(stats.numberStats.range.max).display}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};