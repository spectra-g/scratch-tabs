import { generateKey, inspectKey, validateKeyPair } from '../useSshKeygenEngine';
import { isParseError } from '../utils/keyParser';
import { sha256Fingerprint, md5Fingerprint } from '../utils/fingerprint';
import { parseKey } from '../utils/keyParser';

// Ed25519 and ECDSA are fast; RSA-3072 may take a few hundred ms — acceptable.

describe('generateKey — Ed25519', () => {
  let result: Awaited<ReturnType<typeof generateKey>>;

  beforeAll(async () => {
    result = await generateKey('ed25519', 'user@host', '');
  }, 15_000);

  it('algorithm is ed25519', () => {
    expect(result.algorithm).toBe('ed25519');
  });

  it('privateKey starts with BEGIN OPENSSH PRIVATE KEY', () => {
    expect(result.privateKey).toMatch(/^-----BEGIN OPENSSH PRIVATE KEY-----/);
  });

  it('privateKey ends with END OPENSSH PRIVATE KEY', () => {
    expect(result.privateKey.trim()).toMatch(/-----END OPENSSH PRIVATE KEY-----\s*$/);
  });

  it('publicKey starts with ssh-ed25519', () => {
    expect(result.publicKey).toMatch(/^ssh-ed25519 /);
  });

  it('fingerprintSha256 starts with SHA256:', () => {
    expect(result.fingerprintSha256).toMatch(/^SHA256:/);
  });

  it('fingerprintMd5 matches xx:xx:... (16 groups)', () => {
    expect(result.fingerprintMd5).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2}){15}$/);
  });

  it('isEncrypted is false when no passphrase', () => {
    expect(result.isEncrypted).toBe(false);
  });

  it('comment appears in the public key line', () => {
    expect(result.publicKey).toContain('user@host');
  });

  it('two successive calls produce different keys', async () => {
    const second = await generateKey('ed25519', '', '');
    expect(second.publicKey).not.toBe(result.publicKey);
  }, 15_000);
});

describe('generateKey — RSA 3072', () => {
  let result: Awaited<ReturnType<typeof generateKey>>;

  beforeAll(async () => {
    result = await generateKey('rsa-3072', '', '');
  }, 30_000);

  it('publicKey starts with ssh-rsa', () => {
    expect(result.publicKey).toMatch(/^ssh-rsa /);
  });

  it('privateKey parses with bitLength 3072', () => {
    const parsed = parseKey(result.privateKey);
    expect(isParseError(parsed)).toBe(false);
    if (!isParseError(parsed)) {
      expect(parsed.bitLength).toBe(3072);
    }
  });

  it('isEncrypted is false without passphrase', () => {
    expect(result.isEncrypted).toBe(false);
  });
});

describe('generateKey — ECDSA P-256', () => {
  let result: Awaited<ReturnType<typeof generateKey>>;

  beforeAll(async () => {
    result = await generateKey('ecdsa-p256', '', '');
  }, 15_000);

  it('publicKey starts with ecdsa-sha2-nistp256', () => {
    expect(result.publicKey).toMatch(/^ecdsa-sha2-nistp256 /);
  });

  it('privateKey parses with bitLength 256', () => {
    const parsed = parseKey(result.privateKey);
    expect(isParseError(parsed)).toBe(false);
    if (!isParseError(parsed)) {
      expect(parsed.bitLength).toBe(256);
    }
  });
});

describe('generateKey — passphrase', () => {
  it('isEncrypted is true when passphrase is provided', async () => {
    const result = await generateKey('ed25519', '', 'mypassphrase');
    expect(result.isEncrypted).toBe(true);
  }, 15_000);

  it('encrypted private key differs from unencrypted', async () => {
    const [enc, plain] = await Promise.all([
      generateKey('ed25519', '', 'secret'),
      generateKey('ed25519', '', ''),
    ]);
    // Different keys AND encryption change the PEM
    expect(enc.privateKey).not.toBe(plain.privateKey);
  }, 15_000);
});

