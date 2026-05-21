import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

const STRICT_KEY = /^(?:export\s+)?([A-Z][A-Z0-9_]*)=/;
const LOOSE_KEY = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=/;
const COMMENT_LINE = /^\s*#/;
const EMPTY_LINE = /^\s*$/;

export class DotenvFormatDetector
  extends BaseFormatDetector
  implements FormatModule
{
  id = "dotenv";
  name = ".env";
  extensions = ["env"];
  priority = 7;

  sampleContent(): string {
    return `# Application environment
APP_NAME=MyApp
APP_ENV=development
APP_PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb

# API Keys
API_KEY=sk-abc123def456
SECRET_KEY=supersecretkey123

# Feature flags
ENABLE_DARK_MODE=true
ENABLE_ANALYTICS=false
`;
  }

  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    if (!trimmed) return this.noMatch();

    const lines = trimmed.split("\n");
    if (lines.length < 2) return this.noMatch();

    let kvLines = 0;
    let strictKvLines = 0;
    let commentLines = 0;
    let emptyLines = 0;
    let invalidLines = 0;

    for (const line of lines) {
      if (EMPTY_LINE.test(line)) {
        emptyLines++;
        continue;
      }
      if (COMMENT_LINE.test(line)) {
        commentLines++;
        continue;
      }
      if (LOOSE_KEY.test(line)) {
        kvLines++;
        if (STRICT_KEY.test(line)) strictKvLines++;
      } else {
        invalidLines++;
      }
    }

    const meaningfulLines = lines.length - emptyLines;
    if (meaningfulLines < 2) return this.noMatch();
    if (kvLines === 0) return this.noMatch();

    const invalidRatio = invalidLines / meaningfulLines;
    if (invalidRatio > 0.2) return this.noMatch();

    const structuralRatio = (kvLines + commentLines) / meaningfulLines;
    if (structuralRatio < 0.7) return this.noMatch();

    let confidence = 0.5 + structuralRatio * 0.25;

    // Strong signal: SCREAMING_SNAKE_CASE keys are the dotenv convention
    if (strictKvLines / kvLines > 0.6) confidence += 0.15;

    // Bonus for comment-annotated structure
    if (commentLines > 0) confidence += 0.05;

    return { match: true, confidence: Math.min(1.0, confidence) };
  }

  registerProvider(monaco: any): void {
    if (!monaco?.languages) return;
    if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === "dotenv")) return;

    monaco.languages.register({ id: "dotenv" });

    monaco.languages.setMonarchTokensProvider("dotenv", {
      tokenizer: {
        root: [
          [/#.*$/, "comment"],
          [/^export(?=\s)/, "keyword"],
          [/[A-Za-z_][A-Za-z0-9_]*(?=\s*=)/, "variable"],
          [/=/, { token: "delimiter", next: "@value" }],
        ],
        value: [
          [/"/, { token: "string.quote", next: "@doubleString" }],
          [/'/, { token: "string.quote", next: "@singleString" }],
          [/#.*$/, "comment"],
          [/$/, { token: "", next: "@pop" }],
          [/[^#\n]+/, "string"],
        ],
        doubleString: [
          [/[^"\\]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, { token: "string.quote", next: "@pop" }],
        ],
        singleString: [
          [/[^'\\]+/, "string"],
          [/\\./, "string.escape"],
          [/'/, { token: "string.quote", next: "@pop" }],
        ],
      },
    });

    monaco.editor.defineTheme("dotenv-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "variable", foreground: "9CDCFE" },
        { token: "string", foreground: "CE9178" },
        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "C586C0" },
      ],
      colors: {},
    });
  }
}

const dotenvDetector = new DotenvFormatDetector();
formatRegistry.register(dotenvDetector);
