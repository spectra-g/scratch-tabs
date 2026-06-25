import React from "react";
import { formatRegistry } from "../registry";
import { DetectionResult, FormatModule, StatusBarItem } from "../types";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { ImageIcon } from "../../components/Icons";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";
import { ImageSmartView } from "./components/ImageSmartView";
import { parseImageDataUri } from "./utils/dataUri";

export class ImageFormatModule implements FormatModule {
  id = "image";
  name = "Image";
  extensions = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "svg"];
  priority = 20;

  detect(content: string): DetectionResult {
    const parsed = parseImageDataUri(content);
    if (!parsed) return { match: false, confidence: 0 };
    return {
      match: true,
      confidence: 1,
      matchedDefinitive: true,
    };
  }

  registerProvider(monaco: any): void {
    if (!monaco?.languages) return;
    monaco.languages.register({ id: "image" });
    monaco.languages.setMonarchTokensProvider("image", {
      tokenizer: {
        root: [
          [/^data:image\/[^;]+;base64,/, "keyword"],
          [/[A-Za-z0-9+/=]+/, "string"],
        ],
      },
    });
  }

  sampleContent(): string {
    return "data:image/png;base64,iVBORw0KGgo=";
  }

  getFileExtension(): string {
    return "png";
  }

  getSmartViews(): SmartView[] {
    return [
      {
        id: "image-smart-view",
        languageId: "image",
        label: "Image",
        icon: ImageIcon,
        component: ImageSmartView,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: "image-smart-view-button",
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

const imageModule = new ImageFormatModule();
formatRegistry.register(imageModule);
imageModule.getSmartViews().forEach((view) => smartViewRegistry.register(view));
