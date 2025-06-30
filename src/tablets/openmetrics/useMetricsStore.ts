import { create } from 'zustand';
import { MetricSample, Snapshot, ParseResult } from './types';
import { parseMetrics } from './MetricsParser';

interface MetricsState {
  // Raw text and parsing
  rawText: string;
  parseResult: ParseResult | null;
  parseError: string | null;
  isLoading: boolean;
  
  // Snapshots
  snapshots: Snapshot[];
  activeSnapshotId: string | null;
  compareSnapshotId: string | null;
  
  // Selection and visualization
  selectedMetricName: string | null;
  selectedLabels: Record<string, string>;
  chartConfig: {
    type: 'bar' | 'line' | 'pie';
    groupByLabels: string[];
  };
  
  // Query
  queryString: string;
  
  // UI state
  activeTab: 'editor' | 'explorer' | 'diff' | 'chart' | 'query';
  
  // Actions
  setRawText: (text: string) => void;
  parseMetricsText: () => void;
  takeSnapshot: (name: string) => void;
  selectSnapshot: (id: string) => void;
  selectCompareSnapshot: (id: string | null) => void;
  deleteSnapshot: (id: string) => void;
  selectMetric: (name: string, labels?: Record<string, string>) => void;
  updateChartConfig: (config: Partial<MetricsState['chartConfig']>) => void;
  updateQueryString: (query: string) => void;
  setActiveTab: (tab: MetricsState['activeTab']) => void;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  // Initial state
  rawText: '',
  parseResult: null,
  parseError: null,
  isLoading: false,
  
  snapshots: [],
  activeSnapshotId: null,
  compareSnapshotId: null,
  
  selectedMetricName: null,
  selectedLabels: {},
  chartConfig: {
    type: 'bar',
    groupByLabels: []
  },
  
  queryString: '',
  
  activeTab: 'editor',
  
  // Actions
  setRawText: (text) => set({ rawText: text }),
  
  parseMetricsText: () => {
    const { rawText } = get();
    
    set({ isLoading: true, parseError: null });
    
    try {
      const result = parseMetrics(rawText);
      set({ parseResult: result, parseError: null });
      
      // Update the active snapshot with the new metrics
      const { activeSnapshotId, snapshots } = get();
      if (activeSnapshotId) {
        const updatedSnapshots = snapshots.map(snapshot => 
          snapshot.id === activeSnapshotId 
            ? { ...snapshot, metrics: result.metrics } 
            : snapshot
        );
        set({ snapshots: updatedSnapshots });
      }
    } catch (error) {
      set({ parseError: error instanceof Error ? error.message : String(error) });
    } finally {
      set({ isLoading: false });
    }
  },
  
  takeSnapshot: (name) => {
    const { parseResult, snapshots } = get();
    
    if (!parseResult) return;
    
    const newSnapshot: Snapshot = {
      id: `snapshot_${Date.now()}`,
      name,
      createdAt: Date.now(),
      metrics: parseResult.metrics
    };
    
    set({ 
      snapshots: [...snapshots, newSnapshot],
      activeSnapshotId: newSnapshot.id
    });
  },
  
  selectSnapshot: (id) => set({ activeSnapshotId: id }),
  
  selectCompareSnapshot: (id) => set({ compareSnapshotId: id }),
  
  deleteSnapshot: (id) => {
    const { snapshots, activeSnapshotId, compareSnapshotId } = get();
    
    const updatedSnapshots = snapshots.filter(s => s.id !== id);
    
    // Update active snapshot if the deleted one was active
    let newActiveId = activeSnapshotId;
    if (activeSnapshotId === id) {
      newActiveId = updatedSnapshots.length > 0 ? updatedSnapshots[updatedSnapshots.length - 1].id : null;
    }
    
    // Update compare snapshot if the deleted one was being compared
    let newCompareId = compareSnapshotId;
    if (compareSnapshotId === id) {
      newCompareId = null;
    }
    
    set({ 
      snapshots: updatedSnapshots,
      activeSnapshotId: newActiveId,
      compareSnapshotId: newCompareId
    });
  },
  
  selectMetric: (name, labels = {}) => set({ 
    selectedMetricName: name,
    selectedLabels: labels,
    activeTab: 'chart' // Switch to chart tab when selecting a metric
  }),
  
  updateChartConfig: (config) => set(state => ({ 
    chartConfig: { ...state.chartConfig, ...config } 
  })),
  
  updateQueryString: (query) => set({ queryString: query }),
  
  setActiveTab: (tab) => set({ activeTab: tab })
}));