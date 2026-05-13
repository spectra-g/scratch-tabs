import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { TotpAccount } from './totpTypes';
import { verifyCode } from './useTotpEngine';

interface VerifyPanelProps {
  secret: string;
  code: string;
  onSecretChange: (v: string) => void;
  onCodeChange: (v: string) => void;
}

type VerifyResult =
  | { status: 'valid' }
  | { status: 'invalid' }
  | { status: 'skew'; drift: number };

export const VerifyPanel: React.FC<VerifyPanelProps> = ({
  secret,
  code,
  onSecretChange,
  onCodeChange,
}) => {
  const [result, setResult] = useState<VerifyResult | null>(null);

  const handleVerify = () => {
    const normalizedSecret = secret.replace(/\s/g, '').toUpperCase();
    const normalizedCode = code.replace(/\s/g, '');

    const account: Pick<TotpAccount, 'secret' | 'algorithm' | 'digits' | 'period'> = {
      secret: normalizedSecret,
      algorithm: 'SHA1',
      digits: normalizedCode.length === 8 ? 8 : normalizedCode.length === 7 ? 7 : 6,
      period: 30,
    };

    const { valid, drift } = verifyCode(account, normalizedCode);

    if (!valid) {
      setResult({ status: 'invalid' });
    } else if (drift !== null) {
      setResult({ status: 'skew', drift });
    } else {
      setResult({ status: 'valid' });
    }
  };

  const fieldClass =
    'w-full px-3 py-2 text-sm bg-canvas border border-base rounded-md text-main placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors';

  return (
    <div className="p-4 max-w-sm space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted mb-1">Secret (Base32)</label>
        <input
          type="text"
          value={secret}
          onChange={(e) => { onSecretChange(e.target.value); setResult(null); }}
          placeholder="JBSWY3DPEHPK3PXP"
          className={`${fieldClass} font-mono`}
          spellCheck={false}
          autoComplete="off"
          data-testid="verify-secret-input"
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-muted mb-1">Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => { onCodeChange(e.target.value); setResult(null); }}
            placeholder="000000"
            maxLength={8}
            className={`${fieldClass} font-mono tracking-widest`}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            data-testid="verify-code-input"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleVerify}
            disabled={!secret.trim() || !code.trim()}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity font-medium"
            data-testid="verify-button"
          >
            Verify
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`flex items-start gap-2 p-3 rounded-md text-sm ${
            result.status === 'valid'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : result.status === 'invalid'
              ? 'bg-danger/10 text-danger'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
          data-testid="verify-result"
        >
          {result.status === 'valid' && (
            <>
              <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>Valid — code matches the current window.</span>
            </>
          )}
          {result.status === 'invalid' && (
            <>
              <XCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>Invalid — not found in current or adjacent windows.</span>
            </>
          )}
          {result.status === 'skew' && (
            <>
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                Clock skew — valid but{' '}
                {Math.abs(result.drift)} seconds{' '}
                {result.drift < 0 ? 'behind' : 'ahead of'} server time.
              </span>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-muted">
        Uses SHA-1, 6 digits, 30-second window. Edit an account above to verify non-default settings.
      </p>
    </div>
  );
};
