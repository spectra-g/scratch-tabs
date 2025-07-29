import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatDetector } from "./types";

/**
 * Dockerfile language detector
 */
export class DockerfileFormatDetector
  extends BaseFormatDetector
  implements FormatDetector
{
  id = "dockerfile"; // Monaco's built-in ID for Dockerfiles
  name = "Dockerfile";
  extensions = ["dockerfile", "Dockerfile"]; // Common naming conventions
  priority = 6; // High priority due to distinctive syntax

  sampleContent(): string {
    return `# Use an official Node runtime as a parent image
FROM node:18-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm ci --only=production

# Bundle app source
COPY . .

# Second stage for a smaller final image
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Make port 80 available to the world outside this container
EXPOSE 80

# Define environment variable
ENV NODE_ENV production
ENV MY_APP_VERSION=1.0.5

# Run the app when the container launches
CMD [ "node", "dist/main.js" ]

# Add metadata to the image
LABEL version="1.0" maintainer="user@example.com"

# Specify user for subsequent commands
USER node

# Add a volume
VOLUME /app/data

# Add an argument
ARG BUILD_NUMBER=1
`;
  }

  /**
   * Detects if the given content matches Dockerfile patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 5) {
      // e.g., "FROM "
      return this.noMatch();
    }

    const trimmedContent = content.trim(); // Used for some initial checks
    let confidenceScore = 0.0;
    let instructionCount = 0;
    const distinctInstructions = new Set<string>();

    // 1. Check for common Dockerfile instructions (case-insensitive for instruction name)
    //    Instructions should generally be at the start of a line (after optional whitespace/comments).
    const instructions = [
      "FROM",
      "RUN",
      "CMD",
      "ENTRYPOINT",
      "COPY",
      "ADD",
      "WORKDIR",
      "ENV",
      "EXPOSE",
      "VOLUME",
      "USER",
      "ARG",
      "LABEL",
      "ONBUILD",
      "STOPSIGNAL",
      "HEALTHCHECK",
      "SHELL",
      "MAINTAINER", // MAINTAINER is deprecated but might appear
    ];

    const instructionRegex = new RegExp(
      `^\\s*(?:#.*\\n\\s*)*(${instructions.join("|")})\\s+`,
      "gim",
    );
    let match;
    while ((match = instructionRegex.exec(content)) !== null) {
      instructionCount++;
      distinctInstructions.add(match[1].toUpperCase());
      // Give a higher initial boost for the very common/important `FROM` instruction
      if (match[1].toUpperCase() === "FROM" && confidenceScore < 0.3) {
        confidenceScore += 0.3;
      }
    }

    if (instructionCount === 0) {
      return this.noMatch();
    }

    // Base confidence on the number of instructions found
    confidenceScore += Math.min(instructionCount, 10) * 0.05; // Max 0.5 from raw count

    // Bonus for variety of instructions
    confidenceScore += Math.min(distinctInstructions.size, 5) * 0.08; // Max 0.4 from variety

    // 2. Check for line continuations (common in Dockerfiles)
    if (/\\\s*$/m.test(content)) {
      confidenceScore += 0.1;
    }

    // 3. Comments (common, but not a strong signal on their own)
    if (/^\s*#.*$/m.test(content)) {
      confidenceScore += 0.05;
    }

    // 4. Anti-patterns
    //    If it looks strongly like another language, reduce confidence.
    const antiPatterns = [
      { pattern: /<\w.*?>/g, weight: -0.5 }, // HTML/XML tags
      {
        pattern: /\b(function|class|public\s+static\s+void\s+main)\b/i,
        weight: -0.4,
      }, // JS/Java keywords
      {
        pattern: /^\s*import\s+[\w.*]+(?:from\s*['"].*['"])?;?/im,
        weight: -0.3,
      }, // Most import styles
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // 5. Normalization and Clamping
    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status based on confidence threshold
    // Requires at least one instruction and a reasonable confidence.
    const isMatch = instructionCount > 0 && confidenceScore >= 0.35;

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
    };
  }

  getFileExtension(): string {
    return "dockerfile"; // Or just empty if the name is typically "Dockerfile"
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'dockerfile'

    // Monaco has built-in support for 'dockerfile'
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // The built-in Dockerfile tokenizer in Monaco is generally good.
    // You usually don't need to provide a custom Monarch tokenizer for it.
    // If you wanted to customize, it would look like this:
    /*
    monaco.languages.setMonarchTokensProvider(languageId, {
      // Based on Monaco's default dockerfile tokenizer, but can be customized
      defaultToken: '',
      tokenPostfix: '.dockerfile',

      instructions: [
        'ADD', 'ARG', 'CMD', 'COPY', 'ENTRYPOINT', 'ENV',
        'EXPOSE', 'FROM', 'HEALTHCHECK', 'LABEL', 'MAINTAINER',
        'ONBUILD', 'RUN', 'SHELL', 'STOPSIGNAL', 'USER', 'VOLUME',
        'WORKDIR'
      ],

      instructionArg: [
        'after', 'before', 'from', 'chown', 'checksum', 'disabled',
        'interval', 'retries', 'start-period', 'timeout',
        'port', 'proto', 'signal',
      ],

      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

      tokenizer: {
        root: [
          { include: '@whitespace' },
          { include: '@comment' },

          // Instructions (case-insensitive for the instruction itself)
          [/^(FROM|MAINTAINER|RUN|CMD|EXPOSE|ENV|ADD|ARG|COPY|ENTRYPOINT|LABEL|SHELL|STOPSIGNAL|USER|VOLUME|WORKDIR|ONBUILD|HEALTHCHECK)\b/i, { token: 'keyword.$1', next: '@instruction_body' }],

          // Instructions as keywords if not at start of line (less likely, but for robustness)
          [/[@A-Z_a-z]\w*\/, {
            cases: {
              '@instructions': { token: 'keyword.$0' },
              '@default': ''
            }
          }]
        ],

        instruction_body: [
            // Line continuation
            [/\\\s*$/, {token: 'keyword.escape', next: '@root'}], // Back to root if line continues
            [/.$/, {token: '', next: '@popall'}], // End of instruction line
             // Arguments to instructions
            [/[@A-Z_a-z]\w*\/, {
                cases: {
                    '@instructionArg': {token: 'annotation'}, // Style args differently
                    '@default': 'variable' // Default for other words in instruction body
                }
            }],
            { include: '@whitespace'},
            { include: '@strings'},
            { include: '@numbers'},
        ],

        whitespace: [
          [/\s+/, 'white']
        ],

        comment: [
          [/(^#.*$)/, 'comment', '@popall']
        ],

        strings: [
          [/'$/, 'string.escape', '@popall'],
          [/'/, 'string.escape', '@stringBody'],
          [/"$/, 'string.escape', '@popall'],
          [/"/, 'string.escape', '@dblStringBody']
        ],
        stringBody: [
          [/[^\\']+$/, 'string', '@popall'],
          [/[^\\']+/, 'string'],
          [/\\./, 'string'],
          [/'/, 'string.escape', '@popall'],
          [/\\$/, 'string']
        ],
        dblStringBody: [
          [/[^\\"]+$/, 'string', '@popall'],
          [/[^\\"]+/, 'string'],
          [/\\./, 'string'],
          [/"/, 'string.escape', '@popall'],
          [/\\$/, 'string']
        ],
        numbers: [
            [/\d+/, 'number']
        ]
      }
    });
    */

    // No specific formatter is usually needed as Dockerfile formatting is simple
    // and often handled by linters or editor extensions if more advanced formatting is desired.
  }
}

// Create and register the detector
const dockerfileDetector = new DockerfileFormatDetector();
formatRegistry.register(dockerfileDetector);

// Export for backward compatibility (optional)
export const registerDockerfileProvider = (monaco: any) => {
  dockerfileDetector.registerProvider(monaco);
};
