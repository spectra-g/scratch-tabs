import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

/**
 * TOML format detector.
 * Focuses on section/table syntax and TOML-style key/value assignments.
 */
export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml"];
  priority = 6;

  sampleContent(): string {
    return `# TOML configuration
title = "TOML Example"

[database]
host = "localhost"
port = 5432
enabled = true
tags = ["primary", "prod"]

[servers.alpha]
ip = "10.0.0.1"
dc = "eqdc10"

[[products]]
name = "Hammer"
sku = 738594937

inline = { env = "dev", retries = 3 }
published_at = 1979-05-27T07:32:00Z
`;
  }

  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 8) {
      return this.noMatch();
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (lines.length < 2) {
      return this.noMatch();
    }

    const tableRegex = /^\[[A-Za-z0-9_.-]+\]$/;
    const arrayTableRegex = /^\[\[[A-Za-z0-9_.-]+\]\]$/;
    const keyValueRegex = /^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/;
    const yamlKeyValueRegex = /^[A-Za-z0-9_.-]+\s*:\s+.+$/;
    const inlineTableValueRegex = /^\{.*=.*\}$/;
    const arrayValueRegex = /^\[.*\]$/;
    const quotedStringRegex = /^"(?:[^"\\]|\\.)*"$/;
    const literalStringRegex = /^'(?:[^'\\]|\\.)*'$/;
    const boolRegex = /^(true|false)$/;
    const numberRegex = /^[+-]?\d+(?:\.\d+)?$/;
    const isoDateValueRegex =
      /^\d{4}-\d{2}-\d{2}(?:[Tt ][0-9:.+-Zz]+)?$/;
    const bareWordValueRegex = /^[A-Za-z_][A-Za-z0-9_./-]*$/;

    let tableCount = 0;
    let arrayTableCount = 0;
    let keyValueCount = 0;
    let tomlSpecificFeatureCount = 0;
    let invalidLineCount = 0;
    let bareWordValueCount = 0;
    let yamlLikeLineCount = 0;
    let noSpaceEqualsCount = 0;
    let hasStrongTomlSyntax = false;

    for (const line of lines) {
      if (tableRegex.test(line)) {
        tableCount++;
        tomlSpecificFeatureCount++;
        continue;
      }

      if (arrayTableRegex.test(line)) {
        arrayTableCount++;
        tomlSpecificFeatureCount += 2;
        hasStrongTomlSyntax = true;
        continue;
      }

      if (yamlKeyValueRegex.test(line)) {
        yamlLikeLineCount++;
        invalidLineCount++;
        continue;
      }

      const keyValueMatch = line.match(keyValueRegex);
      if (keyValueMatch) {
        keyValueCount++;
        if (!line.includes(" = ") && !line.includes("= ")) {
          noSpaceEqualsCount++;
        }

        const value = keyValueMatch[2].trim();

        if (inlineTableValueRegex.test(value)) {
          tomlSpecificFeatureCount += 2;
          hasStrongTomlSyntax = true;
        } else if (arrayValueRegex.test(value)) {
          tomlSpecificFeatureCount++;
          hasStrongTomlSyntax = true;
        } else if (
          quotedStringRegex.test(value) ||
          literalStringRegex.test(value) ||
          boolRegex.test(value) ||
          numberRegex.test(value) ||
          isoDateValueRegex.test(value)
        ) {
          tomlSpecificFeatureCount++;
          if (
            quotedStringRegex.test(value) ||
            literalStringRegex.test(value) ||
            isoDateValueRegex.test(value)
          ) {
            hasStrongTomlSyntax = true;
          }
        } else if (bareWordValueRegex.test(value)) {
          bareWordValueCount++;
        }
        continue;
      }

      invalidLineCount++;
    }

    // TOML should contain at least one table and at least one key/value pair.
    if (tableCount + arrayTableCount < 1 || keyValueCount < 1) {
      return this.noMatch();
    }

    let confidence = 0.2;

    const totalLines = lines.length;
    const validTomlLines = tableCount + arrayTableCount + keyValueCount;
    const validRatio = validTomlLines / totalLines;

    confidence += validRatio * 0.45;
    confidence += Math.min(0.32, tomlSpecificFeatureCount * 0.05);

    if (tableCount + arrayTableCount > 0) {
      confidence += 0.12;
    }

    if (invalidLineCount > 0 || yamlLikeLineCount > 0) {
      confidence -= Math.min(0.2, invalidLineCount * 0.05);
      confidence -= Math.min(0.25, yamlLikeLineCount * 0.08);
    }

    if (bareWordValueCount > 0) {
      const bareWordRatio = bareWordValueCount / Math.max(1, keyValueCount);
      confidence -= Math.min(0.45, bareWordRatio * 0.6);
      if (bareWordRatio >= 0.4 && !hasStrongTomlSyntax) {
        confidence -= 0.35;
      }
    }

    if (noSpaceEqualsCount > 0) {
      confidence -= Math.min(0.1, noSpaceEqualsCount * 0.03);
    }

    // Anti-patterns for non-TOML formats.
    if (/^\s*---\s*$/m.test(content)) {
      confidence -= 0.4; // YAML front matter/doc marker
    }
    if (/<[A-Za-z][^>]*>/.test(content)) {
      confidence -= 0.4; // XML/HTML tags
    }
    if (/^\s*[A-Za-z0-9_.-]+\s*:\s+.+$/m.test(content)) {
      confidence -= 0.3; // YAML-like key: value
    }
    if (/^\s*[A-Za-z0-9_.-]+=.+$/m.test(content)) {
      confidence -= 0.12; // INI/properties no-space style key=value
    }

    confidence = Math.max(0, Math.min(1, confidence));
    const isMatch = confidence >= 0.6;

    return {
      match: isMatch,
      confidence: isMatch ? confidence : 0,
      matchedDefinitive: isMatch && confidence >= 0.82 && tomlSpecificFeatureCount > 0,
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
