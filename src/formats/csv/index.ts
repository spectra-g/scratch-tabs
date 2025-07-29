import { FormatModule } from "../types";
import { CsvFormatDetector } from "../csv";
import { formatRegistry } from "../registry";
import { extendedViewRegistry, ExtendedView } from "../../views/registry";
import { Table } from "../../components/Icons";
import { CsvTableViewer } from "./views/components/CsvTableViewer";

// Create the CSV format module that implements the new interface
export class CsvFormatModule implements FormatModule {
  private detector: CsvFormatDetector;

  constructor() {
    this.detector = new CsvFormatDetector();
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
        id: "csv-table",
        languageId: "csv",
        label: "Table View",
        icon: Table,
        component: CsvTableViewer,
        mode: "replaces",
        priority: 1,
      },
    ];
  }
}

// Create and register the module
const csvModule = new CsvFormatModule();
formatRegistry.register(csvModule);

// Register the extended view
csvModule.getExtendedViews()?.forEach(view => {
  extendedViewRegistry.register(view);
});

// Export for backward compatibility
export const registerCsvProvider = (monaco: any) => {
  csvModule.registerProvider(monaco);
}; 