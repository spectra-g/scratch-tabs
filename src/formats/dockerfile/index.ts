import { FormatModule } from "../types";
import { DockerfileFormatDetector } from "../dockerfile";
import { formatRegistry } from "../registry";

// Create the Dockerfile format module that implements the new interface
export class DockerfileFormatModule implements FormatModule {
  private detector: DockerfileFormatDetector;

  constructor() {
    this.detector = new DockerfileFormatDetector();
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
const dockerfileModule = new DockerfileFormatModule();
formatRegistry.register(dockerfileModule);

// Export for backward compatibility
export const registerDockerfileProvider = (monaco: any) => {
  dockerfileModule.registerProvider(monaco);
};
