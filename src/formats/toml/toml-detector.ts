import { BaseFormatDetector } from "../baseDetector";
import { DetectionResult, FormatModule } from "../types";

export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml"];
  priority = 6;

  sampleContent(): string {
    return `title = "Quick Sample"
active = true
ports = [8080, 8081]

[server]
host = "localhost"
timeout = 30
`;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return this.noMatch();
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (lines.length < 2) {
      return this.noMatch();
    }

    let tableHeaders = 0;
    let arrayTableHeaders = 0;
    let keyValueLines = 0;
    let spacedEqualsLines = 0;
    let noSpaceEqualsLines = 0;
    let tomlSpecificSignals = 0;
    let quotedKeys = 0;
    let yamlColonLines = 0;
    let hclBlockLines = 0;
    let invalidLines = 0;

    const tableRegex = /^\[\s*[A-Za-z0-9_.-]+\s*\]$/;
    const arrayTableRegex = /^\[\[\s*[A-Za-z0-9_.-]+\s*\]\]$/;
    const keyValueRegex = /^(?:[A-Za-z0-9_.-]+|"[^"]+"|'[^']+')\s*=\s*.+$/;
    const yamlRegex = /^[A-Za-z0-9_.-]+:\s+.+$/;
    const hclBlockRegex = /^[A-Za-z_][\w-]*(?:\s+"[^"]+")*\s*\{$/;

    for (const line of lines) {
      if (arrayTableRegex.test(line)) {
        arrayTableHeaders++;
        tomlSpecificSignals++;
        continue;
      }

      if (tableRegex.test(line)) {
        tableHeaders++;
        continue;
      }

      if (yamlRegex.test(line)) {
        yamlColonLines++;
        continue;
      }

      if (hclBlockRegex.test(line)) {
        hclBlockLines++;
        continue;
      }

      if (!keyValueRegex.test(line)) {
        invalidLines++;
        continue;
      }

      keyValueLines++;

      if (/\s=\s/.test(line)) {
        spacedEqualsLines++;
      }

      if (/\S=\S/.test(line)) {
        noSpaceEqualsLines++;
      }

      if (/^(?:"[^"]+"|'[^']+')\s*=/.test(line)) {
        quotedKeys++;
        tomlSpecificSignals++;
      }

      if (/=\s*\[.*\]$/.test(line)) {
        tomlSpecificSignals++;
      }

      if (/=\s*\{[^}]*=[^}]*\}$/.test(line)) {
        tomlSpecificSignals++;
      }

      if (/=\s*(?:true|false)$/.test(line)) {
        tomlSpecificSignals++;
      }

      if (/=\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/.test(line)) {
        tomlSpecificSignals++;
      }
    }

    if (tableHeaders === 0 && arrayTableHeaders === 0 && keyValueLines === 0) {
      return this.noMatch();
    }

    if (hclBlockLines > 0 && tableHeaders === 0 && arrayTableHeaders === 0) {
      return this.noMatch();
    }

    if (yamlColonLines > 0 && keyValueLines === 0) {
      return this.noMatch();
    }

    const iniLike =
      tableHeaders > 0 &&
      keyValueLines > 0 &&
      spacedEqualsLines === 0 &&
      arrayTableHeaders === 0 &&
      tomlSpecificSignals < 2;

    if (iniLike) {
      return this.noMatch();
    }

    const propertiesLike =
      tableHeaders === 0 &&
      arrayTableHeaders === 0 &&
      keyValueLines >= 2 &&
      noSpaceEqualsLines > 0 &&
      spacedEqualsLines === 0 &&
      tomlSpecificSignals < 2;

    if (propertiesLike) {
      return this.noMatch();
    }

    let confidence = 0;

    if (tableHeaders > 0) {
      confidence += 0.35;
    }

    if (arrayTableHeaders > 0) {
      confidence += 0.35;
    }

    if (keyValueLines > 0) {
      confidence += Math.min(0.2, keyValueLines * 0.03);
    }

    if (spacedEqualsLines > 0 && spacedEqualsLines >= noSpaceEqualsLines) {
      confidence += 0.1;
    }

    if (tomlSpecificSignals > 0) {
      confidence += Math.min(0.3, tomlSpecificSignals * 0.08);
    }

    if (quotedKeys > 0) {
      confidence += 0.1;
    }

    if (yamlColonLines > 0) {
      confidence -= 0.35;
    }

    if (hclBlockLines > 0) {
      confidence -= 0.45;
    }

    const invalidRatio = invalidLines / lines.length;
    if (invalidRatio > 0.35) {
      confidence -= 0.2;
    }

    confidence = Math.max(0, Math.min(1, confidence));

    const isMatch =
      confidence >= 0.45 &&
      (arrayTableHeaders > 0 ||
        (tableHeaders > 0 && keyValueLines > 0) ||
        tomlSpecificSignals >= 2 ||
        quotedKeys > 0);

    return {
      match: isMatch,
      confidence: isMatch ? confidence : 0,
      matchedDefinitive:
        isMatch &&
        (arrayTableHeaders > 0 ||
          (tableHeaders > 0 && tomlSpecificSignals >= 2) ||
          quotedKeys > 0),
    };
  }

  registerProvider(): void {
    // Provider registration is handled by toml-format-module.ts.
  }
}
