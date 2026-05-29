import { SecretRule } from "../types";

export const credentialUrlRules: SecretRule[] = [
  {
    id: "url-embedded-credentials",
    name: "URL with embedded credentials",
    provider: "URL",
    severity: "high",
    confidence: "high",
    reason: "credential-url",
    regex: /\b([a-z][a-z0-9+.\-]*:\/\/[^:\s/@]+:[^@\s]+@[^\s"'`<>]+)\b/gi,
    secretGroup: 1,
    explanation: "URL includes username and password material before the host.",
  },
];
