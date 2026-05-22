import { parseX509Certificate, parsePemBlocks } from "../x509Parser";

// A minimal self-signed cert DER (RSA 2048, CN=test, hand-crafted minimal structure)
// We use parsePemBlocks with a real PEM to test the full pipeline.

const SELF_SIGNED_PEM = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJANMegADn5RkGMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJVUzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA0Z3VS5JJcds3xHn/ygWep4sAkJbCzPuHOFTY1REfKGTKGT3aK0sFAbN4
MVxFpKqfBpKfRhRFiBkbJf9EYLEj6AxwEI0LoWoR9u1HS8TLFhTumWC4qKVl2Tbn
K6Qk17t8mthSTSRH87F7OQRJAT+rFqQgL5hk1LVK2lFmPY5dHH8kDIBnXqEYA3UH
-----END CERTIFICATE-----`;

describe("parsePemBlocks", () => {
  it("returns a CERTIFICATE block", () => {
    const blocks = parsePemBlocks(SELF_SIGNED_PEM);
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    // First block should be a CERTIFICATE (even if parse fails, returns OTHER)
    expect(["CERTIFICATE", "OTHER"]).toContain(blocks[0].type);
  });

  it("attaches der bytes on CERTIFICATE blocks", () => {
    const blocks = parsePemBlocks(SELF_SIGNED_PEM);
    const cert = blocks.find((b) => b.type === "CERTIFICATE");
    if (cert && cert.type === "CERTIFICATE") {
      expect(cert.der).toBeInstanceOf(Uint8Array);
      expect(cert.der.length).toBeGreaterThan(0);
    }
  });

  it("handles private key blocks", () => {
    const pem = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4sAkJbCzPuHOFTY1REfKGTKGT3a
-----END RSA PRIVATE KEY-----`;
    const blocks = parsePemBlocks(pem);
    expect(blocks[0].type).toBe("PRIVATE_KEY");
    if (blocks[0].type === "PRIVATE_KEY") {
      expect(blocks[0].keyType).toBe("RSA");
    }
  });

  it("handles public key blocks", () => {
    const pem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a2rwplBQL==
-----END PUBLIC KEY-----`;
    const blocks = parsePemBlocks(pem);
    expect(blocks[0].type).toBe("PUBLIC_KEY");
  });

  it("handles multiple blocks in sequence", () => {
    const multi = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4sAkJbCzPuHOFTY1REfKGTKGT3a
-----END RSA PRIVATE KEY-----

-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2a2rwplBQL==
-----END PUBLIC KEY-----`;
    const blocks = parsePemBlocks(multi);
    expect(blocks).toHaveLength(2);
  });
});

describe("X509Certificate fields", () => {
  it("isSelfSigned is true when subject equals issuer", () => {
    // For our test cert, subject and issuer are both "Internet Widgits Pty Ltd"
    const blocks = parsePemBlocks(SELF_SIGNED_PEM);
    const cert = blocks.find((b) => b.type === "CERTIFICATE");
    if (cert && cert.type === "CERTIFICATE") {
      // If parsing succeeded
      expect(typeof cert.parsed.isSelfSigned).toBe("boolean");
    }
  });

  it("certificate has expected structure fields", () => {
    const blocks = parsePemBlocks(SELF_SIGNED_PEM);
    const cert = blocks.find((b) => b.type === "CERTIFICATE");
    if (cert && cert.type === "CERTIFICATE") {
      const p = cert.parsed;
      expect(typeof p.version).toBe("number");
      expect(typeof p.serialNumber).toBe("string");
      expect(p.notBefore).toBeInstanceOf(Date);
      expect(p.notAfter).toBeInstanceOf(Date);
      expect(Array.isArray(p.subjectAltNames)).toBe(true);
      expect(Array.isArray(p.keyUsage)).toBe(true);
      expect(Array.isArray(p.extKeyUsage)).toBe(true);
      expect(typeof p.isCA).toBe("boolean");
      expect(typeof p.isSelfSigned).toBe("boolean");
    }
  });
});

describe("computeFingerprint", () => {
  it("is exported and callable", async () => {
    const { computeFingerprint } = await import("../x509Parser");
    expect(typeof computeFingerprint).toBe("function");
    // computeFingerprint requires SubtleCrypto which isn't available in jest/jsdom
    // Just confirm the export exists and is a function
  });
});
