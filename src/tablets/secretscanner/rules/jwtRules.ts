import { SecretRule } from "../types";

export const jwtRules: SecretRule[] = [
  {
    id: "jwt-token",
    name: "JSON Web Token",
    provider: "JWT",
    severity: "medium",
    confidence: "medium",
    reason: "jwt-structure",
    regex: /\b(eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,})\b/g,
    secretGroup: 1,
    explanation: "Matches the three-part JWT structure and decodable base64url header.",
  },
];
