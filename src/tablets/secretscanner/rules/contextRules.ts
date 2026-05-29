import { SecretRule } from "../types";

const SECRET_NAME_SOURCE =
  "secret|token|password|passwd|pwd|pass|private[_\\-]?key|api[_\\-]?key|client[_\\-]?secret|access[_\\-]?key|connection[_\\-]?string|auth";
const SECRET_ASSIGNMENT_NAME_SOURCE = `[A-Za-z0-9_.\\-]*(?:${SECRET_NAME_SOURCE})[A-Za-z0-9_.\\-]*`;

export const contextRules: SecretRule[] = [
  {
    id: "secret-assignment",
    name: "Secret-like assignment",
    provider: "Generic",
    severity: "high",
    confidence: "medium",
    reason: "secret-name-context",
    regex: new RegExp(
      `\\b${SECRET_ASSIGNMENT_NAME_SOURCE}\\b\\s*[:=]\\s*(?:"([^"\\r\\n]{8,500})"|'([^'\\r\\n]{8,500})'|([^\\s"'\\r\\n]{8,500}))`,
      "gi",
    ),
    secretGroup: 1,
    explanation: "Secret-like variable name is assigned a long opaque value.",
  },
  {
    id: "azure-storage-key",
    name: "Azure storage key",
    provider: "Azure",
    severity: "critical",
    confidence: "high",
    reason: "secret-name-context",
    regex: /\b(?:AccountKey|SharedAccessKey)\s*=\s*([A-Za-z0-9+/=]{40,200})\b/g,
    secretGroup: 1,
    explanation: "Azure connection string contains an account key.",
  },
  {
    id: "kubernetes-secret-value",
    name: "Kubernetes secret value",
    provider: "Kubernetes",
    severity: "high",
    confidence: "medium",
    reason: "secret-name-context",
    regex: /\b(?:data|stringData):[\s\S]{0,400}?\n\s+[A-Za-z0-9_.\-]+:\s*["']?([A-Za-z0-9+/=]{20,500})["']?/g,
    secretGroup: 1,
    explanation: "Kubernetes Secret manifest contains a long encoded value.",
  },
];
