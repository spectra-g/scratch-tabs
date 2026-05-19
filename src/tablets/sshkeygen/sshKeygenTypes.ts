import type { TabletState } from '../types';

export type KeyAlgorithm =
  | 'ed25519'
  | 'rsa-3072'
  | 'rsa-4096'
  | 'ecdsa-p256'
  | 'ecdsa-p384'
  | 'ecdsa-p521';

export type TabMode = 'generate' | 'inspect';
export type InspectMode = 'single' | 'pair';

export interface GeneratedKeyPair {
  privateKey: string;
  publicKey: string;
  fingerprintSha256: string;
  fingerprintMd5: string;
  algorithm: KeyAlgorithm;
  comment: string;
  isEncrypted: boolean;
}

export interface KeyMetadata {
  keyType: string;
  isPublic: boolean;
  bitLength: number;
  comment?: string;
  fingerprintSha256: string;
  fingerprintMd5: string;
  isEncrypted?: boolean;
}

export interface InspectedKey {
  metadata: KeyMetadata;
  publicKeyLine?: string;
}

export interface PairValidationResult {
  match: boolean;
  detail: string;
}

export interface ParsedKey {
  isPublic: boolean;
  keyType: string;
  bitLength: number;
  comment?: string;
  wireBytes?: Uint8Array;
  pubWireBytes?: Uint8Array;
  isEncrypted?: boolean;
}

export interface ParseError {
  error: string;
}

export interface SshKeygenSettings {
  tab: TabMode;
  algorithm: KeyAlgorithm;
  comment: string;
  inspectMode: InspectMode;
}

export interface SshKeygenTabletState extends TabletState {
  type: 'sshkeygen';
  data: SshKeygenSettings;
}
