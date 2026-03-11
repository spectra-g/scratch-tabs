import { BaseFormatDetector } from "./baseDetector";
import { DetectionResult, FormatModule } from "./types";

export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml", "tml"];
  priority = 6;

  detect(content: string): DetectionResult {
    const trimmed = content.trim();

    if (!trimmed) {
      return this.noMatch();
    }

    const nonEmptyLines = content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const tableHeaderPattern =
      /^\s*\[(?:"[^"\n]+"|'[^'\n]+'|[A-Za-z0-9_-]+)(?:\.(?:"[^"\n]+"|'[^'\n]+'|[A-Za-z0-9_-]+))*\]\s*$/gm;
    const arrayTableHeaderPattern =
      /^\s*\[\[(?:"[^"\n]+"|'[^'\n]+'|[A-Za-z0-9_-]+)(?:\.(?:"[^"\n]+"|'[^'\n]+'|[A-Za-z0-9_-]+))*\]\]\s*$/gm;
    const keyValueMatches =
      content.match(
        /^\s*(?:"[^"\n]+"|'[^'\n]+'|[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\s*=\s*.+$/gm,
      ) ?? [];
    const tableMatches = content.match(tableHeaderPattern) ?? [];
    const arrayTableMatches = content.match(arrayTableHeaderPattern) ?? [];
    const hashComments = content.match(/^\s*#.*$/gm) ?? [];
    const semicolonComments = content.match(/^\s*;.*$/gm) ?? [];

    if (keyValueMatches.length === 0) {
      return this.noMatch();
    }

    let confidence = 0.25;

    if (tableMatches.length > 0) {
      confidence += 0.35;
    }
    if (arrayTableMatches.length > 0) {
      confidence += 0.2;
    }
    confidence += Math.min(keyValueMatches.length, 4) * 0.1;
    confidence += Math.min(hashComments.length, 2) * 0.05;

    if (/\{[^}\n]*\b[A-Za-z0-9_-]+\s*=\s*[^}\n]+\}/.test(content)) {
      confidence += 0.1;
    }
    if (/^\s*[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+\s*=\s*.+$/m.test(content)) {
      confidence += 0.05;
    }
    if (
      /=\s*(?:\d{4}-\d{2}-\d{2}[T ][0-9:.+-]+Z?|\[.*\]|true|false|".*"|'.*')/m.test(
        content,
      )
    ) {
      confidence += 0.05;
    }

    if (semicolonComments.length > 0) {
      confidence -= 0.35;
    }
    if (/^\s*\[[^\]\n]+\]\s*=\s*.+$/m.test(content)) {
      confidence -= 0.15;
    }

    confidence = Math.max(0, Math.min(1, confidence));

    const hasTomlSpecificStructure =
      arrayTableMatches.length > 0 ||
      /\{[^}\n]*\b[A-Za-z0-9_-]+\s*=\s*[^}\n]+\}/.test(content) ||
      /^\s*[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+\s*=\s*.+$/m.test(content);
    const isTomlLike =
      (tableMatches.length > 0 || arrayTableMatches.length > 0) &&
      keyValueMatches.length > 0 &&
      nonEmptyLines.length >= 3 &&
      !(semicolonComments.length > 0 && !hasTomlSpecificStructure);
    const matchedDefinitive =
      isTomlLike &&
      confidence >= 0.9 &&
      semicolonComments.length === 0 &&
      hasTomlSpecificStructure;

    return {
      match: isTomlLike || confidence >= 0.65,
      confidence: isTomlLike || confidence >= 0.65 ? confidence : 0,
      matchedDefinitive,
    };
  }

  sampleContent(): string {
    return `title = "TOML Example"

[database]
server = "localhost"
port = 5432
enabled = true
connection.timeout = 30
metadata = { owner = "ops", region = "eu-west-2" }

[[service.instances]]
name = "api"
`;
  }

  getFileExtension(): string {
    return ".toml";
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
          [/^\s*\[\[[^\]]+\]\]\s*$/, "keyword.toml"],
          [/^\s*\[[^\]]+\]\s*$/, "keyword.toml"],
          [
            /^\s*("[^"]+"|'[^']+'|[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)(\s*=\s*)/,
            ["key.toml", "delimiter.toml"],
          ],
          [/".*?"/, "string.toml"],
          [/'.*?'/, "string.toml"],
          [/\b\d+(?:\.\d+)?\b/, "number.toml"],
          [/\b(?:true|false)\b/, "keyword.toml"],
        ],
      },
    });
  }
}
