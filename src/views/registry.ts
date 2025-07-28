import React from "react";
import { LucideIcon } from "../components/Icons";

export interface ExtendedView {
  id: string;
  languageId: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<ExtendedViewProps>;
  priority?: number; // For ordering multiple views for same language
}

export interface ExtendedViewProps {
  content: string;
  onContentChange: (newContent: string) => void;
  tabId: string;
  isActive: boolean;
}

class ExtendedViewRegistry {
  private views = new Map<string, ExtendedView[]>();

  register(view: ExtendedView): void {
    const existing = this.views.get(view.languageId) || [];
    const updated = [...existing, view].sort(
      (a, b) => (a.priority || 0) - (b.priority || 0),
    );
    this.views.set(view.languageId, updated);
  }

  getViewsForLanguage(languageId: string): ExtendedView[] {
    return this.views.get(languageId) || [];
  }

  getView(languageId: string, viewId: string): ExtendedView | undefined {
    const views = this.getViewsForLanguage(languageId);
    return views.find((view) => view.id === viewId);
  }

  getAllViews(): ExtendedView[] {
    return Array.from(this.views.values()).flat();
  }

  hasViewsForLanguage(languageId: string): boolean {
    return this.getViewsForLanguage(languageId).length > 0;
  }
}

export const extendedViewRegistry = new ExtendedViewRegistry();
