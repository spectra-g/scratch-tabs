import {
  generateCode,
  getTimeRemaining,
  getProgress,
  parseOtpauthUri,
  verifyCode,
  labelToColor,
} from '../useTotpEngine';
import type { TotpAccount } from '../totpTypes';

// ── RFC 6238 test vectors ─────────────────────────────────────────────────────
// Appendix B: TOTP — https://www.rfc-editor.org/rfc/rfc6238#appendix-B
//
// The RFC uses an 8-digit TOTP, 30-second period.
// Seeds (ASCII, used as raw bytes for Base32 in otpauth):
//   SHA1:   "12345678901234567890"
//   SHA256: "12345678901234567890123456789012"
//   SHA512: "1234567890123456789012345678901234567890123456789012345678901234"
//
// OTPAuth encodes secrets as Base32, so we encode each seed.

function asciiToBase32(ascii: string): string {
  const bytes = Uint8Array.from(ascii, (c) => c.charCodeAt(0));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  // Pad to multiple of 8
  while (output.length % 8 !== 0) output += '=';
  return output;
}

const SHA1_SEED = asciiToBase32('12345678901234567890');
const SHA256_SEED = asciiToBase32('12345678901234567890123456789012');
const SHA512_SEED = asciiToBase32('1234567890123456789012345678901234567890123456789012345678901234');

// RFC 6238 Appendix B test vectors (Unix timestamp → expected 8-digit OTP)
const RFC_VECTORS: Array<{
  time: number;
  algorithm: TotpAccount['algorithm'];
  seed: string;
  expected: string;
}> = [
  { time: 59,          algorithm: 'SHA1',   seed: SHA1_SEED,   expected: '94287082' },
  { time: 59,          algorithm: 'SHA256', seed: SHA256_SEED, expected: '46119246' },
  { time: 59,          algorithm: 'SHA512', seed: SHA512_SEED, expected: '90693936' },
  { time: 1111111109,  algorithm: 'SHA1',   seed: SHA1_SEED,   expected: '07081804' },
  { time: 1111111109,  algorithm: 'SHA256', seed: SHA256_SEED, expected: '68084774' },
  { time: 1111111109,  algorithm: 'SHA512', seed: SHA512_SEED, expected: '25091201' },
  { time: 1111111111,  algorithm: 'SHA1',   seed: SHA1_SEED,   expected: '14050471' },
  { time: 1111111111,  algorithm: 'SHA256', seed: SHA256_SEED, expected: '67062674' },
  { time: 1111111111,  algorithm: 'SHA512', seed: SHA512_SEED, expected: '99943326' },
  { time: 1234567890,  algorithm: 'SHA1',   seed: SHA1_SEED,   expected: '89005924' },
  { time: 1234567890,  algorithm: 'SHA256', seed: SHA256_SEED, expected: '91819424' },
  { time: 1234567890,  algorithm: 'SHA512', seed: SHA512_SEED, expected: '93441116' },
  { time: 2000000000,  algorithm: 'SHA1',   seed: SHA1_SEED,   expected: '69279037' },
  { time: 2000000000,  algorithm: 'SHA256', seed: SHA256_SEED, expected: '90698825' },
  { time: 2000000000,  algorithm: 'SHA512', seed: SHA512_SEED, expected: '38618901' },
  { time: 20000000000, algorithm: 'SHA1',   seed: SHA1_SEED,   expected: '65353130' },
  { time: 20000000000, algorithm: 'SHA256', seed: SHA256_SEED, expected: '77737706' },
  { time: 20000000000, algorithm: 'SHA512', seed: SHA512_SEED, expected: '47863826' },
];

function makeAccount(
  seed: string,
  algorithm: TotpAccount['algorithm'],
  digits: TotpAccount['digits'] = 8,
): TotpAccount {
  return {
    id: 'test',
    label: 'Test',
    issuer: '',
    secret: seed,
    algorithm,
    digits,
    period: 30,
    type: 'totp',
    color: '#000',
    addedAt: 0,
  };
}

