import * as OTPAuth from 'otpauth';
import type { TotpAccount } from './totpTypes';

export function generateCode(account: TotpAccount): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(account.secret),
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
  });
  return totp.generate();
}

export function getTimeRemaining(period: number): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

export function getProgress(period: number): number {
  return (Math.floor(Date.now() / 1000) % period) / period;
}

export function parseOtpauthUri(uri: string): Partial<TotpAccount> | null {
  if (!uri.startsWith('otpauth://')) return null;
  try {
    const parsed = OTPAuth.URI.parse(uri);
    if (!(parsed instanceof OTPAuth.TOTP)) return null;

    // Label may be "issuer:account" — extract the account part
    const rawLabel = decodeURIComponent(parsed.label ?? '');
    const colonIdx = rawLabel.indexOf(':');
    const accountLabel = colonIdx >= 0 ? rawLabel.slice(colonIdx + 1).trim() : rawLabel.trim();

    // Prefer issuer from query param; fall back to label prefix
    const issuer =
      (parsed.issuer ?? (colonIdx >= 0 ? rawLabel.slice(0, colonIdx).trim() : ''));

    const algorithm = parsed.algorithm as TotpAccount['algorithm'];
    const digits = parsed.digits as TotpAccount['digits'];

    return {
      label: accountLabel || rawLabel,
      issuer,
      secret: parsed.secret.base32,
      algorithm: ['SHA1', 'SHA256', 'SHA512'].includes(algorithm) ? algorithm : 'SHA1',
      digits: ([6, 7, 8] as number[]).includes(digits) ? (digits as TotpAccount['digits']) : 6,
      period: parsed.period ?? 30,
    };
  } catch {
    return null;
  }
}

export function verifyCode(
  account: Pick<TotpAccount, 'secret' | 'algorithm' | 'digits' | 'period'>,
  code: string,
): { valid: boolean; drift: number | null } {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(account.secret),
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
  });

  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return { valid: false, drift: null };

  const drift = delta === 0 ? null : delta * account.period;
  return { valid: true, drift };
}

/** Deterministic HSL color derived from a label string. */
export function labelToColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}
