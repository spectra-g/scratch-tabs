import React from 'react';
import type { Tablet, TabletState } from '../types';
import type { SshKeygenTabletState, SshKeygenSettings } from './sshKeygenTypes';
import { SshKeygenUI } from './SshKeygenUI';

const DEFAULT_SETTINGS: SshKeygenSettings = {
  tab: 'generate',
  algorithm: 'ed25519',
  comment: '',
  inspectMode: 'single',
};

function createInitialState(): SshKeygenTabletState {
  return { type: 'sshkeygen', data: { ...DEFAULT_SETTINGS } };
}

const SshKeygenTablet: Tablet = {
  id: 'sshkeygen',
  label: 'SSH Key Generator',
  keywords: [
    'ssh', 'keygen', 'key', 'rsa', 'ed25519', 'ecdsa', 'nistp256', 'nistp384', 'nistp521',
    'fingerprint', 'public key', 'private key', 'authorized_keys', 'passphrase',
    'generate', 'security', 'cryptography', 'pem', 'openssh',
  ],
  config: { showStandardHeader: false },

  createInitialState,

  serializeState(state: TabletState): string {
    const s = state as SshKeygenTabletState;
    const safe: SshKeygenSettings = {
      tab: s.data.tab,
      algorithm: s.data.algorithm,
      comment: s.data.comment,
      inspectMode: s.data.inspectMode,
    };
    return JSON.stringify({ type: 'sshkeygen', data: safe });
  },

  deserializeState(json: string): SshKeygenTabletState {
    const def = createInitialState();
    try {
      const parsed = JSON.parse(json);
      if (parsed?.type === 'sshkeygen' && parsed.data) {
        return { type: 'sshkeygen', data: { ...DEFAULT_SETTINGS, ...parsed.data } };
      }
    } catch { /* fall through */ }
    return def;
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const s = (state?.type === 'sshkeygen' ? state : createInitialState()) as SshKeygenTabletState;
    return React.createElement(SshKeygenUI, { state: s, onChange });
  },
};

export default SshKeygenTablet;
