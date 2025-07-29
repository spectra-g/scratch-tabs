import { FormatModule } from "../types";
import { MarkdownFormatDetector } from "../markdown";
import { formatRegistry } from "../registry";
import { smartViewRegistry } from "../../views/registry";
import { SmartView } from "../../views/registry";
import { Eye } from "../../components/Icons";
import MarkdownPreview from "./components/MarkdownPreview";

// Create the Markdown format module that implements the new interface
export class MarkdownFormatModule implements FormatModule {
  private detector: MarkdownFormatDetector;

  constructor() {
    this.detector = new MarkdownFormatDetector();
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
        id: "markdown-preview",
        languageId: "markdown",
        label: "Preview",
        icon: Eye,
        component: MarkdownPreview,
        mode: "side-by-side",
        priority: 1,
      },
    ];
  }
}

// Create and register the module
const markdownModule = new MarkdownFormatModule();
formatRegistry.register(markdownModule);

// Register the smart view
markdownModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerMarkdownProvider = (monaco: any) => {
  markdownModule.registerProvider(monaco);
};

 