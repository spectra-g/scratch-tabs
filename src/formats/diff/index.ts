import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { DiffFormatDetector } from "../diff";
import { formatRegistry } from "../registry";
import { smartViewRegistry } from "../../views/registry";
import { SmartView } from "../../views/registry";
import { GitCompare } from "../../components/Icons";
import { DiffViewer } from "./views/components/DiffViewer";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";

// Create the Diff format module that implements the new interface
export class DiffFormatModule implements FormatModule {
  private detector: DiffFormatDetector;

  constructor() {
    this.detector = new DiffFormatDetector();
  }

  get id(): string {
    return this.detector.id;
  }

  get name(): string {
    return this.detector.name;
  }

  get extensions(): string[] {
    return this.detector.extensions;
  }

  get priority(): number {
    return this.detector.priority;
  }

  detect(content: string) {
    return this.detector.detect(content);
  }

  registerProvider(monaco: any): void {
    this.detector.registerProvider(monaco);
  }

  sampleContent(): string {
    return this.detector.sampleContent();
  }

  getFileExtension(): string {
    return this.detector.getFileExtension();
  }

  // New generic mechanism for smart views
  getSmartViews(): SmartView[] {
    return [
      {
        id: "diff-viewer",
        languageId: "diff",
        label: "Diff Viewer",
        icon: GitCompare,
        component: DiffViewer,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  // New method for status bar items
  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: 'diff-smart-view-button',
        component: (props: StatusItemProps) => 
          React.createElement(SmartViewButtons, {
            language: this.id,
            tabId: props.activeTab?.id || ''
          }),
        priority: 10,
      },
    ];
  }
}

// Create and register the module
const diffModule = new DiffFormatModule();
formatRegistry.register(diffModule);

// Register the smart view
diffModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerDiffProvider = (monaco: any) => {
  diffModule.registerProvider(monaco);
};
