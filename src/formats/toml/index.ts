import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { TomlFormatDetector } from "../toml";
import { formatRegistry } from "../registry";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { FileText } from "../../components/Icons";
import { TomlSmartView } from "./views/TomlSmartView";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";

export class TomlFormatModule implements FormatModule {
  private detector: TomlFormatDetector;

  constructor() {
    this.detector = new TomlFormatDetector();
  }

  get id(): string { return this.detector.id; }
  get name(): string { return this.detector.name; }
  get extensions(): string[] { return this.detector.extensions; }
  get priority(): number { return this.detector.priority; }

  detect(content: string) { return this.detector.detect(content); }
  registerProvider(monaco: any): void { this.detector.registerProvider(monaco); }
  sampleContent(): string { return this.detector.sampleContent(); }
  getFileExtension(): string { return this.detector.getFileExtension(); }

  getSmartViews(): SmartView[] {
    return [
      {
        id: "toml-structure-explorer",
        languageId: "toml",
        label: "Structure Explorer",
        icon: FileText,
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
            tabId: props.activeTab?.id ?? "",
          }),
        priority: 10,
      },
    ];
  }
}

const tomlModule = new TomlFormatModule();
formatRegistry.register(tomlModule);

tomlModule.getSmartViews().forEach((view) => smartViewRegistry.register(view));

export const registerTomlProvider = (monaco: any) => tomlModule.registerProvider(monaco);
