import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { CurlFormatDetector } from "../curl";
import { formatRegistry } from "../registry";
import { smartViewRegistry } from "../../views/registry";
import { SmartView } from "../../views/registry";
import { Terminal } from "../../components/Icons";
import { CurlSmartView } from "./views/components/CurlSmartView";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";

// Create the Curl format module that implements the new interface
export class CurlFormatModule implements FormatModule {
  private detector: CurlFormatDetector;

  constructor() {
    this.detector = new CurlFormatDetector();
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
        id: "curl-request-builder",
        languageId: "curl",
        label: "Curl Builder",
        icon: Terminal,
        component: CurlSmartView,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  // New method for status bar items
  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: 'curl-smart-view-button',
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
const curlModule = new CurlFormatModule();
formatRegistry.register(curlModule);

// Register the smart view
curlModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerCurlProvider = (monaco: any) => {
  curlModule.registerProvider(monaco);
};