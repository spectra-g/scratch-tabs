import {
  fromBase64url,
  buildEd25519PublicWire,
  buildRsaPublicWire,
  buildEcdsaPublicWire,
  buildEd25519PrivateFields,
  buildRsaPrivateFields,
  buildEcdsaPrivateFields,
  encodePrivateKey,
} from './utils/opensshFormat';
import { sha256Fingerprint, md5Fingerprint } from './utils/fingerprint';
import { parseKey, isParseError, derivePublicKeyLine, publicKeyBytesEqual } from './utils/keyParser';
import type { KeyAlgorithm, GeneratedKeyPair, InspectedKey, PairValidationResult, ParseError } from './sshKeygenTypes';

type CryptoParams =
  | { name: 'Ed25519' }
  | { name: 'RSASSA-PKCS1-v1_5'; modulusLength: number; publicExponent: Uint8Array; hash: string }
  | { name: 'ECDSA'; namedCurve: string };

function getCryptoParams(algorithm: KeyAlgorithm): CryptoParams {
  switch (algorithm) {
    case 'ed25519':
      return { name: 'Ed25519' };
    case 'rsa-3072':
      return { name: 'RSASSA-PKCS1-v1_5', modulusLength: 3072, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: 'SHA-256' };
    case 'rsa-4096':
      return { name: 'RSASSA-PKCS1-v1_5', modulusLength: 4096, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: 'SHA-256' };
    case 'ecdsa-p256':
      return { name: 'ECDSA', namedCurve: 'P-256' };
    case 'ecdsa-p384':
      return { name: 'ECDSA', namedCurve: 'P-384' };
    case 'ecdsa-p521':
      return { name: 'ECDSA', namedCurve: 'P-521' };
  }
}

const ECDSA_CURVE_NAMES: Record<string, string> = {
  'P-256': 'nistp256',
  'P-384': 'nistp384',
  'P-521': 'nistp521',
};

export async function generateKey(
  algorithm: KeyAlgorithm,
  comment: string,
  passphrase: string,
): Promise<GeneratedKeyPair> {
  if (!crypto.subtle) {
    throw new Error('Web Crypto API is not available. Open the app over HTTPS.');
  }

  const params = getCryptoParams(algorithm);
  const keyUsages: KeyUsage[] = ['sign', 'verify'];

  const keyPair = await crypto.subtle.generateKey(params as AlgorithmIdentifier, true, keyUsages) as CryptoKeyPair;
  const pubJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

  let publicWireBlob: Uint8Array;
  let privateFields: Uint8Array;
  let keyTypeLine: string;

  if (algorithm === 'ed25519') {
    const pub = fromBase64url(pubJwk.x!);
    const seed = fromBase64url(privJwk.d!);
    publicWireBlob = buildEd25519PublicWire(pub);
    privateFields = buildEd25519PrivateFields(pub, seed);
    keyTypeLine = 'ssh-ed25519';
  } else if (algorithm === 'rsa-3072' || algorithm === 'rsa-4096') {
    const e = fromBase64url(pubJwk.e!);
    const n = fromBase64url(pubJwk.n!);
    publicWireBlob = buildRsaPublicWire(e, n);
    privateFields = buildRsaPrivateFields(privJwk);
    keyTypeLine = 'ssh-rsa';
  } else {
    const namedCurve = (params as { namedCurve: string }).namedCurve;
    const curve = ECDSA_CURVE_NAMES[namedCurve];
    const x = fromBase64url(pubJwk.x!);
    const y = fromBase64url(pubJwk.y!);
    const d = fromBase64url(privJwk.d!);
    publicWireBlob = buildEcdsaPublicWire(curve, x, y);
    privateFields = buildEcdsaPrivateFields(curve, x, y, d);
    keyTypeLine = `ecdsa-sha2-${curve}`;
  }

  let pubB64 = '';
  for (const byte of publicWireBlob) pubB64 += String.fromCharCode(byte);
  const publicKeyLine = `${keyTypeLine} ${btoa(pubB64)}${comment ? ` ${comment}` : ''}`;

  const [fingerprintSha256, fingerprintMd5, privateKeyPem] = await Promise.all([
    sha256Fingerprint(publicWireBlob),
    Promise.resolve(md5Fingerprint(publicWireBlob)),
    encodePrivateKey(publicWireBlob, privateFields, comment, passphrase),
  ]);

  return {
    privateKey: privateKeyPem,
    publicKey: publicKeyLine,
    fingerprintSha256,
    fingerprintMd5,
    algorithm,
    comment,
    isEncrypted: passphrase.length > 0,
  };
}

export async function inspectKey(text: string): Promise<InspectedKey | ParseError> {
  const parsed = parseKey(text);
  if (isParseError(parsed)) return parsed;

  const wireBytes = parsed.isPublic ? parsed.wireBytes! : parsed.pubWireBytes!;
  const [fingerprintSha256, fingerprintMd5] = await Promise.all([
    sha256Fingerprint(wireBytes),
    Promise.resolve(md5Fingerprint(wireBytes)),
  ]);

  const metadata = {
    keyType: parsed.keyType,
    isPublic: parsed.isPublic,
    bitLength: parsed.bitLength,
    comment: parsed.comment,
    fingerprintSha256,
    fingerprintMd5,
    isEncrypted: parsed.isEncrypted,
  };

  if (!parsed.isPublic && !parsed.isEncrypted) {
    const publicKeyLine = derivePublicKeyLine(parsed, parsed.comment ?? '');
    return { metadata, publicKeyLine };
  }

  return { metadata };
}

export async function validateKeyPair(
  publicKeyText: string,
  privateKeyText: string,
): Promise<PairValidationResult | ParseError> {
  const parsedPublic = parseKey(publicKeyText);
  if (isParseError(parsedPublic)) return parsedPublic;

  const parsedPrivate = parseKey(privateKeyText);
  if (isParseError(parsedPrivate)) return parsedPrivate;

  if (!parsedPublic.isPublic) {
    return { match: false, detail: 'Expected a public key in the first field.' };
  }
  if (parsedPrivate.isPublic) {
    return { match: false, detail: 'Expected a private key in the second field.' };
  }

  const match = publicKeyBytesEqual(parsedPublic, parsedPrivate);
  return {
    match,
    detail: match
      ? 'Keys belong to the same pair.'
      : 'Keys do not match — they were generated from different key pairs.',
  };
}
