import SshKeygenTablet from '../SshKeygenTablet';
import type { SshKeygenTabletState } from '../sshKeygenTypes';

describe('SshKeygenTablet — metadata', () => {
  it('id is sshkeygen', () => {
    expect(SshKeygenTablet.id).toBe('sshkeygen');
  });

  it('label is SSH Key Generator', () => {
    expect(SshKeygenTablet.label).toBe('SSH Key Generator');
  });

  it('keywords include ssh, ed25519, rsa, fingerprint, authorized_keys', () => {
    const kw = SshKeygenTablet.keywords;
    expect(kw).toContain('ssh');
    expect(kw).toContain('ed25519');
    expect(kw).toContain('rsa');
    expect(kw).toContain('fingerprint');
    expect(kw).toContain('authorized_keys');
  });

  it('config.showStandardHeader is false', () => {
    expect(SshKeygenTablet.config?.showStandardHeader).toBe(false);
  });
});

describe('SshKeygenTablet — createInitialState', () => {
  it('returns type sshkeygen', () => {
    expect(SshKeygenTablet.createInitialState().type).toBe('sshkeygen');
  });

  it('default algorithm is ed25519', () => {
    const state = SshKeygenTablet.createInitialState() as SshKeygenTabletState;
    expect(state.data.algorithm).toBe('ed25519');
  });

  it('default tab is generate', () => {
    const state = SshKeygenTablet.createInitialState() as SshKeygenTabletState;
    expect(state.data.tab).toBe('generate');
  });

  it('returns a new object on each call', () => {
    const a = SshKeygenTablet.createInitialState();
    const b = SshKeygenTablet.createInitialState();
    expect(a).not.toBe(b);
    expect(a.data).not.toBe(b.data);
  });
});

describe('SshKeygenTablet — serializeState / deserializeState', () => {
  it('round-trips all four settings fields', () => {
    const state = SshKeygenTablet.createInitialState() as SshKeygenTabletState;
    state.data.algorithm = 'rsa-4096';
    state.data.comment = 'test@host';
    state.data.tab = 'inspect';
    state.data.inspectMode = 'pair';

    const json = SshKeygenTablet.serializeState(state);
    const restored = SshKeygenTablet.deserializeState(json) as SshKeygenTabletState;

    expect(restored.data.algorithm).toBe('rsa-4096');
    expect(restored.data.comment).toBe('test@host');
    expect(restored.data.tab).toBe('inspect');
    expect(restored.data.inspectMode).toBe('pair');
  });

  it('serialized JSON does not contain any passphrase key', () => {
    const state = SshKeygenTablet.createInitialState();
    const json = SshKeygenTablet.serializeState(state);
    expect(json).not.toContain('passphrase');
    expect(json).not.toContain('privateKey');
    expect(json).not.toContain('publicKey');
  });

  it('falls back to default on corrupt JSON', () => {
    const restored = SshKeygenTablet.deserializeState('not-json') as SshKeygenTabletState;
    expect(restored.data.algorithm).toBe('ed25519');
    expect(restored.data.tab).toBe('generate');
  });

  it('falls back to default on wrong type field', () => {
    const restored = SshKeygenTablet.deserializeState(
      JSON.stringify({ type: 'other', data: {} })
    ) as SshKeygenTabletState;
    expect(restored.data.algorithm).toBe('ed25519');
  });

  it('fills missing fields with defaults (forward-compatibility)', () => {
    const json = JSON.stringify({ type: 'sshkeygen', data: { algorithm: 'ecdsa-p256' } });
    const restored = SshKeygenTablet.deserializeState(json) as SshKeygenTabletState;
    expect(restored.data.algorithm).toBe('ecdsa-p256');
    expect(restored.data.tab).toBe('generate');
    expect(restored.data.inspectMode).toBe('single');
  });

  it('a state with algorithm rsa-4096 round-trips correctly', () => {
    const state = SshKeygenTablet.createInitialState() as SshKeygenTabletState;
    state.data.algorithm = 'rsa-4096';
    const json = SshKeygenTablet.serializeState(state);
    const restored = SshKeygenTablet.deserializeState(json) as SshKeygenTabletState;
    expect(restored.data.algorithm).toBe('rsa-4096');
  });
});
