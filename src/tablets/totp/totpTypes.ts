export interface TotpAccount {
  id: string;
  label: string;
  issuer: string;
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 7 | 8;
  period: number;
  type: 'totp';
  color: string;
  addedAt: number;
}

export interface TotpData {
  accounts: TotpAccount[];
  mode: 'codes' | 'verify';
  verifySecret: string;
  verifyCode: string;
}
