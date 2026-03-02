import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml"];
  priority = 6;

  sampleContent(): string {
    return `title = "TOML Example"

[server]
port = 8080
enabled = true

[database.settings]
host = "localhost"
pools = [5, 10, 20]`;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return this.noMatch();
    }

    const nonEmptyLines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (nonEmptyLines.length < 2) {
      return this.noMatch();
    }

    const sectionRegex = /^\[([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\]$/;
    const arrayTableRegex = /^\[\[([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\]\]$/;
    const keyValueRegex = /^([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\s*=\s*(.+)$/;

    let sectionCount = 0;
    let dottedSectionCount = 0;
    let arrayTableCount = 0;
    let keyValueCount = 0;
    let typedTomlValueCount = 0;
    let invalidLineCount = 0;
    let semicolonCommentCount = 0;

    for (const line of nonEmptyLines) {
      if (line.startsWith("#")) {
        continue;
      }

      if (line.startsWith(";")) {
        semicolonCommentCount++;
        continue;
      }

      const sectionMatch = line.match(sectionRegex);
      if (sectionMatch) {
        sectionCount++;
        if (sectionMatch[1].includes(".")) {
          dottedSectionCount++;
        }
        continue;
      }

      if (arrayTableRegex.test(line)) {
        arrayTableCount++;
        continue;
      }

      const keyValueMatch = line.match(keyValueRegex);
      if (keyValueMatch) {
        keyValueCount++;
        const value = keyValueMatch[2].trim();

        const isTypedTomlValue =
          /^"(?:[^"\\]|\\.)*"$/.test(value) ||
          /^'(?:[^'\\]|\\.)*'$/.test(value) ||
          /^(true|false)$/.test(value) ||
          /^[+-]?\d+(?:\.\d+)?$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}(?:[Tt ].*)?$/.test(value) ||
          /^\[.*\]$/.test(value) ||
          /^\{.*\}$/.test(value);

        if (isTypedTomlValue) {
          typedTomlValueCount++;
        }
        continue;
      }

      invalidLineCount++;
    }

    if (sectionCount + arrayTableCount === 0 || keyValueCount === 0) {
      return this.noMatch();
    }

    let confidence = 0;
    confidence += 0.35;
    confidence += Math.min(0.3, 0.2 + keyValueCount * 0.1);
    confidence += Math.min(0.3, typedTomlValueCount * 0.16);

    if (dottedSectionCount > 0 || arrayTableCount > 0) {
      confidence += 0.15;
    }

    if (/^\s*[A-Za-z0-9_.-]+\s*:\s+.+$/m.test(content)) {
      confidence -= 0.4;
    }

    if ((trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) ||
      (trimmedContent.startsWith("[") && trimmedContent.endsWith("]"))) {
      confidence -= 0.5;
    }

    if (invalidLineCount > Math.ceil(nonEmptyLines.length * 0.4)) {
      confidence -= 0.3;
    }

    if (semicolonCommentCount > 0) {
      confidence -= Math.min(0.4, semicolonCommentCount * 0.2);
    }

    confidence = Math.min(1, Math.max(0, confidence));

    const isMatch = confidence >= 0.6;

    return {
      match: isMatch,
      confidence: isMatch ? confidence : 0,
      matchedDefinitive: isMatch && confidence >= 0.8,
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
  }
}

const tomlDetector = new TomlFormatDetector();
formatRegistry.register(tomlDetector);

export const registerTomlProvider = (monaco: any) => {
  tomlDetector.registerProvider(monaco);
};
