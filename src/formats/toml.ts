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
  priority = 5;

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
    const keyValueWithSpacesRegex = /^[A-Za-z0-9_.-]+\s+=\s+.+$/;
    const inlineTableRegex = /^[A-Za-z0-9_.-]+\s+=\s+\{.*=.*\}$/;
    const arrayValueRegex = /^[A-Za-z0-9_.-]+\s+=\s+\[.*\]$/;
    const isoDateValueRegex =
      /^[A-Za-z0-9_.-]+\s+=\s+\d{4}-\d{2}-\d{2}(?:[Tt ][0-9:.+-Zz]+)?$/;

    let tableCount = 0;
    let arrayTableCount = 0;
    let keyValueCount = 0;
    let tomlFeatureCount = 0;
    let invalidLineCount = 0;

    for (const line of lines) {
      if (tableRegex.test(line)) {
        tableCount++;
        continue;
      }

      if (arrayTableRegex.test(line)) {
        arrayTableCount++;
        tomlFeatureCount++;
        continue;
      }

      if (keyValueWithSpacesRegex.test(line)) {
        keyValueCount++;
        if (
          inlineTableRegex.test(line) ||
          arrayValueRegex.test(line) ||
          isoDateValueRegex.test(line)
        ) {
          tomlFeatureCount++;
        }
        continue;
      }

      invalidLineCount++;
    }

    // TOML should contain at least one table and at least one key/value pair.
    if (tableCount + arrayTableCount < 1 || keyValueCount < 1) {
      return this.noMatch();
    }

    let confidence = 0.7;

    const totalLines = lines.length;
    const validTomlLines = tableCount + arrayTableCount + keyValueCount;
    const validRatio = validTomlLines / totalLines;

    if (validRatio >= 0.9) {
      confidence += 0.15;
    } else if (validRatio >= 0.75) {
      confidence += 0.08;
    } else if (validRatio < 0.6) {
      confidence -= 0.2;
    }

    if (tomlFeatureCount > 0) {
      confidence += Math.min(0.1, tomlFeatureCount * 0.03);
    }

    if (invalidLineCount > 0) {
      confidence -= Math.min(0.15, invalidLineCount * 0.05);
    }

    // Anti-patterns for non-TOML formats.
    if (/^\s*---\s*$/m.test(content)) {
      confidence -= 0.35; // YAML front matter/doc marker
    }
    if (/<[A-Za-z][^>]*>/.test(content)) {
      confidence -= 0.4; // XML/HTML tags
    }
    if (/^\s*[A-Za-z0-9_.-]+\s*:\s+.+$/m.test(content)) {
      confidence -= 0.25; // YAML-like key: value
    }
    if (/^\s*[A-Za-z0-9_.-]+=.+$/m.test(content)) {
      confidence -= 0.08; // INI/properties no-space style key=value
    }

    confidence = Math.max(0, Math.min(1, confidence));
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
