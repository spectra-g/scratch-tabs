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
    const yamlStyleLineRegex = /^\s*[A-Za-z0-9_.-]+\s*:\s+.+$/;

    let sectionCount = 0;
    let dottedSectionCount = 0;
    let arrayTableCount = 0;
    let keyValueCount = 0;
    let typedTomlValueCount = 0;
    let arrayValueCount = 0;
    let inlineTableCount = 0;
    let datetimeValueCount = 0;
    let dottedKeyCount = 0;
    let quotedValueCount = 0;
    let barewordValueCount = 0;
    let hclBlockLineCount = 0;
    let invalidLineCount = 0;
    let semicolonCommentCount = 0;
    let yamlStyleLineCount = 0;

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
        if (keyValueMatch[1].includes(".")) {
          dottedKeyCount++;
        }
        const value = keyValueMatch[2].trim();
        const isQuotedValue =
          /^"(?:[^"\\]|\\.)*"$/.test(value) ||
          /^'(?:[^'\\]|\\.)*'$/.test(value);
        const isArrayValue = /^\[.*\]$/.test(value);
        const isInlineTableValue = /^\{.*\}$/.test(value);
        const isDatetimeValue = /^\d{4}-\d{2}-\d{2}(?:[Tt ].*)?$/.test(value);
        const isBarewordValue = /^[A-Za-z0-9_.-]+$/.test(value);

        const isTypedTomlValue =
          isQuotedValue ||
          /^(true|false)$/.test(value) ||
          /^[+-]?\d+(?:\.\d+)?$/.test(value) ||
          isDatetimeValue ||
          isArrayValue ||
          isInlineTableValue;

        if (isTypedTomlValue) {
          typedTomlValueCount++;
        }
        if (isArrayValue) {
          arrayValueCount++;
        }
        if (isInlineTableValue) {
          inlineTableCount++;
        }
        if (isDatetimeValue) {
          datetimeValueCount++;
        }
        if (isQuotedValue) {
          quotedValueCount++;
        }
        if (isBarewordValue) {
          barewordValueCount++;
        }
        continue;
      }

      if (/^\s*[A-Za-z_][A-Za-z0-9_-]*(?:\s+"[^"]+"){0,2}\s*\{/.test(line)) {
        hclBlockLineCount++;
      }

      if (yamlStyleLineRegex.test(line)) {
        yamlStyleLineCount++;
      }

      invalidLineCount++;
    }

    if (keyValueCount === 0) {
      return this.noMatch();
    }

    let confidence = 0;
    confidence += 0.3;
    confidence += Math.min(0.25, keyValueCount * 0.08);

    const typedRatio = typedTomlValueCount / keyValueCount;
    confidence += Math.min(0.22, typedRatio * 0.22);

    const strongTomlSignals = arrayValueCount + inlineTableCount + datetimeValueCount;
    confidence += Math.min(0.2, strongTomlSignals * 0.07);

    if (sectionCount + arrayTableCount > 0) {
      confidence += 0.2;
    }

    if (dottedSectionCount > 0 || arrayTableCount > 0) {
      confidence += 0.08;
    }

    if (quotedValueCount > 0) {
      confidence += Math.min(0.08, quotedValueCount * 0.03);
    }

    if (yamlStyleLineCount > 0) {
      confidence -= Math.min(0.45, yamlStyleLineCount * 0.15);
    }

    if ((trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) ||
      (trimmedContent.startsWith("[") && trimmedContent.endsWith("]"))) {
      confidence -= 0.5;
    }

    const hasIniLikeOverlap =
      sectionCount > 0 &&
      keyValueCount > 0 &&
      strongTomlSignals === 0 &&
      barewordValueCount / keyValueCount >= 0.5;
    if (hasIniLikeOverlap) {
      confidence -= 0.22;
    }

    const hasPropertiesLikeOverlap =
      sectionCount + arrayTableCount === 0 &&
      keyValueCount >= 3 &&
      dottedKeyCount / keyValueCount >= 0.5 &&
      strongTomlSignals <= 1;
    if (hasPropertiesLikeOverlap) {
      confidence -= 0.35;
    }

    const hasYamlLikeOverlap =
      trimmedContent.startsWith("---") ||
      (yamlStyleLineCount >= 2 && keyValueCount <= 1);
    if (hasYamlLikeOverlap) {
      confidence -= 0.3;
    }

    const hasHclLikeOverlap =
      hclBlockLineCount > 0 ||
      (/\{/.test(content) && /\}/.test(content) && strongTomlSignals === 0);
    if (hasHclLikeOverlap) {
      confidence -= 0.45;
    }

    if (invalidLineCount > Math.ceil(nonEmptyLines.length * 0.4)) {
      confidence -= 0.3;
    }

    if (semicolonCommentCount > 0) {
      confidence -= Math.min(0.4, semicolonCommentCount * 0.2);
    }

    confidence = Math.min(1, Math.max(0, confidence));

    const isMatch = confidence >= 0.35;

    return {
      match: isMatch,
      confidence: isMatch ? confidence : 0,
      matchedDefinitive: isMatch && confidence >= 0.85,
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
