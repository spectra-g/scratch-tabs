import { FormatModule } from "../types";
import { YamlFormatDetector } from "../yaml";
import { formatRegistry } from "../registry";
import { smartViewRegistry } from "../../views/registry";
import { SmartView } from "../../views/registry";
import { FileText } from "../../components/Icons";
import { YamlSmartView } from "./views/YamlSmartView";

// Create the YAML format module that implements the new interface
export class YamlFormatModule implements FormatModule {
  private detector: YamlFormatDetector;

  constructor() {
    this.detector = new YamlFormatDetector();
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
        id: "yaml-structure-explorer",
        languageId: "yaml",
        label: "Structure Explorer",
        icon: FileText,
        component: YamlSmartView,
        mode: "replaces",
        priority: 1,
      },
    ];
  }
}

// Create and register the module
const yamlModule = new YamlFormatModule();
formatRegistry.register(yamlModule);

// Register the smart view
yamlModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerYamlProvider = (monaco: any) => {
  yamlModule.registerProvider(monaco);
};