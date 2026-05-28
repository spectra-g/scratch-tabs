import React from "react";
import { Braces } from "lucide-react";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { formatRegistry } from "../registry";
import { FormatModule, StatusBarItem } from "../types";
import { OpenApiFormatDetector } from "../openapi";
import { OpenApiSmartView } from "./views/OpenApiSmartView";

export class OpenApiFormatModule implements FormatModule {
  private detector = new OpenApiFormatDetector();

  get id(): string { return this.detector.id; }
  get name(): string { return this.detector.name; }
  get extensions(): string[] { return this.detector.extensions; }
  get priority(): number { return this.detector.priority; }

  detect(content: string) { return this.detector.detect(content); }
  registerProvider(monaco: Parameters<OpenApiFormatDetector["registerProvider"]>[0]): void { this.detector.registerProvider(monaco); }
  sampleContent(): string { return this.detector.sampleContent(); }
  getFileExtension(): string { return this.detector.getFileExtension(); }

  getSmartViews(): SmartView[] {
    return [{
      id: "openapi-explorer",
      languageId: "openapi",
      label: "OpenAPI Explorer",
      icon: Braces,
      component: OpenApiSmartView,
      mode: "replaces",
      priority: 1,
    }];
  }

  getStatusBarItems(): StatusBarItem[] {
    return [{
      id: "openapi-smart-view-button",
      component: (props: StatusItemProps) =>
        React.createElement(SmartViewButtons, {
          language: this.id,
          tabId: props.activeTab?.id ?? "",
        }),
      priority: 10,
    }];
  }
}

const openApiModule = new OpenApiFormatModule();
formatRegistry.register(openApiModule);
openApiModule.getSmartViews().forEach((view) => smartViewRegistry.register(view));

export const registerOpenApiProvider = (monaco: Parameters<OpenApiFormatDetector["registerProvider"]>[0]) => {
  openApiModule.registerProvider(monaco);
};
