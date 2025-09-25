export interface DiagramTabletState {
  type: 'diagram';
  mermaidCode: string;
  renderedSvg: string | null;
  errorState: DiagramError | null;
  activeTheme: MermaidTheme;
  selectedTimezones: string[];
  history: HistoryEntry[];
  pinnedDiagrams: PinnedDiagram[];
  isRendering: boolean;
  lastRenderTime: number;
  templateSearchQuery: string;
  showTemplateLibrary: boolean;
  exportSettings: ExportSettings;
}

export interface DiagramError {
  line: number;
  column?: number;
  message: string;
  type: 'syntax' | 'semantic' | 'render';
  suggestion?: string;
}

export interface HistoryEntry {
  id: string;
  code: string;
  timestamp: number;
  diagramType: DiagramType;
  preview?: string; // Base64 encoded thumbnail
}

export interface PinnedDiagram {
  id: string;
  name: string;
  code: string;
  diagramType: DiagramType;
  createdAt: number;
}

export interface ExportSettings {
  format: 'svg' | 'png';
  resolution: 1 | 2 | 3; // For PNG exports
  includeStyles: boolean;
  backgroundColor: string;
}

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  category: DiagramType;
  code: string;
  tags: string[];
  complexity: 'basic' | 'intermediate' | 'advanced';
}

export interface MermaidRenderResult {
  svg: string;
  elementMap: Map<string, number>; // SVG element ID to line number mapping
  error?: DiagramError;
}

export type DiagramType = 
  | 'flowchart' 
  | 'sequence' 
  | 'gantt' 
  | 'class' 
  | 'state' 
  | 'er' 
  | 'journey' 
  | 'gitgraph' 
  | 'pie' 
  | 'requirement' 
  | 'mindmap' 
  | 'timeline';

export type MermaidTheme = 
  | 'default' 
  | 'dark' 
  | 'forest' 
  | 'base' 
  | 'neutral';

export interface ClickableElement {
  id: string;
  lineNumber: number;
  elementType: string;
  attributes: Record<string, string>;
}