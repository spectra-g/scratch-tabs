import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { JsonLogFormatDetector } from "../ndjson";
import { formatRegistry } from "../registry";
import { smartViewRegistry } from "../../views/registry";
import { SmartView } from "../../views/registry";
import { ListFilter } from "../../components/Icons";
import { JsonLogViewer } from "./views/components/JsonLogViewer";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";

// Create the NDJSON format module that implements the new interface
export class JsonLogFormatModule implements FormatModule {
  private detector: JsonLogFormatDetector;

  constructor() {
    this.detector = new JsonLogFormatDetector();
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
        id: "ndjson-log-viewer",
        languageId: "ndjson",
        label: "Log Viewer",
        icon: ListFilter,
        component: JsonLogViewer,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  // New method for status bar items
  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: 'ndjson-smart-view-button',
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
const jsonLogModule = new JsonLogFormatModule();
formatRegistry.register(jsonLogModule);

// Register the smart view
jsonLogModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerJsonLogProvider = (monaco: any) => {
  jsonLogModule.registerProvider(monaco);
};