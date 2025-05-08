import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * GraphQL language detector
 */
export class GraphqlLanguageDetector extends BaseLanguageDetector {
  id = 'graphql';
  name = 'GraphQL';
  extensions = ['graphql', 'gql'];
  priority = 4;

  sampleContent(): string {
    return `type Query {
  hello: String
}`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    return /\btype\s+\w+\s*{/.test(content)
        || /\bschema\s*{/.test(content)
        || /\bquery\s*\{/.test(content)
        || /\bmutation\s*\{/.test(content);
  }

  registerProvider(monaco: any): void {
    // No Monaco provider for GraphQL by default
  }
}

const graphqlDetector = new GraphqlLanguageDetector();
languageRegistry.register(graphqlDetector);
export const registerGraphqlProvider = (monaco: any) => {
  graphqlDetector.registerProvider(monaco);
}; 