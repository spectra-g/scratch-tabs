import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

export class TomlFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "toml";
  name = "TOML";
  extensions = ["toml"];
  priority = 7;

  sampleContent(): string {
    return `# TOML Configuration File

[server]
host = "localhost"
port = 8080
debug = false

[database]
url = "postgres://user:pass@localhost/db"
max_connections = 10
timeout = 30.5

[[products]]
name = "Widget"
price = 9.99
sku = 0x1A2B

[[products]]
name = "Gadget"
price = 24.99

[metadata]
created_at = 2024-01-15T10:30:00Z
tags = ["web", "api", "v2"]
settings = { retries = 3, backoff = 1.5 }
`;
  }

  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length < 3) return this.noMatch();

    const lines = trimmed.split("\n");
    const nonEmptyLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);
    if (nonEmptyLines.length <= 2) return this.noMatch();

    let confidenceScore = 0.0;
    let strongSignalFound = false;
    let sectionCount = 0;

    // Decisive signals — TOML-only
    if (/\[\[[\w.-]+\]\]/m.test(trimmed)) {
      confidenceScore += 0.7;
      strongSignalFound = true;
    }

    const datetimeMatches = trimmed.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/g);
    if (datetimeMatches) {
      confidenceScore += Math.min(datetimeMatches.length * 0.35, 0.5);
      strongSignalFound = true;
    }

    if (/"""[\s\S]*?"""/m.test(trimmed)) {
      confidenceScore += 0.3;
      strongSignalFound = true;
    }

    if (/\b0x[0-9A-Fa-f_]+|\b0o[0-7_]+|\b0b[01_]+/m.test(trimmed)) {
      confidenceScore += 0.2;
      strongSignalFound = true;
    }

    // Typed-value signals
    let typedValueScore = 0;
    if (/\b\d[\d_]+\b/.test(trimmed)) typedValueScore += 0.1;
    if (/[+-]?(?:\d[\d_]*\.[\d_]+(?:[eE][+-]?\d+)?|\binf\b|\bnan\b)/.test(trimmed)) typedValueScore += 0.1;
    confidenceScore += Math.min(typedValueScore, 0.2);

    // Inline tables
    if (/=\s*\{[^}]+\}/.test(trimmed)) {
      confidenceScore += 0.2;
    }

    // Dotted keys — two or more occurrences
    const dottedKeyMatches = trimmed.match(/^\s*[\w-]+\.[\w.-]+\s*=/gm);
    if (dottedKeyMatches && dottedKeyMatches.length >= 2) {
      confidenceScore += 0.15;
    }

    // Standard table + key-value pairs
    const tableMatches = trimmed.match(/^\s*\[[^\[\]]+\]\s*$/gm);
    if (tableMatches && tableMatches.length > 0) {
      sectionCount = tableMatches.length;
      const keyValueMatches = trimmed.match(/^\s*[\w.-]+\s*=/gm);
      if (keyValueMatches && keyValueMatches.length > 0) {
        confidenceScore += 0.4;
      }
    }

    // Hash comments
    if (/#/.test(trimmed)) confidenceScore += 0.05;

    // Anti-patterns
    if (/^\s*;/m.test(trimmed)) confidenceScore -= 0.4;

    const colonValueMatches = trimmed.match(/^\s*[\w.-]+\s*:/gm);
    if (colonValueMatches) {
      confidenceScore -= Math.min(colonValueMatches.length * 0.35, 0.5);
    }

    if (/^\s*\[[^\]]+\s+"[^"]+"\]/m.test(trimmed)) confidenceScore -= 0.2;

    // JSON object at root — note: TOML uses [headers], not {
    if (/^\s*\{/.test(trimmed)) confidenceScore -= 0.5;
    if (/<\w.*?>/.test(trimmed)) confidenceScore -= 0.5;
    if (/\b(function|class|import|export|def|public|private)\b/i.test(trimmed)) confidenceScore -= 0.5;

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = confidenceScore >= 0.5 && (strongSignalFound || sectionCount >= 1);
    const matchedDefinitive = confidenceScore >= 0.7 && (strongSignalFound || sectionCount >= 1);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive,
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
      defaultToken: "",
      ignoreCase: false,
      tokenPostfix: ".toml",

      tokenizer: {
        root: [
          [/^\s*#.*$/, "comment"],
          [/^\s*\[\[/, { token: "delimiter.square", next: "@aot_header" }],
          [/^\s*\[/, { token: "delimiter.square", next: "@table_header" }],
          [/^\s*([\w-]+(?:\.[\w-]+)+)(\s*)(=)/, ["variable.name", "", "operator"]],
          [/^\s*([\w-]+)(\s*)(=)/, ["variable.name", "", "operator"]],
          [/=/, { token: "operator", next: "@value" }],
          [/\s+/, ""],
        ],

        value: [
          [/"""/, { token: "string", next: "@multiline_basic_string" }],
          [/'''/, { token: "string", next: "@multiline_literal_string" }],
          [/"([^"\\]|\\.)*"/, "string"],
          [/'[^']*'/, "string"],
          [/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}[^\s,\]#]*/, "number.date"],
          [/[+-]?(?:0x[0-9A-Fa-f_]+|0o[0-7_]+|0b[01_]+)/, "number"],
          [/[+-]?(?:\d[\d_]*\.[\d_]+(?:[eE][+-]?\d+)?|inf|nan)/, "number.float"],
          [/[+-]?\d[\d_]*/, "number"],
          [/\b(true|false)\b/, "keyword"],
          [/\{/, { token: "delimiter.curly", next: "@inline_table" }],
          [/\[/, { token: "delimiter.square", next: "@array" }],
          [/#.*$/, { token: "comment", next: "@pop" }],
          [/$/, { token: "", next: "@pop" }],
          [/,/, { token: "delimiter", next: "@pop" }],
        ],

        table_header: [
          [/[^\]]+/, "type.identifier"],
          [/\]/, { token: "delimiter.square", next: "@pop" }],
        ],

        aot_header: [
          [/[^\]]+/, "type.identifier"],
          [/\]\]/, { token: "delimiter.square", next: "@pop" }],
          [/\]/, { token: "delimiter.square" }],
        ],

        multiline_basic_string: [
          [/"""/, { token: "string", next: "@pop" }],
          [/./, "string"],
          [/\n/, "string"],
        ],

        multiline_literal_string: [
          [/'''/, { token: "string", next: "@pop" }],
          [/./, "string"],
          [/\n/, "string"],
        ],

        array: [
          { include: "@value" },
          [/,/, "delimiter"],
          [/\s+/, ""],
          [/\]/, { token: "delimiter.square", next: "@pop" }],
        ],

        inline_table: [
          [/([\w-]+)(\s*)(=)/, ["variable.name", "", "operator"]],
          { include: "@value" },
          [/,/, "delimiter"],
          [/\s+/, ""],
          [/\}/, { token: "delimiter.curly", next: "@pop" }],
        ],
      },
    });

    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "type.identifier", foreground: "4EC9B0", fontStyle: "bold" },
        { token: "variable.name", foreground: "9CDCFE" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "number.float", foreground: "B5CEA8" },
        { token: "number.date", foreground: "B5CEA8" },
        { token: "keyword", foreground: "569CD6" },
        { token: "operator", foreground: "D4D4D4" },
        { token: "delimiter.curly", foreground: "C586C0" },
        { token: "delimiter.square", foreground: "C586C0" },
        { token: "delimiter", foreground: "D4D4D4" },
      ],
      colors: {},
    });

    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        const formatted = formatTomlLines(lines);
        return [{ range: model.getFullModelRange(), text: formatted.join("\n") }];
      },
    });
  }
}

function formatTomlLines(lines: string[]): string[] {
  // Group lines into table blocks and normalize spacing within each block
  const result: string[] = [];
  let blockLines: string[] = [];

  const flushBlock = () => {
    if (blockLines.length === 0) return;
    const maxKeyLen = blockLines.reduce((max, line) => {
      const m = line.match(/^([\w.-]+)\s*=/);
      return m ? Math.max(max, m[1].length) : max;
    }, 0);
    for (const line of blockLines) {
      const m = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
      if (m) {
        const padding = " ".repeat(Math.max(0, maxKeyLen - m[1].length));
        result.push(`${m[1]}${padding} = ${m[2].trim()}`);
      } else {
        result.push(line);
      }
    }
    blockLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[/.test(trimmed) || trimmed === "") {
      flushBlock();
      result.push(line);
    } else if (/^#/.test(trimmed)) {
      flushBlock();
      result.push(line);
    } else {
      blockLines.push(trimmed);
    }
  }
  flushBlock();
  return result;
}

const tomlDetector = new TomlFormatDetector();
formatRegistry.register(tomlDetector);

export const registerTomlProvider = (monaco: any) => tomlDetector.registerProvider(monaco);
