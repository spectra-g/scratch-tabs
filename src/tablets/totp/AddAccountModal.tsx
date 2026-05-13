import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import type { TotpAccount } from './totpTypes';
import { parseOtpauthUri, generateCode, labelToColor } from './useTotpEngine';
import * as OTPAuth from 'otpauth';

interface AddAccountModalProps {
  editAccount?: TotpAccount;
  onSave: (account: TotpAccount) => void;
  onClose: () => void;
}

type Tab = 'uri' | 'manual';

const ALGORITHM_OPTIONS: TotpAccount['algorithm'][] = ['SHA1', 'SHA256', 'SHA512'];
const DIGIT_OPTIONS: TotpAccount['digits'][] = [6, 7, 8];

function isValidBase32(value: string): boolean {
  try {
    OTPAuth.Secret.fromBase32(value.replace(/\s/g, '').toUpperCase());
    return true;
  } catch {
    return false;
  }
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ editAccount, onSave, onClose }) => {
  const [tab, setTab] = useState<Tab>(editAccount ? 'manual' : 'uri');
  const [uriInput, setUriInput] = useState('');
  const [uriError, setUriError] = useState('');

  const [label, setLabel] = useState(editAccount?.label ?? '');
  const [issuer, setIssuer] = useState(editAccount?.issuer ?? '');
  const [secret, setSecret] = useState(editAccount?.secret ?? '');
  const [algorithm, setAlgorithm] = useState<TotpAccount['algorithm']>(editAccount?.algorithm ?? 'SHA1');
  const [digits, setDigits] = useState<TotpAccount['digits']>(editAccount?.digits ?? 6);
  const [period, setPeriod] = useState(editAccount?.period ?? 30);
  const [showSecret, setShowSecret] = useState(false);
  const [secretError, setSecretError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const normalizedSecret = secret.replace(/\s/g, '').toUpperCase();
  const secretValid = normalizedSecret.length > 0 && isValidBase32(normalizedSecret);

  const liveCode = secretValid
    ? (() => {
        try {
          return generateCode({
            id: '',
            label,
            issuer,
            secret: normalizedSecret,
            algorithm,
            digits,
            period,
            type: 'totp',
            color: '',
            addedAt: 0,
          });
        } catch {
          return null;
        }
      })()
    : null;

  const handleParseUri = () => {
    const result = parseOtpauthUri(uriInput.trim());
    if (!result) {
      setUriError('Invalid otpauth:// URI. Check the format and try again.');
      return;
    }
    setUriError('');
    if (result.label) setLabel(result.label);
    if (result.issuer !== undefined) setIssuer(result.issuer);
    if (result.secret) setSecret(result.secret);
    if (result.algorithm) setAlgorithm(result.algorithm);
    if (result.digits) setDigits(result.digits);
    if (result.period) setPeriod(result.period);
    setTab('manual');
  };

  const handleSecretBlur = () => {
    if (secret && !secretValid) {
      setSecretError('Invalid Base32 secret. Use characters A-Z and 2-7 only.');
    } else {
      setSecretError('');
    }
  };

  const handleSave = () => {
    const next: Record<string, string> = {};
    if (!label.trim()) next.label = 'Label is required.';
    if (!normalizedSecret) next.secret = 'Secret is required.';
    else if (!secretValid) next.secret = 'Invalid Base32 secret.';
    if (period < 1 || isNaN(period)) next.period = 'Period must be at least 1 second.';

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const account: TotpAccount = {
      id: editAccount?.id ?? crypto.randomUUID(),
      label: label.trim(),
      issuer: issuer.trim(),
      secret: normalizedSecret,
      algorithm,
      digits,
      period,
      type: 'totp',
      color: editAccount?.color ?? labelToColor(label.trim()),
      addedAt: editAccount?.addedAt ?? Date.now(),
    };

    onSave(account);
  };

  const fieldClass = (key: string) =>
    `w-full px-3 py-2 text-sm bg-canvas border rounded-md text-main placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${
      errors[key] ? 'border-danger focus:ring-danger' : 'border-base focus:border-primary'
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden border border-base"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-base">
          <h2 className="text-base font-semibold text-main">
            {editAccount ? 'Edit Account' : 'Add Account'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted hover:text-main hover:bg-element-hover transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        {!editAccount && (
          <div className="flex border-b border-base px-4">
            {(['uri', 'manual'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm border-b-2 transition-colors ${
                  tab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-main'
                }`}
              >
                {t === 'uri' ? 'Paste URI' : 'Manual Entry'}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 overflow-y-auto space-y-4">
          {tab === 'uri' && !editAccount && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  otpauth:// URI
                </label>
                <textarea
                  value={uriInput}
                  onChange={(e) => { setUriInput(e.target.value); setUriError(''); }}
                  placeholder="otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example"
                  rows={3}
                  className={`w-full px-3 py-2 text-sm bg-canvas border rounded-md text-main placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono ${
                    uriError ? 'border-danger' : 'border-base'
                  }`}
                />
                {uriError && <p className="mt-1 text-xs text-danger">{uriError}</p>}
              </div>
              <button
                onClick={handleParseUri}
                disabled={!uriInput.trim()}
                className="w-full py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity font-medium"
              >
                Parse URI
              </button>
            </>
          )}

          {tab === 'manual' && (
            <>
              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Label <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => { setLabel(e.target.value); setErrors((p) => ({ ...p, label: '' })); }}
                  placeholder="GitHub, AWS Console…"
                  className={fieldClass('label')}
                />
                {errors.label && <p className="mt-1 text-xs text-danger">{errors.label}</p>}
              </div>

              {/* Issuer */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Issuer</label>
                <input
                  type="text"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  placeholder="GitHub"
                  className={fieldClass('issuer')}
                />
              </div>

              {/* Secret */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Secret <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={secret}
                    onChange={(e) => { setSecret(e.target.value); setErrors((p) => ({ ...p, secret: '' })); setSecretError(''); }}
                    onBlur={handleSecretBlur}
                    placeholder="Base32 secret"
                    className={`${fieldClass('secret')} pr-9 font-mono`}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-main"
                    tabIndex={-1}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {(errors.secret || secretError) && (
                  <p className="mt-1 text-xs text-danger">{errors.secret || secretError}</p>
                )}
                {liveCode && (
                  <p className="mt-1 text-xs text-muted">
                    Current code: <span className="font-mono text-main font-semibold">{liveCode}</span>
                  </p>
                )}
              </div>

              {/* Algorithm + Digits + Period row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Algorithm</label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value as TotpAccount['algorithm'])}
                    className={fieldClass('algorithm')}
                  >
                    {ALGORITHM_OPTIONS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Digits</label>
                  <select
                    value={digits}
                    onChange={(e) => setDigits(Number(e.target.value) as TotpAccount['digits'])}
                    className={fieldClass('digits')}
                  >
                    {DIGIT_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Period (s)</label>
                  <input
                    type="number"
                    value={period}
                    min={1}
                    onChange={(e) => { setPeriod(Number(e.target.value)); setErrors((p) => ({ ...p, period: '' })); }}
                    className={fieldClass('period')}
                  />
                  {errors.period && <p className="mt-1 text-xs text-danger">{errors.period}</p>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {(tab === 'manual' || editAccount) && (
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-base">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-md border border-base text-main hover:bg-element-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
            >
              {editAccount ? 'Save Changes' : 'Add Account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
