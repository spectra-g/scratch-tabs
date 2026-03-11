import { BaseFormatDetector } from "./baseDetector";
import { DetectionResult, FormatModule } from "./types";

export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml"];
  priority = 3;

  detect(content: string): DetectionResult {
    const trimmed = content.trim();

    if (!trimmed) {
      return this.noMatch();
    }

    const hasSection = /^\s*\[[^\]\n]+\]\s*$/m.test(content);
    const hasAssignment = /^\s*[A-Za-z0-9_.-]+\s*=\s*.+$/m.test(content);
    const hasComment = /^\s*#.*$/m.test(content);

    if (!hasAssignment) {
      return this.noMatch();
    }

    if (hasSection || hasComment) {
      return {
        match: true,
        confidence: 0.6,
      };
    }

    return {
      match: true,
      confidence: 0.4,
    };
  }

  sampleContent(): string {
    return `title = "TOML Example"

[database]
server = "localhost"
port = 5432
enabled = true
`;
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
