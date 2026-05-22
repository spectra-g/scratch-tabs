import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { DotenvFormatDetector } from "../dotenv";
import { formatRegistry } from "../registry";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { FileText } from "../../components/Icons";
import { DotenvSmartView } from "./views/DotenvSmartView";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";

export class DotenvFormatModule implements FormatModule {
  private detector: DotenvFormatDetector;

  constructor() {
    this.detector = new DotenvFormatDetector();
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
        id: "dotenv-viewer",
        languageId: "dotenv",
        label: "Variable Viewer",
        icon: FileText,
        component: DotenvSmartView,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: "dotenv-smart-view-button",
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

const dotenvModule = new DotenvFormatModule();
formatRegistry.register(dotenvModule);
dotenvModule.getSmartViews().forEach((view) => smartViewRegistry.register(view));
