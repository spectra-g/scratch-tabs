import CryptoJS from 'crypto-js';

export async function sha256Fingerprint(publicKeyWireBlob: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', publicKeyWireBlob);
  let bin = '';
  for (const byte of new Uint8Array(hash)) bin += String.fromCharCode(byte);
  const b64 = btoa(bin).replace(/=+$/, '');
  return `SHA256:${b64}`;
}

export function md5Fingerprint(publicKeyWireBlob: Uint8Array): string {
  // WordArray.create() treats each array element as a 32-bit word, so passing a
  // Uint8Array directly mangles the data. Parse via hex to get correct byte packing.
  const hexString = Array.from(publicKeyWireBlob)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const wordArray = CryptoJS.enc.Hex.parse(hexString);
  const hex = CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Hex);
  return hex.match(/.{2}/g)!.join(':');
}
