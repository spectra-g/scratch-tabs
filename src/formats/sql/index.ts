import { FormatModule } from "../types";
import { SqlFormatDetector } from "../sql";
import { formatRegistry } from "../registry";

// Create the Sql format module that implements the new interface
export class SqlFormatModule implements FormatModule {
  private detector: SqlFormatDetector;

  constructor() {
    this.detector = new SqlFormatDetector();
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
}

// Create and register the module
const sqlModule = new SqlFormatModule();
formatRegistry.register(sqlModule);

// Export for backward compatibility
export const registerSqlProvider = (monaco: any) => {
  sqlModule.registerProvider(monaco);
};
