import { FormatModule } from "../types";
import { StacktraceFormatDetector } from "../stacktrace";
import { formatRegistry } from "../registry";
import { smartViewRegistry } from "../../views/registry";
import { SmartView } from "../../views/registry";
import { FileTerminal } from "../../components/Icons";
import { StackTraceViewer } from "./views/components/StackTraceViewer";

// Create the Stacktrace format module that implements the new interface
export class StacktraceFormatModule implements FormatModule {
  private detector: StacktraceFormatDetector;

  constructor() {
    this.detector = new StacktraceFormatDetector();
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
        id: "stacktrace-explorer",
        languageId: "stacktrace",
        label: "Trace Explorer",
        icon: FileTerminal,
        component: StackTraceViewer,
        mode: "replaces",
        priority: 1,
      },
    ];
  }
}

// Create and register the module
const stacktraceModule = new StacktraceFormatModule();
formatRegistry.register(stacktraceModule);

// Register the smart view
stacktraceModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerStacktraceProvider = (monaco: any) => {
  stacktraceModule.registerProvider(monaco);
};