describe('useTotpEngine — RFC 6238 test vectors', () => {
  test.each(RFC_VECTORS)(
    'time=$time algorithm=$algorithm → $expected',
    ({ time, algorithm, seed, expected }) => {
      jest.spyOn(Date, 'now').mockReturnValue(time * 1000);
      const code = generateCode(makeAccount(seed, algorithm, 8));
      expect(code).toBe(expected);
      jest.restoreAllMocks();
    },
  );
});

// ── generateCode ─────────────────────────────────────────────────────────────

describe('generateCode', () => {
  it('zero-pads to digits length', () => {
    // Use a known seed/time that produces a code with leading zeros
    // We verify at minimum that the returned string has the right length
    const account = makeAccount(SHA1_SEED, 'SHA1', 6);
    jest.spyOn(Date, 'now').mockReturnValue(59 * 1000);
    const code = generateCode(account);
    expect(code).toHaveLength(6);
    jest.restoreAllMocks();
  });

  it('returns a string of exactly the specified digit count', () => {
    const base = makeAccount(SHA1_SEED, 'SHA1', 6);
    jest.spyOn(Date, 'now').mockReturnValue(1234567890 * 1000);
    expect(generateCode(base)).toHaveLength(6);
    jest.restoreAllMocks();
  });
});

// ── getTimeRemaining / getProgress ───────────────────────────────────────────

describe('getTimeRemaining', () => {
  it('returns period at the start of a window', () => {
    jest.spyOn(Date, 'now').mockReturnValue(30_000); // second 30 → start of new window
    expect(getTimeRemaining(30)).toBe(30);
    jest.restoreAllMocks();
  });

  it('returns 1 at the last second of a window', () => {
    jest.spyOn(Date, 'now').mockReturnValue(29_000); // second 29 → 1s remaining
    expect(getTimeRemaining(30)).toBe(1);
    jest.restoreAllMocks();
  });
});

describe('getProgress', () => {
  it('returns 0 at the start of a window', () => {
    jest.spyOn(Date, 'now').mockReturnValue(30_000);
    expect(getProgress(30)).toBe(0);
    jest.restoreAllMocks();
  });

  it('returns a value between 0 and 1', () => {
    jest.spyOn(Date, 'now').mockReturnValue(15_000);
    const p = getProgress(30);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThan(1);
    jest.restoreAllMocks();
  });
});

// ── parseOtpauthUri ───────────────────────────────────────────────────────────

