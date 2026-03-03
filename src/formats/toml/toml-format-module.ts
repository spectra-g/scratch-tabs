import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { formatRegistry } from "../registry";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { Settings } from "../../components/Icons";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";
import { TomlFormatDetector } from "./toml-detector";
import { registerTomlProvider } from "./toml-monaco-provider";
import { getTomlSampleContent } from "./toml-sample-content";
import { TomlSmartView } from "./TomlSmartView";

export class TomlFormatModule implements FormatModule {
  private detector: TomlFormatDetector;

  constructor() {
    this.detector = new TomlFormatDetector();
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
    registerTomlProvider(monaco);
  }

  sampleContent(): string {
    return getTomlSampleContent();
  }

  getSampleContent(): string {
    return this.sampleContent();
  }

  getFileExtension(): string {
    return "toml";
  }

  getSmartViews(): SmartView[] {
    return [
      {
        id: "toml-structured-editor",
        languageId: "toml",
        label: "TOML Structure",
        icon: Settings,
        component: TomlSmartView,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: "toml-smart-view-button",
        component: (props: StatusItemProps) =>
          React.createElement(SmartViewButtons, {
            language: this.id,
            tabId: props.activeTab?.id || "",
          }),
        priority: 10,
      },
    ];
  }
}

const tomlModule = new TomlFormatModule();
formatRegistry.register(tomlModule);
tomlModule.getSmartViews()?.forEach((view) => {
  smartViewRegistry.register(view);
});

export const registerTomlLanguageProvider = (monaco: any): void => {
  tomlModule.registerProvider(monaco);
};
