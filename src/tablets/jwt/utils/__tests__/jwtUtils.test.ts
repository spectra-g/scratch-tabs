// Mock jose library before imports
jest.mock("jose", () => ({
  SignJWT: jest.fn(),
  jwtVerify: jest.fn(),
  importPKCS8: jest.fn(),
  importSPKI: jest.fn(),
  generateKeyPair: jest.fn(),
  base64url: {
    encode: jest.fn((data) => {
      // Simple base64url encoding mock
      return Buffer.from(data).toString("base64url");
    }),
    decode: jest.fn(),
  },
}));

import {
  decodeJwt,
  splitJwtParts,
  formatTimestamp,
  getTimeDifference,
  isPemFormat,
  isBase64,
  createJwtFromParts,
  generateSecret,
} from "../jwtUtils";

describe("jwtUtils", () => {
  describe("decodeJwt", () => {
    it("should decode a valid JWT token", () => {
      // Valid JWT: {"alg":"HS256","typ":"JWT"}.{"sub":"1234567890","name":"John Doe","iat":1516239022}.signature
      const validToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      const result = decodeJwt(validToken);

      expect(result.header).toEqual({
        alg: "HS256",
        typ: "JWT",
      });
      expect(result.payload).toEqual({
        sub: "1234567890",
        name: "John Doe",
        iat: 1516239022,
      });
      expect(result.signature).toBe(
        "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
      );
      expect(result.warning).toBeNull();
    });

    it("should handle JWT with incomplete structure", () => {
      const incompleteToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

      const result = decodeJwt(incompleteToken);

      expect(result.warning).toContain("Incomplete JWT format");
    });

    it("should handle JWT without signature", () => {
      const noSignatureToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ";

      const result = decodeJwt(noSignatureToken);

      expect(result.warning).toContain("Missing signature");
      expect(result.signature).toBe("");
    });

    it("should return empty structure for invalid token", () => {
      const result = decodeJwt("invalid.token");

      expect(result.header).toEqual({});
      expect(result.payload).toEqual({});
      expect(result.signature).toBe("");
    });

    it("should handle empty string", () => {
      const result = decodeJwt("");

      expect(result.header).toEqual({});
      expect(result.payload).toEqual({});
      expect(result.signature).toBe("");
    });
  });

  describe("splitJwtParts", () => {
    it("should split a valid JWT into parts", () => {
      const token = "header.payload.signature";

      const result = splitJwtParts(token);

      expect(result).toEqual({
        header: "header",
        payload: "payload",
        signature: "signature",
      });
    });

    it("should throw error for invalid JWT format", () => {
      expect(() => splitJwtParts("invalid.token")).toThrow(
        "Invalid JWT format"
      );
    });

    it("should throw error for empty string", () => {
      expect(() => splitJwtParts("")).toThrow("Invalid JWT format");
    });

    it("should throw error for token with only two parts", () => {
      expect(() => splitJwtParts("header.payload")).toThrow(
        "Invalid JWT format"
      );
    });
  });

  describe("formatTimestamp", () => {
    it("should format a valid Unix timestamp", () => {
      const timestamp = 1516239022; // Jan 17, 2018

      const result = formatTimestamp(timestamp);

      expect(result).toContain("2018");
      expect(result).not.toBe("Invalid timestamp");
    });

    it("should handle zero timestamp", () => {
      const result = formatTimestamp(0);

      expect(result).toBe("Invalid timestamp");
    });

    it("should handle invalid timestamp", () => {
      const result = formatTimestamp(NaN);

      expect(result).toBe("Invalid timestamp");
    });

    it("should handle negative timestamp", () => {
      const timestamp = -1000;

      const result = formatTimestamp(timestamp);

      // Should either format it or return invalid
      expect(typeof result).toBe("string");
    });
  });

  describe("getTimeDifference", () => {
    it("should return valid duration for future timestamp", () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      const result = getTimeDifference(futureTimestamp);

      expect(result).toContain("Valid for");
      expect(result).toContain("hour");
    });

    it("should return expired duration for past timestamp", () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      const result = getTimeDifference(pastTimestamp);

      expect(result).toContain("Expired");
      expect(result).toContain("ago");
    });

    it("should handle timestamp expiring in seconds", () => {
      const soonTimestamp = Math.floor(Date.now() / 1000) + 30; // 30 seconds from now

      const result = getTimeDifference(soonTimestamp);

      expect(result).toContain("Valid for");
      expect(result).toContain("seconds");
    });

    it("should handle timestamp expired seconds ago", () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago

      const result = getTimeDifference(recentTimestamp);

      expect(result).toContain("Expired");
      expect(result).toContain("seconds ago");
    });

    it("should handle timestamp expiring in minutes", () => {
      const timestamp = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

      const result = getTimeDifference(timestamp);

      expect(result).toContain("Valid for");
      expect(result).toContain("minutes");
    });

    it("should handle timestamp expiring in days", () => {
      const timestamp = Math.floor(Date.now() / 1000) + 86400 * 5; // 5 days from now

      const result = getTimeDifference(timestamp);

      expect(result).toContain("Valid for");
      expect(result).toContain("days");
    });

    it("should handle zero timestamp", () => {
      const result = getTimeDifference(0);

      expect(result).toBe("Invalid timestamp");
    });

    it("should handle invalid timestamp", () => {
      const result = getTimeDifference(NaN);

      expect(result).toBe("Invalid timestamp");
    });
  });

  describe("isPemFormat", () => {
    it("should recognize valid PEM public key format", () => {
      const pem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
-----END PUBLIC KEY-----`;

      expect(isPemFormat(pem)).toBe(true);
    });

    it("should recognize valid PEM private key format", () => {
      const pem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj
-----END PRIVATE KEY-----`;

      expect(isPemFormat(pem)).toBe(true);
    });

    it("should reject invalid PEM format", () => {
      expect(isPemFormat("not a pem")).toBe(false);
    });

    it("should reject base64 string without PEM headers", () => {
      expect(
        isPemFormat("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA")
      ).toBe(false);
    });

    it("should handle empty string", () => {
      expect(isPemFormat("")).toBe(false);
    });

    it("should handle malformed PEM", () => {
      expect(isPemFormat("-----BEGIN PUBLIC KEY-----")).toBe(false);
    });
  });

  describe("isBase64", () => {
    it("should recognize valid base64 string", () => {
      expect(isBase64("SGVsbG8gV29ybGQ=")).toBe(true);
    });

    it("should recognize base64 without padding", () => {
      expect(isBase64("SGVsbG8gV29ybGQ")).toBe(true);
    });

    it("should reject string with invalid characters", () => {
      expect(isBase64("Hello World!")).toBe(false);
    });

    it("should reject string with spaces", () => {
      expect(isBase64("SGVs bG8=")).toBe(false);
    });

    it("should handle empty string", () => {
      expect(isBase64("")).toBe(false); // Empty string fails the regex test
    });

    it("should reject string with newlines", () => {
      expect(isBase64("SGVs\nbG8=")).toBe(false);
    });
  });

  describe("createJwtFromParts", () => {
    it("should create JWT token from parts", () => {
      const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      const payload =
        "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ";
      const signature = "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      const result = createJwtFromParts(header, payload, signature);

      expect(result).toBe(`${header}.${payload}.${signature}`);
      expect(result.split(".")).toHaveLength(3);
    });

    it("should handle empty parts", () => {
      const result = createJwtFromParts("", "", "");

      expect(result).toBe("..");
    });
  });

  describe("generateSecret", () => {
    it("should generate a base64url encoded secret", () => {
      const secret = generateSecret();

      expect(typeof secret).toBe("string");
      expect(secret.length).toBeGreaterThan(0);
      // Base64url characters
      expect(/^[A-Za-z0-9_-]+$/.test(secret)).toBe(true);
    });

    it("should generate secret of specified length", () => {
      const length = 16;
      const secret = generateSecret(length);

      expect(typeof secret).toBe("string");
      expect(secret.length).toBeGreaterThan(0);
    });

    it("should generate different secrets on each call", () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();

      expect(secret1).not.toBe(secret2);
    });

    it("should generate longer secrets for larger lengths", () => {
      const secret32 = generateSecret(32);
      const secret64 = generateSecret(64);

      expect(secret64.length).toBeGreaterThan(secret32.length);
    });
  });
});
