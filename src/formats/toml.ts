import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

/**
 * TOML format detector - targets section tables and key-value assignments.
 */
export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml"];
  priority = 6;

  sampleContent(): string {
    return `# Welcome to TOML
# TOML is a configuration file format

[server]
host = "localhost"
port = 8080

[database]
enabled = true
servers = ["192.168.1.1", "192.168.1.2"]

[owner]
name = "Tom Preston-Werner"
dob = 1979-05-27T07:32:00Z
`;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 3) {
      return this.noMatch();
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const tableHeaderRegex = /^\[\s*[A-Za-z_][A-Za-z0-9_-]*(?:\s*\.\s*[A-Za-z_][A-Za-z0-9_-]*)*\s*\]$/;
    const keyValueRegex = /^[A-Za-z_][A-Za-z0-9_-]*(?:\s*\.\s*[A-Za-z_][A-Za-z0-9_-]*)*\s*=\s*(?:"[^"]*"|'[^']*'|true|false|[+-]?\d+(?:\.\d+)?|\[[^\]]*\]|\{[^}]*\}|\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}:\d{2}Z?)?|[^#]+)\s*(?:#.*)?$/;
    const commentRegex = /^#/;
    const yamlListRegex = /^-\s+/;

    let tableHeaders = 0;
    let keyValues = 0;
    let comments = 0;
    let yamlLike = 0;
    let invalidLines = 0;

    for (const line of lines) {
      if (commentRegex.test(line)) {
        comments++;
      } else if (tableHeaderRegex.test(line)) {
        tableHeaders++;
      } else if (keyValueRegex.test(line)) {
        keyValues++;
      } else if (yamlListRegex.test(line)) {
        yamlLike++;
      } else {
        invalidLines++;
      }
    }

    if (tableHeaders === 0 && keyValues === 0) {
      return this.noMatch();
    }

    let confidence = 0;

    if (tableHeaders > 0) {
      confidence += 0.65;
    }

    if (keyValues > 0) {
      confidence += Math.min(0.6, keyValues * 0.2);
    }

    if (tableHeaders > 0 && keyValues > 0) {
      confidence += 0.05;
    }

    if (comments > 0) {
      confidence += 0.03;
    }

    if (invalidLines > 0) {
      confidence -= Math.min(0.4, invalidLines * 0.1);
    }

    if (yamlLike > 0) {
      confidence -= Math.min(0.35, yamlLike * 0.15);
    }

    confidence = Math.min(1, Math.max(0, confidence));

    const isMatch = confidence >= 0.35;

    return {
      match: isMatch,
      confidence: isMatch ? confidence : 0,
      matchedDefinitive: isMatch && tableHeaders > 0 && confidence > 0.75,
    };
  }

  getFileExtension(): string {
    return "toml";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id;

    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "source.toml",
      tokenPostfix: ".toml",
      tokenizer: {
        root: [
          [/^\s*#.*$/, "comment.toml"],
          [/^\s*\[[^\]]+\]\s*$/, "metatag.toml"],
          [/^\s*([A-Za-z_][A-Za-z0-9_.-]*)(\s*=\s*)(.*)$/, ["key.toml", "delimiter.toml", "string.toml"]],
        ],
      },
    });
  }
}

const tomlDetector = new TomlFormatDetector();
formatRegistry.register(tomlDetector);

export const registerTomlProvider = (monaco: any) => {
  tomlDetector.registerProvider(monaco);
};
