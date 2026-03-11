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

[database]
server = "192.168.1.1"
ports = [8001, 8001, 8002]
enabled = true

[owner]
name = "Tom Preston-Werner"
dob = 1979-05-27T07:32:00Z
`;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      return this.noMatch();
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    if (lines.length < 2) {
      return this.noMatch();
    }

    const tablePattern = /^\[\[?[A-Za-z0-9_.-]+\]?\]$/;
    const keyValuePattern = /^[A-Za-z0-9_.-]+\s*=\s*.+$/;
    const quotedStringPattern = /=\s*"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/;
    const arrayPattern = /=\s*\[[^\]]*\]/;
    const booleanPattern = /=\s*(?:true|false)\b/;
    const datetimePattern = /=\s*\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?\b/;
    const inlineTablePattern = /=\s*\{[^}]+\}/;

    let sectionCount = 0;
    let keyValueCount = 0;
    let tomlSpecificSignals = 0;
    let structuralSignals = 0;
    let invalidLineCount = 0;

    for (const line of lines) {
      if (tablePattern.test(line)) {
        sectionCount++;
        structuralSignals++;
        continue;
      }

      if (!keyValuePattern.test(line)) {
        invalidLineCount++;
        continue;
      }

      keyValueCount++;

      if (quotedStringPattern.test(line)) {
        tomlSpecificSignals++;
      }
      if (arrayPattern.test(line)) {
        tomlSpecificSignals++;
        structuralSignals++;
      }
      if (booleanPattern.test(line)) {
        tomlSpecificSignals++;
      }
      if (datetimePattern.test(line)) {
        tomlSpecificSignals++;
        structuralSignals++;
      }
      if (inlineTablePattern.test(line)) {
        tomlSpecificSignals++;
        structuralSignals++;
      }
    }

    if (keyValueCount === 0) {
      return this.noMatch();
    }

    if (tomlSpecificSignals === 0 || structuralSignals === 0) {
      return this.noMatch();
    }

    let confidence = 0.3;
    confidence += Math.min(sectionCount, 2) * 0.22;
    confidence += Math.min(keyValueCount, 4) * 0.06;
    confidence += Math.min(tomlSpecificSignals, 4) * 0.1;
    confidence += Math.min(structuralSignals, 3) * 0.08;
    confidence -= Math.min(invalidLineCount, 2) * 0.2;

    if (/\{\s*["A-Za-z0-9_-]/.test(content) || /^\s*["']?[A-Za-z0-9_-]+["']?\s*:\s+/m.test(content) || /<\w/.test(content)) {
      confidence -= 0.4;
    }

    const isMatch = confidence >= 0.55 && invalidLineCount === 0;

    return {
      match: isMatch,
      confidence: isMatch ? Math.min(1, confidence) : 0,
      matchedDefinitive: isMatch && tomlSpecificSignals >= 2,
    };
  }

  getFileExtension(): string {
    return "toml";
  }

  registerProvider(monaco: any): void {
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === this.id)) {
      monaco.languages.register({ id: this.id });
    }
  }
}

const tomlDetector = new TomlFormatDetector();
formatRegistry.register(tomlDetector);

export const registerTomlProvider = (monaco: any) => {
  tomlDetector.registerProvider(monaco);
};
