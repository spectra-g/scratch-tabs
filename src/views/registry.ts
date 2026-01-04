import React from "react";
import { LucideIcon } from "../components/Icons";

export interface SmartViewSyncConfig {
  enableScrollSync?: boolean;
  enableClickSync?: boolean;
  // Format-specific: map preview element to source line number
  getLineFromElement?: (element: HTMLElement, content: string) => number | null;
  // Format-specific: map source line number to preview element selector
  getElementSelectorFromLine?: (line: number, content: string) => string | null;
}

export interface SmartView {
  id: string;
  languageId: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<SmartViewProps>;
  mode: 'replaces' | 'side-by-side'; // Define the view's behavior
  priority?: number; // For ordering multiple views for same language
  syncConfig?: SmartViewSyncConfig; // Optional sync configuration
}

export interface SmartViewProps {
  content: string;
  onContentChange: (newContent: string) => void;
  tabId: string;
  isActive: boolean;
  side: 'left' | 'right';
}

class SmartViewRegistry {
  private views = new Map<string, SmartView[]>();

  register(view: SmartView): void {
    const existing = this.views.get(view.languageId) || [];
    const updated = [...existing, view].sort(
      (a, b) => (a.priority || 0) - (b.priority || 0),
    );
    this.views.set(view.languageId, updated);
  }

  getViewsForLanguage(languageId: string): SmartView[] {
    return this.views.get(languageId) || [];
  }

  getView(languageId: string, viewId: string): SmartView | undefined {
    const views = this.getViewsForLanguage(languageId);
    return views.find((view) => view.id === viewId);
  }

  getAllViews(): SmartView[] {
    return Array.from(this.views.values()).flat();
  }

  hasViewsForLanguage(languageId: string): boolean {
    return this.getViewsForLanguage(languageId).length > 0;
  }
}

export const smartViewRegistry = new SmartViewRegistry();
