export interface JwtState {
  token: string;
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
  isValid: boolean | null;
  error: string | null;
  warning: string | null;
  activeTab: string;
  history: JwtHistoryItem[];
  storedKeys: StoredKey[];
  verificationKey: string;
  verificationKeyType: KeyType;
  signingKey: string;
  signingKeyType: KeyType;
  signingAlgorithm: string;
}

export interface JwtHistoryItem {
  token: string;
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
  timestamp: number;
}

export type KeyType = "text" | "base64" | "pem";

export interface StoredKey {
  name: string;
  value: string;
  type: KeyType;
  algorithm?: string;
  isPublic: boolean;
  createdAt: number;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: string;
}

export interface JwtParts {
  header: string;
  payload: string;
  signature: string;
}

export interface DecodedJwt {
  header: Record<string, any>;
  payload: Record<string, any>;
  signature: string;
  warning?: string | null;
}

export interface VerificationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface SigningResult {
  token: string;
  error?: string;
}

export interface ClaimInfo {
  name: string;
  description: string;
  isTimestamp: boolean;
}

export const STANDARD_CLAIMS: Record<string, ClaimInfo> = {
  iss: {
    name: "Issuer",
    description: "The principal that issued the JWT",
    isTimestamp: false,
  },
  sub: {
    name: "Subject",
    description: "The subject of the JWT",
    isTimestamp: false,
  },
  aud: {
    name: "Audience",
    description: "The recipients that the JWT is intended for",
    isTimestamp: false,
  },
  exp: {
    name: "Expiration Time",
    description: "The time after which the JWT expires",
    isTimestamp: true,
  },
  nbf: {
    name: "Not Before",
    description: "The time before which the JWT must not be accepted",
    isTimestamp: true,
  },
  iat: {
    name: "Issued At",
    description: "The time at which the JWT was issued",
    isTimestamp: true,
  },
  jti: {
    name: "JWT ID",
    description: "A unique identifier for the JWT",
    isTimestamp: false,
  },
};

export const SUPPORTED_ALGORITHMS = [
  { id: "HS256", name: "HMAC SHA-256", keyType: "secret" },
  { id: "HS384", name: "HMAC SHA-384", keyType: "secret" },
  { id: "HS512", name: "HMAC SHA-512", keyType: "secret" },
  { id: "RS256", name: "RSA SHA-256", keyType: "keypair" },
  { id: "RS384", name: "RSA SHA-384", keyType: "keypair" },
  { id: "RS512", name: "RSA SHA-512", keyType: "keypair" },
  { id: "ES256", name: "ECDSA P-256 SHA-256", keyType: "keypair" },
  { id: "ES384", name: "ECDSA P-384 SHA-384", keyType: "keypair" },
  { id: "ES512", name: "ECDSA P-521 SHA-512", keyType: "keypair" },
  { id: "PS256", name: "RSASSA-PSS SHA-256", keyType: "keypair" },
  { id: "PS384", name: "RSASSA-PSS SHA-384", keyType: "keypair" },
  { id: "PS512", name: "RSASSA-PSS SHA-512", keyType: "keypair" },
];

export const JWT_TEMPLATES = [
  {
    name: "Basic JWT",
    header: {
      alg: "HS256",
      typ: "JWT",
    },
    payload: {
      sub: "1234567890",
      name: "John Doe",
      iat: Math.floor(Date.now() / 1000),
    },
  },
  {
    name: "API Access Token",
    header: {
      alg: "HS256",
      typ: "JWT",
    },
    payload: {
      sub: "api-client",
      iss: "https://api.example.com",
      aud: "https://api.example.com/resource",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      scope: "read write",
    },
  },
  {
    name: "OIDC ID Token",
    header: {
      alg: "RS256",
      typ: "JWT",
      kid: "key-id-1",
    },
    payload: {
      iss: "https://auth.example.com",
      sub: "user123",
      aud: "client-id",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      auth_time: Math.floor(Date.now() / 1000) - 300,
      nonce: "n-0S6_WzA2Mj",
      name: "John Doe",
      given_name: "John",
      family_name: "Doe",
      email: "john.doe@example.com",
      email_verified: true,
    },
  },
];
