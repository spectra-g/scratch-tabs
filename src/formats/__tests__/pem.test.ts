import { PemFormatDetector } from "../pem";

// Real-world test certificates (self-signed, for testing only)
const REAL_CERT = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJANMegADn5RkGMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJVUzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA0Z3VS5JJcds3xHn/ygWep4sAkJbCzPuHOFTY1REfKGTKGT3aK0sFAbN4
MVxFpKqfBpKfRhRFiBkbJf9EYLEj6AxwEI0LoWoR9u1HS8TLFhTumWC4qKVl2Tbn
K6Qk17t8mthSTSRH87F7OQRJAT+rFqQgL5hk1LVK2lFmPY5dHH8kDIBnXqEYA3UH
-----END CERTIFICATE-----`;

const RSA_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4sAkJbCzPuHOFTY1REfKGTKGT3a
K0sFAbN4MVxFpKqfBpKfRhRFiBkbJf9EYLEj6AxwEI0LoWoR9u1HS8TLFhTumWC4
qKVl2TbnK6Qk17t8mthSTSRH87F7OQRJAT+rFqQgL5hk1LVK2lFmPY5dHH8kDIBn
-----END RSA PRIVATE KEY-----`;

const PKCS8_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7o4qne60TB3wo
pJVYRYkMV5E3A7a4BXJM1GJwJO9c9dMSS7B8ywMBBAAAAAAAAAAAAAAAAAAAAA
-----END PRIVATE KEY-----`;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a2rwplBQLzHPZe5TNJZ
ILAMiqVeVpM7tEILK5RZIKVN6cFWJvGS1TqJGNdDp0JFBBBBBBBBBBBBBBBB
-----END PUBLIC KEY-----`;

const CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIICijCCAXICAQAwRTELMAkGA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUx
ITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZAAAAAAAAAAAAAAAAAAA
-----END CERTIFICATE REQUEST-----`;

const MULTI_BLOCK = `${REAL_CERT}

