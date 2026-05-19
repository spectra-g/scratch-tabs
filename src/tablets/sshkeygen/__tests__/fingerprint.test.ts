import { sha256Fingerprint, md5Fingerprint } from '../utils/fingerprint';

// Known-good vectors derived from `ssh-keygen -l` output.
// The wire blob for a minimal Ed25519 public key is deterministic given fixed key bytes.
// We use a hand-crafted wire blob (ssh-ed25519 + 32 fixed bytes) and compare against
// the MD5/SHA-256 hashes computed by an independent reference implementation.

// Wire blob for ssh-ed25519 key with pubKey = Uint8Array(32).fill(0xAB):
//   encodeString("ssh-ed25519")  = [0,0,0,11, 's','s','h','-','e','d','2','5','5','1','9']
//   encodeString(pubKey)         = [0,0,0,32,  0xAB x32]
// Total: 4+11 + 4+32 = 51 bytes
function buildKnownWireBlob(): Uint8Array {
  const keyType = new TextEncoder().encode('ssh-ed25519');
  const pubKey = new Uint8Array(32).fill(0xab);

  const u32 = (n: number) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n, false);
    return b;
  };

  const parts = [u32(keyType.length), keyType, u32(pubKey.length), pubKey];
  const total = parts.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

const WIRE = buildKnownWireBlob();

// Reference values computed with Node.js built-in crypto:
//   import { createHash } from 'crypto';
//   const md5 = createHash('md5').update(Buffer.from(WIRE)).digest('hex');   → below
//   const sha = createHash('sha256').update(Buffer.from(WIRE)).digest();     → base64 below
//
// These are independent of CryptoJS — if the CryptoJS WordArray bug were present,
// md5Fingerprint would produce a different (wrong) value.
const EXPECTED_MD5 = (() => {
  // Compute with Node's crypto for a ground-truth reference at test definition time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('crypto');
  const hex = createHash('md5').update(Buffer.from(WIRE)).digest('hex') as string;
  return (hex.match(/.{2}/g) as string[]).join(':');
})();

const EXPECTED_SHA256 = (() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('crypto');
  const digest = createHash('sha256').update(Buffer.from(WIRE)).digest() as Buffer;
  let bin = '';
  for (const b of digest) bin += String.fromCharCode(b);
  return `SHA256:${btoa(bin).replace(/=+$/, '')}`;
})();

describe('md5Fingerprint', () => {
  it('matches Node.js crypto MD5 for a known wire blob', () => {
    expect(md5Fingerprint(WIRE)).toBe(EXPECTED_MD5);
  });

  it('output is 16 colon-separated hex pairs', () => {
    expect(md5Fingerprint(WIRE)).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2}){15}$/);
  });

  it('differs for different key bytes', () => {
    const other = buildKnownWireBlob();
    other[other.length - 1] ^= 0xff; // flip last byte
    expect(md5Fingerprint(other)).not.toBe(md5Fingerprint(WIRE));
  });
});

describe('sha256Fingerprint', () => {
  it('matches Node.js crypto SHA-256 for a known wire blob', async () => {
    expect(await sha256Fingerprint(WIRE)).toBe(EXPECTED_SHA256);
  });

  it('output starts with SHA256:', async () => {
    expect(await sha256Fingerprint(WIRE)).toMatch(/^SHA256:/);
  });

  it('output has no trailing = padding', async () => {
    expect(await sha256Fingerprint(WIRE)).not.toMatch(/=$/);
  });

  it('differs for different key bytes', async () => {
    const other = buildKnownWireBlob();
    other[other.length - 1] ^= 0xff;
    expect(await sha256Fingerprint(other)).not.toBe(await sha256Fingerprint(WIRE));
  });
});
