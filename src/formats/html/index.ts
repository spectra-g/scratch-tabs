import { FormatModule } from "../types";
import { HtmlFormatDetector } from "../html";
import { formatRegistry } from "../registry";
import { extendedViewRegistry } from "../../views/registry";
import { ExtendedView } from "../../views/registry";
import { Eye } from "../../components/Icons";
import HtmlPreview from "./components/HtmlPreview";

// Create the HTML format module that implements the new interface
export class HtmlFormatModule implements FormatModule {
  private detector: HtmlFormatDetector;

  constructor() {
    this.detector = new HtmlFormatDetector();
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

  // New generic mechanism for extended views
  getExtendedViews(): ExtendedView[] {
    return [
      {
        id: "html-preview",
        languageId: "html",
        label: "Preview",
        icon: Eye,
        component: HtmlPreview,
        mode: "side-by-side",
        priority: 1,
      },
    ];
  }
}

// Create and register the module
const htmlModule = new HtmlFormatModule();
formatRegistry.register(htmlModule);

// Register the extended view
htmlModule.getExtendedViews()?.forEach(view => {
  extendedViewRegistry.register(view);
});

// Export for backward compatibility
export const registerHtmlProvider = (monaco: any) => {
  htmlModule.registerProvider(monaco);
};

 