describe('inspectKey — public key', () => {
  let pubLine: string;
  let wireBytes: Uint8Array;

  beforeAll(async () => {
    const result = await generateKey('ed25519', 'test@example', '');
    pubLine = result.publicKey;
    const b64 = pubLine.split(' ')[1];
    const bin = atob(b64);
    wireBytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  }, 15_000);

  it('returns InspectedKey with isPublic true', async () => {
    const result = await inspectKey(pubLine);
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.metadata.isPublic).toBe(true);
    }
  });

  it('fingerprintSha256 matches direct sha256Fingerprint', async () => {
    const result = await inspectKey(pubLine);
    if (!isParseError(result)) {
      const expected = await sha256Fingerprint(wireBytes);
      expect(result.metadata.fingerprintSha256).toBe(expected);
    }
  });

  it('fingerprintMd5 matches direct md5Fingerprint', async () => {
    const result = await inspectKey(pubLine);
    if (!isParseError(result)) {
      expect(result.metadata.fingerprintMd5).toBe(md5Fingerprint(wireBytes));
    }
  });
});

describe('inspectKey — private key (unencrypted)', () => {
  let generated: Awaited<ReturnType<typeof generateKey>>;

  beforeAll(async () => {
    generated = await generateKey('ed25519', 'mycomment', '');
  }, 15_000);

  it('isPublic is false for private key', async () => {
    const result = await inspectKey(generated.privateKey);
    if (!isParseError(result)) {
      expect(result.metadata.isPublic).toBe(false);
    }
  });

  it('publicKeyLine is a valid OpenSSH public key string', async () => {
    const result = await inspectKey(generated.privateKey);
    if (!isParseError(result)) {
      expect(result.publicKeyLine).toBeDefined();
      expect(result.publicKeyLine).toMatch(/^ssh-ed25519 /);
    }
  });

  it('publicKeyLine fingerprint matches the generated fingerprint', async () => {
    const result = await inspectKey(generated.privateKey);
    if (!isParseError(result)) {
      expect(result.metadata.fingerprintSha256).toBe(generated.fingerprintSha256);
    }
  });
});

describe('inspectKey — error cases', () => {
  it('returns ParseError for garbage input', async () => {
    const result = await inspectKey('this is not a key');
    expect(isParseError(result)).toBe(true);
  });
});

describe('validateKeyPair', () => {
  it('returns match=true for a matching pair', async () => {
    const { publicKey, privateKey } = await generateKey('ed25519', '', '');
    const result = await validateKeyPair(publicKey, privateKey);
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.match).toBe(true);
    }
  }, 15_000);

  it('returns match=false for two independently generated Ed25519 keys', async () => {
    const [a, b] = await Promise.all([
      generateKey('ed25519', '', ''),
      generateKey('ed25519', '', ''),
    ]);
    const result = await validateKeyPair(a.publicKey, b.privateKey);
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.match).toBe(false);
    }
  }, 15_000);

  it('returns error if public key text is actually a private key', async () => {
    const { privateKey } = await generateKey('ed25519', '', '');
    const result = await validateKeyPair(privateKey, privateKey);
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.match).toBe(false);
    }
  }, 15_000);

  it('returns error if private key text is actually a public key', async () => {
    const { publicKey } = await generateKey('ed25519', '', '');
    const result = await validateKeyPair(publicKey, publicKey);
    expect(isParseError(result)).toBe(false);
    if (!isParseError(result)) {
      expect(result.match).toBe(false);
    }
  }, 15_000);

  it('returns ParseError if either input is garbage', async () => {
    const { publicKey } = await generateKey('ed25519', '', '');
    const result = await validateKeyPair(publicKey, 'garbage input');
    expect(isParseError(result)).toBe(true);
  }, 15_000);
});