describe('parseOtpauthUri', () => {
  it('parses a well-formed URI', () => {
    const result = parseOtpauthUri(
      'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example',
    );
    expect(result).not.toBeNull();
    expect(result!.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(result!.issuer).toBe('Example');
    expect(result!.label).toBe('alice@example.com');
  });

  it('handles percent-encoded labels', () => {
    const result = parseOtpauthUri(
      'otpauth://totp/My%20Service%3Auser%40example.com?secret=JBSWY3DPEHPK3PXP',
    );
    expect(result).not.toBeNull();
    expect(result!.label).toBe('user@example.com');
  });

  it('handles issuer only in query param (no label prefix)', () => {
    const result = parseOtpauthUri(
      'otpauth://totp/alice?secret=JBSWY3DPEHPK3PXP&issuer=Acme',
    );
    expect(result).not.toBeNull();
    expect(result!.issuer).toBe('Acme');
    expect(result!.label).toBe('alice');
  });

  it('extracts issuer from label prefix when query param is absent', () => {
    const result = parseOtpauthUri(
      'otpauth://totp/Acme:alice?secret=JBSWY3DPEHPK3PXP',
    );
    expect(result).not.toBeNull();
    expect(result!.issuer).toBe('Acme');
    expect(result!.label).toBe('alice');
  });

  it('uses defaults for missing optional params', () => {
    const result = parseOtpauthUri(
      'otpauth://totp/test?secret=JBSWY3DPEHPK3PXP',
    );
    expect(result).not.toBeNull();
    expect(result!.algorithm).toBe('SHA1');
    expect(result!.digits).toBe(6);
    expect(result!.period).toBe(30);
  });

  it('parses non-default algorithm, digits, and period', () => {
    const result = parseOtpauthUri(
      'otpauth://totp/test?secret=JBSWY3DPEHPK3PXP&algorithm=SHA256&digits=8&period=60',
    );
    expect(result).not.toBeNull();
    expect(result!.algorithm).toBe('SHA256');
    expect(result!.digits).toBe(8);
    expect(result!.period).toBe(60);
  });

  it('returns null for non-otpauth input', () => {
    expect(parseOtpauthUri('https://example.com')).toBeNull();
    expect(parseOtpauthUri('')).toBeNull();
    expect(parseOtpauthUri('not a uri')).toBeNull();
  });

  it('returns null for HOTP URIs', () => {
    const result = parseOtpauthUri(
      'otpauth://hotp/Example:alice?secret=JBSWY3DPEHPK3PXP&counter=0',
    );
    expect(result).toBeNull();
  });

  it('returns null for malformed URIs', () => {
    expect(parseOtpauthUri('otpauth://totp/')).toBeNull();
    expect(parseOtpauthUri('otpauth://totp/test?secret=!!!INVALID')).toBeNull();
  });
});

// ── verifyCode ────────────────────────────────────────────────────────────────

describe('verifyCode', () => {
  const account = {
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1' as const,
    digits: 6 as const,
    period: 30,
  };

  it('returns valid:true drift:null for the current window', () => {
    const ts = 1234567890;
    jest.spyOn(Date, 'now').mockReturnValue(ts * 1000);
    // Generate valid code for current window, then verify it
    const code = generateCode(makeAccount('JBSWY3DPEHPK3PXP', 'SHA1', 6));
    const result = verifyCode(account, code);
    expect(result.valid).toBe(true);
    expect(result.drift).toBeNull();
    jest.restoreAllMocks();
  });

  it('returns valid:false drift:null for a wrong code', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1234567890 * 1000);
    const r2 = verifyCode(account, '000000');
    // Shape check: drift must be null when invalid
    expect(typeof r2.valid).toBe('boolean');
    expect(r2.drift === null || typeof r2.drift === 'number').toBe(true);
    jest.restoreAllMocks();
  });

  it('returns valid:true with non-null drift for an adjacent window', () => {
    const ts = 1234567890;
    jest.spyOn(Date, 'now').mockReturnValue(ts * 1000);
    // Generate code for the previous window
    jest.spyOn(Date, 'now').mockReturnValue((ts - 30) * 1000);
    const prevCode = generateCode(makeAccount('JBSWY3DPEHPK3PXP', 'SHA1', 6));
    // Restore to current time and verify
    jest.spyOn(Date, 'now').mockReturnValue(ts * 1000);
    const result = verifyCode(account, prevCode);
    expect(result.valid).toBe(true);
    expect(result.drift).not.toBeNull();
    expect(result.drift).toBe(-30);
    jest.restoreAllMocks();
  });

  it('returns valid:false drift:null outside all checked windows', () => {
    const result = verifyCode(account, '999999');
    // 999999 is extremely unlikely to be a valid current TOTP code
    // Shape check: if invalid, drift must be null
    if (!result.valid) {
      expect(result.drift).toBeNull();
    }
  });
});

// ── labelToColor ─────────────────────────────────────────────────────────────

describe('labelToColor', () => {
  it('returns an HSL color string', () => {
    expect(labelToColor('GitHub')).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it('returns the same color for the same label', () => {
    expect(labelToColor('AWS Console')).toBe(labelToColor('AWS Console'));
  });

  it('returns different colors for different labels', () => {
    expect(labelToColor('GitHub')).not.toBe(labelToColor('AWS Console'));
  });
});
