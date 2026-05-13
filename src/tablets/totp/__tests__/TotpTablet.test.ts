import TotpTablet from '../TotpTablet';

describe('TotpTablet — metadata', () => {
  it('has the correct id and label', () => {
    expect(TotpTablet.id).toBe('totp');
    expect(TotpTablet.label).toBe('TOTP 2FA Generator');
  });

  it('includes relevant keywords', () => {
    expect(TotpTablet.keywords).toContain('totp');
    expect(TotpTablet.keywords).toContain('2fa');
    expect(TotpTablet.keywords).toContain('authenticator');
  });
});

describe('TotpTablet — createInitialState', () => {
  it('returns the expected default shape', () => {
    const state = TotpTablet.createInitialState();
    expect(state.type).toBe('totp');
    expect(state.data.accounts).toEqual([]);
    expect(state.data.mode).toBe('codes');
    expect(state.data.verifySecret).toBe('');
    expect(state.data.verifyCode).toBe('');
  });

  it('returns a new object on each call', () => {
    const a = TotpTablet.createInitialState();
    const b = TotpTablet.createInitialState();
    expect(a).not.toBe(b);
    expect(a.data.accounts).not.toBe(b.data.accounts);
  });
});

describe('TotpTablet — serializeState / deserializeState', () => {
  it('round-trips state without loss', () => {
    const state = TotpTablet.createInitialState();
    state.data.mode = 'verify';
    state.data.verifySecret = 'JBSWY3DPEHPK3PXP';
    state.data.verifyCode = '123456';
    state.data.accounts = [
      {
        id: 'abc',
        label: 'GitHub',
        issuer: 'GitHub',
        secret: 'JBSWY3DPEHPK3PXP',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        type: 'totp',
        color: '#123456',
        addedAt: 1_000_000,
      },
    ];

    const restored = TotpTablet.deserializeState(TotpTablet.serializeState(state));

    expect(restored.type).toBe('totp');
    expect(restored.data.mode).toBe('verify');
    expect(restored.data.verifySecret).toBe('JBSWY3DPEHPK3PXP');
    expect(restored.data.verifyCode).toBe('123456');
    expect(restored.data.accounts).toHaveLength(1);
    expect(restored.data.accounts[0].label).toBe('GitHub');
    expect(restored.data.accounts[0].secret).toBe('JBSWY3DPEHPK3PXP');
    expect(restored.data.accounts[0].color).toBe('#123456');
  });

  it('falls back to default state on corrupt JSON', () => {
    const state = TotpTablet.deserializeState('{invalid json}');
    expect(state.type).toBe('totp');
    expect(state.data.accounts).toEqual([]);
  });

  it('falls back to default state on wrong type', () => {
    const state = TotpTablet.deserializeState(JSON.stringify({ type: 'other', data: {} }));
    expect(state.type).toBe('totp');
    expect(state.data.accounts).toEqual([]);
  });

  it('fills in missing account fields with defaults', () => {
    const partial = JSON.stringify({
      type: 'totp',
      data: {
        accounts: [{ id: 'x', label: 'Test', secret: 'JBSWY3DPEHPK3PXP', type: 'totp' }],
        mode: 'codes',
        verifySecret: '',
        verifyCode: '',
      },
    });

    const state = TotpTablet.deserializeState(partial);
    const account = state.data.accounts[0];
    expect(account.algorithm).toBe('SHA1');
    expect(account.digits).toBe(6);
    expect(account.period).toBe(30);
    expect(account.issuer).toBe('');
  });

  it('preserves existing account fields over defaults', () => {
    const full = JSON.stringify({
      type: 'totp',
      data: {
        accounts: [
          {
            id: 'y',
            label: 'AWS',
            issuer: 'Amazon',
            secret: 'JBSWY3DPEHPK3PXP',
            algorithm: 'SHA512',
            digits: 8,
            period: 60,
            type: 'totp',
            color: 'hsl(200, 60%, 55%)',
            addedAt: 999,
          },
        ],
        mode: 'codes',
        verifySecret: '',
        verifyCode: '',
      },
    });

    const state = TotpTablet.deserializeState(full);
    const account = state.data.accounts[0];
    expect(account.algorithm).toBe('SHA512');
    expect(account.digits).toBe(8);
    expect(account.period).toBe(60);
    expect(account.addedAt).toBe(999);
  });
});
