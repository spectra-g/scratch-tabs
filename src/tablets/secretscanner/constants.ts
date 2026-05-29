import { SecretSeverity } from "./types";

export const SECRET_SCANNER_LABEL = "Secret Scanner";

export const DEFAULT_REMEDIATION = [
  "Revoke and rotate this credential.",
  "Remove it from committed files and generated artifacts.",
  "Audit recent usage for unexpected access.",
  "Move the value to a secret manager or protected runtime variable.",
];

export const SEVERITY_RANK: Record<SecretSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export const PLACEHOLDER_WORDS = [
  "example",
  "sample",
  "dummy",
  "test",
  "changeme",
  "change_me",
  "your_api_key",
  "your-token",
  "replace_me",
  "placeholder",
  "redacted",
  "password",
  "secret",
  "xxxx",
  "0000",
  "123456",
];

export const SECRET_NAME_PATTERN =
  /(secret|token|password|passwd|pwd|private[_-]?key|api[_-]?key|client[_-]?secret|access[_-]?key|connection[_-]?string|auth)/i;
