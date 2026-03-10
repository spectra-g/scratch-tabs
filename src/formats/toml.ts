import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

export class TomlFormatDetector
  extends BaseFormatDetector
  implements FormatModule
{
  id = "toml";
  name = "TOML";
  extensions = ["toml"];
  priority = 6;

  sampleContent(): string {
    return `# App configuration
title = "Scratch Tabs"
enabled = true
retry_count = 3

[server]
host = "localhost"
port = 3000

[database]
ports = [ 8001, 8001, 8002 ]
connection_max = 5000
enabled = true

[[users]]
name = "Alice"
role = "admin"

[[users]]
name = "Bob"
role = "viewer"`;
  }

  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 3) {
      return this.noMatch();
    }

    const lines = content.split("\n");
    const nonEmpty = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (nonEmpty.length < 3) {
      return this.noMatch();
    }

    let keyValueCount = 0;
    let tableCount = 0;
    let arrayTableCount = 0;
    let typedValueCount = 0;
    let otherCount = 0;
    let yamlLikeCount = 0;

    const keyValueRegex = /^("[^"]+"|[A-Za-z0-9_.-]+)\s*=\s*(.+)$/;
    const tableRegex = /^\[[A-Za-z0-9_.-]+\]$/;
    const arrayTableRegex = /^\[\[[A-Za-z0-9_.-]+\]\]$/;

    for (const line of nonEmpty) {
      if (arrayTableRegex.test(line)) {
        arrayTableCount++;
        tableCount++;
        continue;
      }

      if (tableRegex.test(line)) {
        tableCount++;
        continue;
      }

      const keyValueMatch = line.match(keyValueRegex);
      if (keyValueMatch) {
        keyValueCount++;
        const value = keyValueMatch[2].trim();
        if (
          /^".*"$/.test(value) ||
          /^'.*'$/.test(value) ||
          /^(true|false)$/i.test(value) ||
          /^-?\d+(\.\d+)?$/.test(value) ||
          /^\[.*\]$/.test(value) ||
          /^\{.*\}$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}([Tt ][^ ]+)?$/.test(value)
        ) {
          typedValueCount++;
        }
        continue;
      }

      if (/^[A-Za-z0-9_.-]+\s*:\s+/.test(line)) {
        yamlLikeCount++;
      }

      otherCount++;
    }

    if (keyValueCount === 0 || tableCount === 0) {
      return this.noMatch();
    }

    let confidence = 0.0;

    const structuralRatio = (keyValueCount + tableCount) / nonEmpty.length;
    if (structuralRatio >= 0.9) {
      confidence += 0.6;
    } else if (structuralRatio >= 0.75) {
      confidence += 0.45;
    } else if (structuralRatio >= 0.6) {
      confidence += 0.3;
    }

    if (arrayTableCount > 0) {
      confidence += 0.25;
    }

    if (typedValueCount > 0) {
      confidence += 0.15;
    }

    if (typedValueCount >= 3) {
      confidence += 0.1;
    }

    if (yamlLikeCount > 0) {
      confidence -= 0.3;
    }

    if (otherCount > Math.floor(nonEmpty.length * 0.25)) {
      confidence -= 0.3;
    }

    if (/[{}]\s*$/.test(trimmed) && /:\s*["{\[]/.test(trimmed)) {
      confidence -= 0.6;
    }

    const finalConfidence = Math.max(0, Math.min(1, confidence));
    const isMatch = finalConfidence >= 0.55;

    return {
      match: isMatch,
      confidence: isMatch ? finalConfidence : 0,
      matchedDefinitive: isMatch && finalConfidence >= 0.85,
    };
  }

  getFileExtension(): string {
    return "toml";
  }

  registerProvider(_monaco: any): void {
    // Safe no-op: Monaco TOML support is optional and may be configured externally.
  }
}

const tomlDetector = new TomlFormatDetector();
formatRegistry.register(tomlDetector);
