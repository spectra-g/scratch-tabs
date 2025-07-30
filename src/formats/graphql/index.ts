import { FormatModule } from "../types";
import { GraphqlFormatDetector } from "../graphql";
import { formatRegistry } from "../registry";

// Create the Graphql format module that implements the new interface
export class GraphqlFormatModule implements FormatModule {
  private detector: GraphqlFormatDetector;

  constructor() {
    this.detector = new GraphqlFormatDetector();
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
const graphqlModule = new GraphqlFormatModule();
formatRegistry.register(graphqlModule);

// Export for backward compatibility
export const registerGraphqlProvider = (monaco: any) => {
  graphqlModule.registerProvider(monaco);
};
