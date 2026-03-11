import { FormatModule } from "../types";
import { TomlFormatDetector } from "../toml";
import { formatRegistry } from "../registry";

export class TomlFormatModule implements FormatModule {
  private detector: TomlFormatDetector;

  constructor() {
    this.detector = new TomlFormatDetector();
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

  registerProvider(monaco: unknown): void {
    this.detector.registerProvider(monaco);
  }

  sampleContent(): string {
    return this.detector.sampleContent();
  }

  getFileExtension(): string {
    return this.detector.getFileExtension();
  }
}

const tomlModule = new TomlFormatModule();
formatRegistry.register(tomlModule);

export const registerTomlProvider = (monaco: unknown) => {
  tomlModule.registerProvider(monaco);
};
