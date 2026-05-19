import React from 'react';
import type { Tablet, TabletState } from '../types';
import type { TotpData } from './totpTypes';
import { TotpUI } from './TotpUI';

interface TotpTabletState extends TabletState {
  type: 'totp';
  data: TotpData;
}

function createInitialData(): TotpData {
  return {
    accounts: [],
    mode: 'codes',
    verifySecret: '',
    verifyCode: '',
  };
}

function createInitialState(): TotpTabletState {
  return { type: 'totp', data: createInitialData() };
}

export default {
  id: 'totp',
  label: 'TOTP 2FA Generator',
  keywords: [
    'totp', '2fa', 'otp', 'authenticator', 'two-factor', 'mfa',
    'one-time', 'password', 'rfc6238', 'google authenticator',
  ],

  createInitialState,

  serializeState: (state: TotpTabletState) => JSON.stringify(state),

  deserializeState: (json: string): TotpTabletState => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'totp' && parsed.data) {
        return {
          type: 'totp',
          data: {
            ...createInitialData(),
            ...parsed.data,
            accounts: (parsed.data.accounts ?? []).map((a: Record<string, unknown>) => ({
              algorithm: 'SHA1',
              digits: 6,
              period: 30,
              issuer: '',
              color: '#6b7280',
              ...a,
            })),
          },
        };
      }
    } catch {
      // fall through
    }
    return createInitialState();
  },

  render: (state: TotpTabletState, onChange: (s: TotpTabletState) => void) =>
    React.createElement(TotpUI, {
      data: state.data,
      onChange: (data: TotpData) => onChange({ ...state, data }),
    }),
} satisfies Tablet;
