import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { PemFormatDetector } from "../pem";
import { formatRegistry } from "../registry";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { ShieldCheck } from "../../components/Icons";
import { PemSmartView } from "./views/PemSmartView";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";

export class PemFormatModule implements FormatModule {
  private detector: PemFormatDetector;

  constructor() {
    this.detector = new PemFormatDetector();
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
        id: "pem-certificate-viewer",
        languageId: "pem",
        label: "Certificate Viewer",
        icon: ShieldCheck,
        component: PemSmartView,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: "pem-smart-view-button",
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

const pemModule = new PemFormatModule();
formatRegistry.register(pemModule);
pemModule.getSmartViews().forEach((view) => smartViewRegistry.register(view));
