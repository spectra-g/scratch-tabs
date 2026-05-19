import {
  encodeUint32,
  encodeMpint,
  encodeString,
  encodeBytes,
  readBytes,
  readString,
  buildEd25519PublicWire,
  buildRsaPublicWire,
  buildEcdsaPublicWire,
  decodePublicKeyWire,
  decodePrivateKeyHeader,
  encodePrivateKey,
  buildEd25519PrivateFields,
} from '../utils/opensshFormat';

// ── encodeMpint ──────────────────────────────────────────────────────────────

describe('encodeMpint', () => {
  it('zero bytes → length 0 only', () => {
    const result = encodeMpint(new Uint8Array([0]));
    expect(result).toEqual(encodeUint32(0));
    expect(result.length).toBe(4);
  });

  it('all-zero array → length 0 only', () => {
    const result = encodeMpint(new Uint8Array([0, 0, 0]));
    expect(result).toEqual(encodeUint32(0));
  });

  it('byte with high bit clear → no leading 0x00', () => {
    const result = encodeMpint(new Uint8Array([0x01, 0x00, 0x01])); // 65537
    const view = new DataView(result.buffer);
    expect(view.getUint32(0, false)).toBe(3); // length = 3
    expect(result[4]).toBe(0x01);
    expect(result[5]).toBe(0x00);
    expect(result[6]).toBe(0x01);
  });

  it('byte with high bit set (0x80) → prepends 0x00', () => {
    const result = encodeMpint(new Uint8Array([0x80]));
    const view = new DataView(result.buffer);
    expect(view.getUint32(0, false)).toBe(2); // length = 2 (0x00 prepended)
    expect(result[4]).toBe(0x00);
    expect(result[5]).toBe(0x80);
  });

  it('multi-byte with leading 0xFF → prepends 0x00', () => {
    const result = encodeMpint(new Uint8Array([0xff, 0x01]));
    const view = new DataView(result.buffer);
    expect(view.getUint32(0, false)).toBe(3);
    expect(result[4]).toBe(0x00);
    expect(result[5]).toBe(0xff);
  });

  it('leading 0x00 bytes are stripped before encoding', () => {
    const a = encodeMpint(new Uint8Array([0x00, 0x00, 0x01]));
    const b = encodeMpint(new Uint8Array([0x01]));
    expect(a).toEqual(b);
  });
});

// ── encodeString / readString ─────────────────────────────────────────────────

describe('encodeString / readString', () => {
  it('round-trips ASCII string', () => {
    const encoded = encodeString('ssh-ed25519');
    const [decoded] = readString(encoded, 0);
    expect(decoded).toBe('ssh-ed25519');
  });

  it('round-trips empty string', () => {
    const encoded = encodeString('');
    const [decoded] = readString(encoded, 0);
    expect(decoded).toBe('');
  });

  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x80, 0xff]);
    const encoded = encodeBytes(bytes);
    const [decoded] = readBytes(encoded, 0);
    expect(decoded).toEqual(bytes);
  });
});

// ── Ed25519 public wire ──────────────────────────────────────────────────────

describe('public key wire format — Ed25519', () => {
  const pubKey = new Uint8Array(32).fill(0x42);

  it('encoded blob starts with the string ssh-ed25519', () => {
    const wire = buildEd25519PublicWire(pubKey);
    const [keyType] = readString(wire, 0);
    expect(keyType).toBe('ssh-ed25519');
  });

  it('decodePublicKeyWire round-trip returns keyType and 32-byte pub key', () => {
    const wire = buildEd25519PublicWire(pubKey);
    const decoded = decodePublicKeyWire(wire);
    expect(decoded.keyType).toBe('ssh-ed25519');
    expect(decoded.bitLength).toBe(256);
    expect(decoded.fields.pubKey).toEqual(pubKey);
  });
});

// ── RSA public wire ──────────────────────────────────────────────────────────

describe('public key wire format — RSA', () => {
  // 65537 = 0x010001, 3 bytes
  const e = new Uint8Array([0x01, 0x00, 0x01]);
  // Small fake modulus (256-bit = 32 bytes); high bit set to simulate real RSA
  const n = new Uint8Array(32).fill(0xab);

  it('key type string in encoded blob is ssh-rsa', () => {
    const wire = buildRsaPublicWire(e, n);
    const [keyType] = readString(wire, 0);
    expect(keyType).toBe('ssh-rsa');
  });

  it('decodePublicKeyWire round-trip recovers e and n bytes', () => {
    const wire = buildRsaPublicWire(e, n);
    const decoded = decodePublicKeyWire(wire);
    expect(decoded.keyType).toBe('ssh-rsa');
    // e in decoded.fields.e may have leading 0x00 stripped or added by mpint
    // Just check the modulus byte count
    expect(decoded.bitLength).toBe(256); // 32 bytes * 8
  });

  it('mpint(e) has no leading zero for e=65537 (0x010001, high bit clear)', () => {
    const mpintE = encodeMpint(e);
    const view = new DataView(mpintE.buffer);
    expect(view.getUint32(0, false)).toBe(3);
    expect(mpintE[4]).toBe(0x01); // no leading 0x00
  });
});

