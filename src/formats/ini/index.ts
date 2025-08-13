import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { IniFormatDetector } from "../ini";
import { formatRegistry } from "../registry";
import { smartViewRegistry } from "../../views/registry";
import { SmartView } from "../../views/registry";
import { Settings } from "../../components/Icons";
import { IniSmartView } from "./views/components/IniSmartView";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";

// Create the INI format module that implements the new interface
export class IniFormatModule implements FormatModule {
  private detector: IniFormatDetector;

  constructor() {
    this.detector = new IniFormatDetector();
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

  registerProvider(monaco: unknown): void {
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
        id: "ini-editor",
        languageId: "ini",
        label: "Section Editor",
        icon: Settings,
        component: IniSmartView,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  // New method for status bar items
  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: 'ini-smart-view-button',
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
const iniModule = new IniFormatModule();
formatRegistry.register(iniModule);

// Register the smart view
iniModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerIniProvider = (monaco: unknown) => {
  iniModule.registerProvider(monaco);
};