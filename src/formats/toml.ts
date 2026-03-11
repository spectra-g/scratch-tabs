import { BaseFormatDetector } from "./baseDetector";
import { DetectionResult, FormatModule } from "./types";

export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml"];
  priority = 3;

  detect(_content: string): DetectionResult {
    return this.noMatch();
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
