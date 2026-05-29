import { SecretRule } from "../types";

export const privateKeyRules: SecretRule[] = [
  {
    id: "private-key-block",
    name: "Private key block",
    provider: "Private Key",
    severity: "critical",
    confidence: "high",
    reason: "private-key-block",
    regex: /-----BEGIN ((?:(?:RSA|DSA|EC|OPENSSH|PGP|ENCRYPTED) )?PRIVATE KEY(?: BLOCK)?)-----[\s\S]*?-----END \1-----/g,
    secretGroup: 0,
    explanation: "PEM armored private key material was found.",
    remediation: [
      "Treat this key as compromised if it left a protected store.",
      "Revoke or replace all identities and services that trust this key.",
      "Prefer encrypted private keys and hardware-backed keys where practical.",
    ],
  },
  {
    id: "google-service-account-private-key",
    name: "Google service account private key",
    provider: "Google Cloud",
    severity: "critical",
    confidence: "high",
    reason: "private-key-block",
    regex: /"private_key"\s*:\s*"((?:-----BEGIN PRIVATE KEY-----|-----BEGIN RSA PRIVATE KEY-----)[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----)"/g,
    secretGroup: 1,
    explanation: "Google service account JSON contains private key material.",
  },
];