${RSA_PRIVATE_KEY}`;

describe("PemFormatDetector", () => {
  let detector: PemFormatDetector;

  beforeEach(() => {
    detector = new PemFormatDetector();
  });

  describe("Basic properties", () => {
    it("has correct id, name, extensions, and priority", () => {
      expect(detector.id).toBe("pem");
      expect(detector.name).toBe("PEM / X.509");
      expect(detector.extensions).toContain("pem");
      expect(detector.extensions).toContain("crt");
      expect(detector.extensions).toContain("key");
      expect(detector.extensions).toContain("csr");
      expect(detector.priority).toBeGreaterThanOrEqual(8);
    });

    it("returns 'pem' as file extension", () => {
      expect(detector.getFileExtension()).toBe("pem");
    });

    it("provides non-empty sample content with BEGIN/END markers", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("-----BEGIN CERTIFICATE-----");
      expect(sample).toContain("-----END CERTIFICATE-----");
    });
  });

  describe("Positive detection — certificates", () => {
    it("detects a CERTIFICATE block with high confidence", () => {
      const { match, confidence, matchedDefinitive } = detector.detect(REAL_CERT);
      expect(match).toBe(true);
      expect(confidence).toBeGreaterThan(0.9);
      expect(matchedDefinitive).toBe(true);
    });

    it("detects an RSA PRIVATE KEY block", () => {
      const { match, confidence } = detector.detect(RSA_PRIVATE_KEY);
      expect(match).toBe(true);
      expect(confidence).toBeGreaterThan(0.9);
    });

    it("detects a PKCS#8 PRIVATE KEY block", () => {
      const { match } = detector.detect(PKCS8_KEY);
      expect(match).toBe(true);
    });

    it("detects a PUBLIC KEY block", () => {
      const { match } = detector.detect(PUBLIC_KEY);
      expect(match).toBe(true);
    });

    it("detects a CERTIFICATE REQUEST (CSR)", () => {
      const { match } = detector.detect(CSR);
      expect(match).toBe(true);
    });

    it("detects multiple PEM blocks in one file", () => {
      const { match, confidence } = detector.detect(MULTI_BLOCK);
      expect(match).toBe(true);
      expect(confidence).toBeGreaterThan(0.9);
    });

    it("detects a partial paste with only BEGIN marker", () => {
      const partial = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJANMegADn5RkGMA0GCSqGSIb3DQEB`;
      const { match, confidence } = detector.detect(partial);
      expect(match).toBe(true);
      expect(confidence).toBeGreaterThan(0.7);
    });

    it("handles leading/trailing whitespace gracefully", () => {
      const { match } = detector.detect(`\n\n${REAL_CERT}\n\n`);
      expect(match).toBe(true);
    });
  });

  describe("Negative detection — false positive prevention", () => {
    it("does NOT detect plain text", () => {
      const { match } = detector.detect(`Hello world
This is some text
No PEM content here`);
      expect(match).toBe(false);
    });

    it("does NOT detect JSON", () => {
      const { match } = detector.detect(`{
  "certificate": "abc123",
  "key": "def456",
  "begin": "value"
}`);
      expect(match).toBe(false);
    });

    it("does NOT detect YAML", () => {
      const { match } = detector.detect(`certificate:
  type: RSA
  begin: true
  end: false`);
      expect(match).toBe(false);
    });

    it("does NOT detect a .env file", () => {
      const { match } = detector.detect(`APP_NAME=MyApp
DATABASE_URL=postgres://localhost/db
SECRET_KEY=abc123
API_TOKEN=def456`);
      expect(match).toBe(false);
    });

    it("does NOT detect empty content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   \n\n  ").match).toBe(false);
    });

    it("does NOT detect a BEGIN marker in prose", () => {
      const { match } = detector.detect(`Please begin your work.
The process will end after completion.
This is not a PEM file.`);
      expect(match).toBe(false);
    });

    it("does NOT detect Base64-like account IDs without PEM armor", () => {
      const { match } = detector.detect(`AWD3R
FJ9KP
ZX7M2
QWERT`);
      expect(match).toBe(false);
    });

    it("does NOT detect PEM markers that are not at the start of content", () => {
      const { match } = detector.detect(`Account export
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJANMegADn5RkG
-----END CERTIFICATE-----`);
      expect(match).toBe(false);
    });
  });

  describe("Static helper methods", () => {
    it("countBlocks returns correct count for single block", () => {
      expect(PemFormatDetector.countBlocks(REAL_CERT)).toBe(1);
    });

    it("countBlocks returns correct count for multiple blocks", () => {
      expect(PemFormatDetector.countBlocks(MULTI_BLOCK)).toBe(2);
    });

    it("countBlocks returns 0 for empty content", () => {
      expect(PemFormatDetector.countBlocks("")).toBe(0);
    });

    it("parseBlocks extracts type and base64 for a certificate", () => {
      const blocks = PemFormatDetector.parseBlocks(REAL_CERT);
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe("CERTIFICATE");
      expect(blocks[0].base64.length).toBeGreaterThan(0);
      expect(blocks[0].base64).not.toContain("\n");
    });

    it("parseBlocks extracts both blocks from a multi-block file", () => {
      const blocks = PemFormatDetector.parseBlocks(MULTI_BLOCK);
      expect(blocks).toHaveLength(2);
      const types = blocks.map((b) => b.type);
      expect(types).toContain("CERTIFICATE");
      expect(types).toContain("RSA PRIVATE KEY");
    });

    it("parseBlocks returns empty array for non-PEM content", () => {
      expect(PemFormatDetector.parseBlocks("not pem")).toHaveLength(0);
    });
  });

  describe("Monaco provider registration", () => {
    it("registers without throwing", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };
      expect(() => detector.registerProvider(mockMonaco)).not.toThrow();
      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: "pem" });
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
    });

    it("skips registration if language already registered", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => [{ id: "pem" }]),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
        },
        editor: { defineTheme: jest.fn() },
      };
      detector.registerProvider(mockMonaco);
      expect(mockMonaco.languages.register).not.toHaveBeenCalled();
    });

    it("handles null/undefined monaco gracefully", () => {
      expect(() => detector.registerProvider(null)).not.toThrow();
      expect(() => detector.registerProvider(undefined)).not.toThrow();
    });
  });
});