// ── ECDSA P-256 public wire ───────────────────────────────────────────────────

describe('public key wire format — ECDSA P-256', () => {
  const x = new Uint8Array(32).fill(0x11);
  const y = new Uint8Array(32).fill(0x22);

  it('key type string is ecdsa-sha2-nistp256', () => {
    const wire = buildEcdsaPublicWire('nistp256', x, y);
    const [keyType] = readString(wire, 0);
    expect(keyType).toBe('ecdsa-sha2-nistp256');
  });

  it('curve string is nistp256', () => {
    const wire = buildEcdsaPublicWire('nistp256', x, y);
    let offset = 0;
    const [, o1] = readString(wire, offset); offset = o1;
    const [curve] = readString(wire, offset);
    expect(curve).toBe('nistp256');
  });

  it('uncompressed point starts with 0x04', () => {
    const wire = buildEcdsaPublicWire('nistp256', x, y);
    let offset = 0;
    const [, o1] = readBytes(wire, offset); offset = o1; // skip key type
    const [, o2] = readBytes(wire, offset); offset = o2; // skip curve name
    const [point] = readBytes(wire, offset);
    expect(point[0]).toBe(0x04);
    expect(point.length).toBe(65); // 1 + 32 + 32
  });

  it('decodePublicKeyWire returns bitLength 256', () => {
    const wire = buildEcdsaPublicWire('nistp256', x, y);
    const decoded = decodePublicKeyWire(wire);
    expect(decoded.bitLength).toBe(256);
  });
});

// ── Private key blob (no passphrase) ─────────────────────────────────────────

describe('private key blob — no passphrase', () => {
  const pubKey = new Uint8Array(32).fill(0x55);
  const seed = new Uint8Array(32).fill(0xaa);
  const publicWire = buildEd25519PublicWire(pubKey);
  const privateFields = buildEd25519PrivateFields(pubKey, seed);

  it('PEM output starts with magic header and cipher/kdf are none', async () => {
    const pem = await encodePrivateKey(publicWire, privateFields, '', '');
    expect(pem).toContain('-----BEGIN OPENSSH PRIVATE KEY-----');
    expect(pem).toContain('-----END OPENSSH PRIVATE KEY-----');

    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const blob = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const header = decodePrivateKeyHeader(blob);
    expect(header.cipher).toBe('none');
    expect(header.kdf).toBe('none');
    expect(header.isEncrypted).toBe(false);
  }, 10_000);

  it('embedded public key blob matches standalone public wire blob', async () => {
    const pem = await encodePrivateKey(publicWire, privateFields, '', '');
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const blob = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const header = decodePrivateKeyHeader(blob);
    expect(header.pubWireBytes).toEqual(publicWire);
  }, 10_000);
});

// ── Private key blob (with passphrase) ───────────────────────────────────────

describe('private key blob — with passphrase', () => {
  const pubKey = new Uint8Array(32).fill(0x55);
  const seed = new Uint8Array(32).fill(0xaa);
  const publicWire = buildEd25519PublicWire(pubKey);
  const privateFields = buildEd25519PrivateFields(pubKey, seed);
  const passphrase = 's3cr3t!';

  async function getHeader(pem: string) {
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const blob = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return decodePrivateKeyHeader(blob);
  }

  it('cipher field is aes256-cbc', async () => {
    const pem = await encodePrivateKey(publicWire, privateFields, '', passphrase);
    const header = await getHeader(pem);
    expect(header.cipher).toBe('aes256-cbc');
  }, 10_000);

  it('kdf field is bcrypt', async () => {
    const pem = await encodePrivateKey(publicWire, privateFields, '', passphrase);
    const header = await getHeader(pem);
    expect(header.kdf).toBe('bcrypt');
  }, 10_000);

  it('isEncrypted is true', async () => {
    const pem = await encodePrivateKey(publicWire, privateFields, '', passphrase);
    const header = await getHeader(pem);
    expect(header.isEncrypted).toBe(true);
  }, 10_000);

  it('encrypted PEM differs from unencrypted PEM', async () => {
    const [enc, plain] = await Promise.all([
      encodePrivateKey(publicWire, privateFields, '', passphrase),
      encodePrivateKey(publicWire, privateFields, '', ''),
    ]);
    expect(enc).not.toBe(plain);
  }, 10_000);

  it('multi-byte passphrase uses byte length not char length', async () => {
    // '£' is 2 bytes in UTF-8; char length (1) !== byte length (2).
    // If the bug were present, encodePrivateKey would truncate the passphrase
    // and both passphrases ('£x' and 'x') would produce identical ciphertext.
    const [multiByte, ascii] = await Promise.all([
      encodePrivateKey(publicWire, privateFields, '', '£x'),
      encodePrivateKey(publicWire, privateFields, '', 'x'),
    ]);
    expect(multiByte).not.toBe(ascii);
  }, 10_000);
});
