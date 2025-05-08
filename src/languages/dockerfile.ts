import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Dockerfile language detector
 */
export class DockerfileLanguageDetector extends BaseLanguageDetector {
  id = 'dockerfile';
  name = 'Dockerfile';
  extensions = ['dockerfile'];
  priority = 4;

  sampleContent(): string {
    return `FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm","start"]`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();
    // Detect common Dockerfile directives at start of a line
    return /^(FROM|RUN|CMD|ENTRYPOINT|COPY|ADD|WORKDIR|ENV|EXPOSE|VOLUME|USER|ARG)\s+/im.test(trimmed);
  }

  registerProvider(monaco: any): void {
    // No Monaco-specific provider for Dockerfile by default
  }
}

// Register the detector
const dockerfileDetector = new DockerfileLanguageDetector();
languageRegistry.register(dockerfileDetector);

// Export the registration function
export const registerDockerfileProvider = (monaco: any) => {
  dockerfileDetector.registerProvider(monaco);
}; 