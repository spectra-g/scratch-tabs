import * as jose from 'jose';
import { jwtDecode, JwtPayload, JwtHeader } from 'jwt-decode';
import { DecodedJwt, JwtParts, VerificationResult, SigningResult, KeyType } from '../types';

export function decodeJwt(token: string): DecodedJwt {
  try {
    // Split the token into parts
    const parts = token.split('.');
    let headerObject = {};
    let payloadObject = {};
    let signature = '';
    let warning = null;

    // Check for complete JWT structure
    if (parts.length < 2) {
      warning = 'Incomplete JWT format. Expected at least header and payload parts.';
    } else if (parts.length < 3) {
      warning = 'Missing signature part in JWT.';
    }

    // Try to decode the header (first part)
    if (parts[0]) {
      try {
        headerObject = jwtDecode<JwtHeader>(token, { header: true });
      } catch (headerError) {
        console.warn('[decodeJwt] Error decoding header:', headerError);
        // Try to decode base64 manually if jwt-decode fails
        try {
          const headerStr = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
          headerObject = JSON.parse(headerStr);
        } catch (e) {
          console.warn('[decodeJwt] Failed manual header decode:', e);
        }
      }
    }

    // Try to decode the payload (second part)
    if (parts.length > 1 && parts[1]) {
      try {
        payloadObject = jwtDecode<JwtPayload>(token);
      } catch (payloadError) {
        console.warn('[decodeJwt] Error decoding payload:', payloadError);
        // Try to decode base64 manually if jwt-decode fails
        try {
          const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          payloadObject = JSON.parse(payloadStr);
        } catch (e) {
          console.warn('[decodeJwt] Failed manual payload decode:', e);
        }
      }
    }

    // Get the signature (third part)
    if (parts.length > 2) {
      signature = parts[2];
    }

    return {
      header: headerObject || {},
      payload: payloadObject || {},
      signature,
      warning
    };
  } catch (error) {
    console.error('[decodeJwt] Error during decoding:', error);
    // Return a default/empty structure on error to prevent UI crashes
    return {
      header: {},
      payload: {},
      signature: '',
      warning: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Splits a JWT token into its parts
 */
export function splitJwtParts(token: string): JwtParts {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format. Expected three parts separated by dots.');
  }

  return {
    header: parts[0],
    payload: parts[1],
    signature: parts[2]
  };
}

/**
 * Verifies a JWT token
 */
export async function verifyJwt(token: string, key: string, keyType: KeyType): Promise<VerificationResult> {
  try {
    const { header } = decodeJwt(token);
    const algorithm = header.alg;

    if (!algorithm) {
      return { isValid: false, error: 'No algorithm specified in token header' };
    }

    // Convert key based on type and algorithm
    let verificationKey: Uint8Array | jose.KeyLike;

    if (algorithm.startsWith('HS')) {
      // HMAC algorithms use a secret
      if (keyType === 'base64') {
        // Convert base64 to binary
        verificationKey = jose.base64url.decode(key);
      } else {
        // Use text as is
        verificationKey = new TextEncoder().encode(key);
      }
    } else {
      // RSA and ECDSA algorithms use a public key
      try {
        // Check if the key is in PEM format regardless of selected type
        const isPem = key.trim().startsWith('-----BEGIN');
        
        if (isPem || keyType === 'pem') {
          verificationKey = await jose.importSPKI(key, algorithm);
        } else if (keyType === 'base64') {
          const pemKey = `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
          verificationKey = await jose.importSPKI(pemKey, algorithm);
        } else {
          return { isValid: false, error: 'Invalid key type for asymmetric algorithm' };
        }
      } catch (error) {
        return {
          isValid: false,
          error: `Invalid public key: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    try {
      // Try to verify with jose.jwtVerify
      await jose.jwtVerify(token, verificationKey);
      return { isValid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If the only error is that the token is expired, we still consider it valid
      // for the purposes of this tool (which is verifying signatures, not enforcing validity)
      if (errorMessage.includes('"exp" claim timestamp check failed')) {
        return { isValid: true, warning: 'Note: The token has expired, but the signature is valid.' };
      }
      
      // For any other error, the verification truly failed
      return { isValid: false, error: errorMessage };
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Verification failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Signs a JWT token
 */
export async function signJwt(
  header: { alg: string } & Record<string, any>,
  payload: Record<string, any>,
  key: string,
  keyType: KeyType
): Promise<SigningResult> {
  try {
    const algorithm = header.alg;

    if (!algorithm) {
      return { token: '', error: 'No algorithm specified in token header' };
    }

    // Convert key based on type and algorithm
    let signingKey: Uint8Array | jose.KeyLike;

    if (algorithm.startsWith('HS')) {
      // HMAC algorithms use a secret
      if (keyType === 'base64') {
        // Convert base64 to binary
        signingKey = jose.base64url.decode(key);
      } else {
        // Use text as is
        signingKey = new TextEncoder().encode(key);
      }
    } else {
      // RSA and ECDSA algorithms use a private key
      try {
        // Check if the key is in PEM format regardless of selected type
        const isPem = key.trim().startsWith('-----BEGIN');
        
        if (isPem || keyType === 'pem') {
          signingKey = await jose.importPKCS8(key, algorithm);
        } else if (keyType === 'base64') {
          const pemKey = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
          signingKey = await jose.importPKCS8(pemKey, algorithm);
        } else {
          return { token: '', error: 'Invalid key type for asymmetric algorithm' };
        }
      } catch (error) {
        return {
          token: '',
          error: `Invalid private key: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }

    // Create a new JWT
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader(header)
      .sign(signingKey);

    return { token: jwt };
  } catch (error) {
    return {
      token: '',
      error: `Signing failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generates a key pair for the specified algorithm
 */
export async function generateKeyPair(algorithm: string): Promise<{ publicKey: string, privateKey: string }> {
  try {
    let keyPair: jose.GenerateKeyPairResult;

    if (algorithm.startsWith('RS') || algorithm.startsWith('PS')) {
      // RSA key pair
      keyPair = await jose.generateKeyPair(algorithm, { 
        modulusLength: 2048,
        extractable: true 
      });
    } else if (algorithm.startsWith('ES')) {
      // ECDSA key pair
      const crv = algorithm === 'ES256' ? 'P-256' :
        algorithm === 'ES384' ? 'P-384' : 'P-521';
      keyPair = await jose.generateKeyPair(algorithm, { 
        crv,
        extractable: true 
      });
    } else {
      throw new Error(`Unsupported algorithm for key pair generation: ${algorithm}`);
    }

    // Export keys to PEM format
    const publicKey = await jose.exportSPKI(keyPair.publicKey);
    const privateKey = await jose.exportPKCS8(keyPair.privateKey);

    return { publicKey, privateKey };
  } catch (error) {
    throw new Error(`Key pair generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generates a random secret for HMAC algorithms
 */
export function generateSecret(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return jose.base64url.encode(array);
}

/**
 * Formats a Unix timestamp as a human-readable date string
 */
export function formatTimestamp(timestamp: number): string {
  if (!timestamp) return 'Invalid timestamp';

  try {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  } catch (error) {
    return 'Invalid timestamp';
  }
}

/**
 * Calculates the time difference between now and a timestamp
 */
export function getTimeDifference(timestamp: number): string {
  if (!timestamp) return 'Invalid timestamp';

  try {
    const now = Math.floor(Date.now() / 1000);
    const diff = timestamp - now;

    if (diff > 0) {
      // Future
      if (diff < 60) return `Valid for ${diff} seconds`;
      if (diff < 3600) return `Valid for ${Math.floor(diff / 60)} minutes`;
      if (diff < 86400) return `Valid for ${Math.floor(diff / 3600)} hours`;
      return `Valid for ${Math.floor(diff / 86400)} days`;
    } else {
      // Past
      const absDiff = Math.abs(diff);
      if (absDiff < 60) return `Expired ${absDiff} seconds ago`;
      if (absDiff < 3600) return `Expired ${Math.floor(absDiff / 60)} minutes ago`;
      if (absDiff < 86400) return `Expired ${Math.floor(absDiff / 3600)} hours ago`;
      return `Expired ${Math.floor(absDiff / 86400)} days ago`;
    }
  } catch (error) {
    return 'Invalid timestamp';
  }
}

/**
 * Checks if a string is a valid PEM format
 */
export function isPemFormat(str: string): boolean {
  return /^-----BEGIN (PRIVATE|PUBLIC) KEY-----[\s\S]*-----END (PRIVATE|PUBLIC) KEY-----$/m.test(str.trim());
}

/**
 * Checks if a string is likely a base64 encoded value
 */
export function isBase64(str: string): boolean {
  return /^[A-Za-z0-9+/=]+$/.test(str.trim());
}

/**
 * Creates a JWT token from parts
 */
export function createJwtFromParts(header: string, payload: string, signature: string): string {
  return `${header}.${payload}.${signature}`;
}