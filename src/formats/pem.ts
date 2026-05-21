import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

// All recognized PEM block types
const PEM_HEADER = /^-----BEGIN ([A-Z0-9 ]+)-----$/m;
const PEM_FOOTER = /^-----END ([A-Z0-9 ]+)-----$/m;
const PEM_BLOCK =
  /-----BEGIN ([A-Z0-9 ]+)-----[\r\n]+([\s\S]*?)[\r\n]+-----END \1-----/g;
const BASE64_LINE = /^[A-Za-z0-9+/]{1,76}={0,2}$/;

const KNOWN_TYPES = new Set([
  "CERTIFICATE",
  "CERTIFICATE REQUEST",
  "NEW CERTIFICATE REQUEST",
  "PRIVATE KEY",
  "ENCRYPTED PRIVATE KEY",
  "RSA PRIVATE KEY",
  "EC PRIVATE KEY",
  "DSA PRIVATE KEY",
  "PUBLIC KEY",
  "RSA PUBLIC KEY",
  "EC PARAMETERS",
  "DH PARAMETERS",
  "X9.42 DH PARAMETERS",
  "SSL SESSION PARAMETERS",
  "PKCS7",
  "CMS",
  "ATTRIBUTE CERTIFICATE",
]);

export class PemFormatDetector
  extends BaseFormatDetector
  implements FormatModule
{
  id = "pem";
  name = "PEM / X.509";
  extensions = ["pem", "crt", "cer", "key", "csr", "p7b", "pub"];
  priority = 9;

  sampleContent(): string {
    return `-----BEGIN CERTIFICATE-----
MIIDYzCCAkugAwIBAgIUYEziU2mfDZmH/Ziym7mlzqYrgR4wDQYJKoZIhvcNAQEL
BQAwQTEcMBoGA1UEAwwTU2NyYXRjaCBUYWJzIFNhbXBsZTEUMBIGA1UECgwLRXhh
bXBsZSBPcmcxCzAJBgNVBAYTAlVTMB4XDTI2MDUyMTA5NTgxM1oXDTM2MDUxODA5
NTgxM1owQTEcMBoGA1UEAwwTU2NyYXRjaCBUYWJzIFNhbXBsZTEUMBIGA1UECgwL
RXhhbXBsZSBPcmcxCzAJBgNVBAYTAlVTMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
MIIBCgKCAQEAt/54SLgJAKD/iCrHW4tB5kU6fbiMB0IP6+7MZwFtBFGbxtP4mial
qQnhRgmXf+GOXyAIpPJwQjNHx1zcaZbOO9obzKcNvhqKvVNrIY1x3l7hzJ+4iT0Q
Bk5JEpgYYsOfLkCRAORb7YdzxJFWjClEMR8A82C1iVgmb79q63JcJMh+3LC7wkGF
+qw46jat3g4gLirgul0So53agsH3XderX217pLHABXVlGUDjGuRBwvEqQS+58rXm
IaTV703AtQPsMmejqdzIkcRg3ibXQD70ccZL7DDiy/3URVHl7THzUnYwf4zmZUe8
/Qoo5ZMiEySxVzhdV48jwv6BauIeudhJuwIDAQABo1MwUTAdBgNVHQ4EFgQUfkvO
HH5+Z7qlM9ULRHD5pHSdfJ0wHwYDVR0jBBgwFoAUfkvOHH5+Z7qlM9ULRHD5pHSd
fJ0wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAYBLiSpogXGHf
5fTjJariVX1StvzRT5W+9ypHcXLIfqRiB4jA6A9DrGF8bhuQRRIyfigXl7F6++Yf
IUjyk90ZXXzGcfD8iSkqWN4ktGgm95htQ8lMvXOFKajL+0qZyGA0CZ9Be9kT/4Yj
umlQFgS8MH2LfEOk/MROsZPV52FeUZ08bfkR/hkIhQAyAUmISc3MOpi8x5pEp/HZ
9Qi66wwPaD3mw8TS21ykPfk8dzPQG6MJvwYke8O0NhEOpLGVnaXHbJW1iUSwHZ3u
Ypf4plh3e5BzwGxVL2QlRJWwk+GplHSVEVWvrGJEGyJTkBqxph4ZDH9XCPVP0ugp
+xr+udnuiQ==
-----END CERTIFICATE-----
`;
  }

  detect(content: string): DetectionResult {
    const trimmed = content.trim();
    if (!trimmed) return this.noMatch();

    const hasHeader = PEM_HEADER.test(trimmed);
    const hasFooter = PEM_FOOTER.test(trimmed);

    // Both markers present → definitive match
    if (hasHeader && hasFooter) {
      const typeMatch = PEM_HEADER.exec(trimmed);
      const isKnownType = typeMatch ? KNOWN_TYPES.has(typeMatch[1]) : false;
      return {
        match: true,
        confidence: isKnownType ? 0.99 : 0.92,
        matchedDefinitive: true,
      };
    }

    // Header only (partial paste) → high confidence
    if (hasHeader) {
      return { match: true, confidence: 0.85 };
    }

    // Check for base64 body with surrounding context suggesting PEM
    const lines = trimmed.split("\n");
    const base64Lines = lines.filter((l) => BASE64_LINE.test(l.trim())).length;
    if (base64Lines > 3 && base64Lines / lines.length > 0.7) {
      return { match: true, confidence: 0.6 };
    }

    return this.noMatch();
  }

  /** Count distinct PEM blocks in the content. */
  static countBlocks(content: string): number {
    return [...content.matchAll(PEM_BLOCK)].length;
  }

  /** Extract all PEM blocks as { type, base64 } pairs. */
  static parseBlocks(content: string): Array<{ type: string; base64: string }> {
    const results: Array<{ type: string; base64: string }> = [];
    for (const m of content.matchAll(PEM_BLOCK)) {
      results.push({
        type: m[1],
        base64: m[2].replace(/\s+/g, ""),
      });
    }
    return results;
  }

  registerProvider(monaco: any): void {
    if (!monaco?.languages) return;
    if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === "pem")) return;

    monaco.languages.register({ id: "pem" });
    monaco.languages.setMonarchTokensProvider("pem", {
      tokenizer: {
        root: [
          // Header/footer markers
          [/-----BEGIN [A-Z0-9 ]+-----/, "keyword.header"],
          [/-----END [A-Z0-9 ]+-----/, "keyword.footer"],
          // Base64 body
          [/[A-Za-z0-9+/]+=*/, "string"],
        ],
      },
    });

    monaco.editor.defineTheme("pem-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword.header", foreground: "4EC9B0", fontStyle: "bold" },
        { token: "keyword.footer", foreground: "4EC9B0", fontStyle: "bold" },
        { token: "string", foreground: "9CDCFE" },
      ],
      colors: {},
    });
  }
}

const pemDetector = new PemFormatDetector();
formatRegistry.register(pemDetector);
