import { FormatModule } from "../types";
import { PropertiesFormatDetector } from "../properties";
import { formatRegistry } from "../registry";
import React from "react";
import { StatusBarItem } from "../types";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { Settings } from "../../components/Icons";
import { PropertiesSmartView } from "./views/components/PropertiesSmartView";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";

// Create the Properties format module that implements the new interface
export class PropertiesFormatModule implements FormatModule {
  private detector: PropertiesFormatDetector;

  constructor() {
    this.detector = new PropertiesFormatDetector();
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
        id: "properties-editor",
        languageId: "properties",
        label: "Properties Editor",
        icon: Settings,
        component: PropertiesSmartView,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  // New method for status bar items
  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: 'properties-smart-view-button',
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
const propertiesModule = new PropertiesFormatModule();
formatRegistry.register(propertiesModule);

// Register the smart view
propertiesModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerPropertiesProvider = (monaco: any) => {
  propertiesModule.registerProvider(monaco);
};
