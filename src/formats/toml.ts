import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

/**
 * TOML format detector
 */
export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml", ".toml"];
  priority = 6;

  sampleContent(): string {
    return `# TOML configuration

[database]
server = "192.168.1.1"
ports = [8001, 8001, 8002]
connection_max = 5000
enabled = true

[servers.alpha]
ip = "10.0.0.1"
dc = "eqdc10"

[[products]]
name = "Hammer"
sku = 738594937
available_on = 2026-01-01T00:00:00Z
`;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 5) {
      return this.noMatch();
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 3) {
      return this.noMatch();
    }

    const tableArrayRegex = /^\s*\[\[[A-Za-z0-9_.-]+\]\]\s*$/;
    const tableRegex = /^\s*\[[A-Za-z0-9_.-]+\]\s*$/;
    const keyValueRegex =
      /^\s*(?:"[^"]+"|'[^']+'|[A-Za-z0-9_.-]+)\s*=\s*(.+)\s*$/;
    const spacedKeyValueRegex =
      /^\s*(?:"[^"]+"|'[^']+'|[A-Za-z0-9_.-]+)\s+=\s+(.+)\s*$/;
    const tightEqualsRegex =
      /^\s*(?:"[^"]+"|'[^']+'|[A-Za-z0-9_.-]+)=.+$/;
    const yamlLikeRegex = /^\s*[A-Za-z0-9_.-]+\s*:\s+.+$/;

    let tableArrayCount = 0;
    let tableCount = 0;
    let keyValueCount = 0;
    let spacedKeyValueCount = 0;
    let tightEqualsCount = 0;
    let typedValueCount = 0;
    let bareWordValueCount = 0;
    let commentCount = 0;
    let iniCommentCount = 0;
    let yamlLikeCount = 0;
    let otherLineCount = 0;

    for (const line of lines) {
      if (line.startsWith("#")) {
        commentCount++;
        continue;
      }

      if (line.startsWith(";")) {
        iniCommentCount++;
        otherLineCount++;
        continue;
      }

      if (tableArrayRegex.test(line)) {
        tableArrayCount++;
        continue;
      }

      if (tableRegex.test(line)) {
        tableCount++;
        continue;
      }

      if (keyValueRegex.test(line)) {
        keyValueCount++;
        if (spacedKeyValueRegex.test(line)) {
          spacedKeyValueCount++;
        }
        if (tightEqualsRegex.test(line)) {
          tightEqualsCount++;
        }

        const valueMatch = line.match(keyValueRegex);
        const value = valueMatch?.[1]?.trim() || "";
        const isTypedValue =
          /^".*"$/.test(value) ||
          /^'.*'$/.test(value) ||
          /^-?\d+(?:\.\d+)?$/.test(value) ||
          /^(true|false)$/i.test(value) ||
          /^\[.*\]$/.test(value) ||
          /^\{.*\}$/.test(value) ||
          /^\d{4}-\d{2}-\d{2}(?:[Tt ][^\s]+)?$/.test(value);

        if (isTypedValue) {
          typedValueCount++;
        } else if (/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value)) {
          // Bare word values are common in INI/properties but generally invalid TOML.
          bareWordValueCount++;
        }

        continue;
      }

      if (yamlLikeRegex.test(line)) {
        yamlLikeCount++;
      }

      otherLineCount++;
    }

    const nonCommentLines = lines.length - commentCount;
    const structuralLines = tableArrayCount + tableCount + keyValueCount;

    if (nonCommentLines <= 0 || structuralLines < 2) {
      return this.noMatch();
    }

    let confidenceScore = 0;

    if (tableArrayCount > 0) {
      confidenceScore += 0.35;
    }

    if (tableCount > 0) {
      confidenceScore += Math.min(0.25, tableCount * 0.1);
    }

    if (keyValueCount > 0) {
      confidenceScore += Math.min(0.35, keyValueCount * 0.05);
    }

    if (typedValueCount > 0) {
      confidenceScore += Math.min(0.2, typedValueCount * 0.03);
    }

    if (commentCount > 0) {
      confidenceScore += 0.05;
    }

    const structuralRatio = structuralLines / nonCommentLines;
    if (structuralRatio >= 0.85) {
      confidenceScore += 0.2;
    } else if (structuralRatio >= 0.65) {
      confidenceScore += 0.12;
    } else if (structuralRatio >= 0.45) {
      confidenceScore += 0.05;
    } else {
      confidenceScore -= 0.25;
    }

    if (tableArrayCount > 0 && keyValueCount >= 2) {
      confidenceScore += 0.1;
    }

    if (tableCount > 0 && keyValueCount > 0) {
      confidenceScore += 0.08;
    }

    if (tightEqualsCount > 0 && keyValueCount > 0) {
      const tightRatio = tightEqualsCount / keyValueCount;
      confidenceScore -= Math.min(0.25, tightRatio * 0.25);
    }

    if (yamlLikeCount > 0) {
      confidenceScore -= Math.min(0.4, yamlLikeCount * 0.12);
    }

    if (iniCommentCount > 0) {
      confidenceScore -= 0.12;
    }

    if (bareWordValueCount > 0) {
      confidenceScore -= Math.min(0.45, bareWordValueCount * 0.15);
    }

    if (otherLineCount > nonCommentLines * 0.4) {
      confidenceScore -= 0.2;
    }

    const antiPatterns = [
      { pattern: /<\w.*?>/g, weight: -0.5, threshold: 1 },
      {
        pattern:
          /\b(function|class|var|let|const|import|export|def|public|private)\b/i,
        weight: -0.6,
        threshold: 1,
      },
      {
        pattern: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP)\b/i,
        weight: -0.6,
        threshold: 1,
      },
      { pattern: /=>|->|#!/g, weight: -0.5, threshold: 1 },
      { pattern: /^\s*\{\s*"[^"]+"\s*:/m, weight: -0.5, threshold: 1 },
    ];

    for (const antiPattern of antiPatterns) {
      const matches = content.match(antiPattern.pattern);
      if (matches && matches.length >= antiPattern.threshold) {
        confidenceScore += antiPattern.weight;
      }
    }

    confidenceScore = Math.min(1, Math.max(0, confidenceScore));

    const isMatch =
      confidenceScore >= 0.45 &&
      structuralLines >= 2 &&
      (keyValueCount >= 2 || tableCount > 0 || tableArrayCount > 0);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0,
      matchedDefinitive:
        isMatch &&
        confidenceScore >= 0.8 &&
        (tableArrayCount > 0 || tableCount > 0) &&
        spacedKeyValueCount >= 2,
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

    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "source.toml",
      tokenPostfix: ".toml",

      tokenizer: {
        root: [
          [/^\s*#.*$/, "comment.toml"],
          [/^\s*\[\[[A-Za-z0-9_.-]+\]\]\s*$/, "type.identifier.toml"],
          [/^\s*\[[A-Za-z0-9_.-]+\]\s*$/, "type.toml"],
          [
            /^\s*("[^"]+"|'[^']+'|[A-Za-z0-9_.-]+)(\s*=\s*)(.*)$/, 
            ["keyword.toml", "delimiter.toml", "string.toml"],
          ],
          [/\b(true|false)\b/, "constant.language.boolean.toml"],
          [/\b-?\d+(?:\.\d+)?\b/, "number.toml"],
          [/\b\d{4}-\d{2}-\d{2}(?:[Tt ][^\s]+)?\b/, "number.date.toml"],
        ],
      },
    });

    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "type", foreground: "4EC9B0", fontStyle: "bold" },
        { token: "type.identifier", foreground: "4EC9B0", fontStyle: "bold" },
        { token: "keyword", foreground: "9CDCFE" },
        { token: "delimiter", foreground: "d4d4d4" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
      ],
      colors: {},
    });

    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        return [
          {
            range: model.getFullModelRange(),
            text: model.getValue(),
          },
        ];
      },
    });
  }
}

const tomlDetector = new TomlFormatDetector();
formatRegistry.register(tomlDetector);

export const registerTomlProvider = (monaco: any) => {
  tomlDetector.registerProvider(monaco);
};
