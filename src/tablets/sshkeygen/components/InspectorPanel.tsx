import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Lock } from 'lucide-react';
import type { InspectMode, InspectedKey, PairValidationResult, ParseError } from '../sshKeygenTypes';
import { inspectKey, validateKeyPair } from '../useSshKeygenEngine';
import { isParseError } from '../utils/keyParser';
import { KeyMetadataRow } from './KeyMetadataRow';
import { KeyOutputBlock } from './KeyOutputBlock';

interface InspectorPanelProps {
  inspectMode: InspectMode;
  onInspectModeChange: (mode: InspectMode) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const BIT_LENGTH_LABEL: Record<string, string> = {
  'ssh-ed25519': 'Ed25519',
  'ssh-rsa': 'RSA',
  'ecdsa-sha2-nistp256': 'ECDSA P-256',
  'ecdsa-sha2-nistp384': 'ECDSA P-384',
  'ecdsa-sha2-nistp521': 'ECDSA P-521',
};

function SingleKeyInspector() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<InspectedKey | ParseError | null>(null);
  const debounced = useDebounce(input, 200);

  useEffect(() => {
    if (!debounced.trim()) { setResult(null); return; }
    let cancelled = false;
    inspectKey(debounced).then(r => { if (!cancelled) setResult(r); });
    return () => { cancelled = true; };
  }, [debounced]);

  const inspected = result && !isParseError(result) ? result : null;
  const parseError = result && isParseError(result) ? result : null;

  return (
    <div className="space-y-3">
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        rows={8}
        placeholder="Paste any SSH public or private key…"
        spellCheck={false}
        className="w-full font-mono text-xs bg-canvas border border-base rounded-md p-2 text-main placeholder-muted resize-none focus:outline-none focus:border-primary/50 custom-scrollbar transition-colors"
      />

      {parseError && (
        <p className="text-sm text-red-400">{parseError.error}</p>
      )}

      {inspected && (
        <div className="tablet-card space-y-0.5">
          <KeyMetadataRow
            label="Algorithm"
            value={`${BIT_LENGTH_LABEL[inspected.metadata.keyType] ?? inspected.metadata.keyType}`}
          />
          <KeyMetadataRow
            label="Key Size"
            value={`${inspected.metadata.bitLength} bits`}
          />
          <KeyMetadataRow
            label="Kind"
            value={inspected.metadata.isPublic ? 'Public Key' : 'Private Key'}
          />
          {inspected.metadata.comment && (
            <KeyMetadataRow label="Comment" value={inspected.metadata.comment} />
          )}
          <div className="border-t border-base pt-2 mt-2 space-y-0.5">
            <KeyMetadataRow
              label="SHA-256 Fingerprint"
              value={inspected.metadata.fingerprintSha256}
              testId="fingerprint-sha256"
              copyable
            />
            <KeyMetadataRow
              label="MD5 Fingerprint"
              value={inspected.metadata.fingerprintMd5}
              testId="fingerprint-md5"
              copyable
            />
          </div>
          {!inspected.metadata.isPublic && inspected.publicKeyLine && (
            <div className="border-t border-base pt-2 mt-2">
              <KeyOutputBlock
                label="Derived Public Key"
                value={inspected.publicKeyLine}
                downloadFilename="id_unknown.pub"
              />
            </div>
          )}
          {!inspected.metadata.isPublic && inspected.metadata.isEncrypted && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-base text-xs text-muted">
              <Lock size={12} />
              <span>Protected — passphrase required to derive public key</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PairValidator() {
  const [pubKey, setPubKey] = useState('');
  const [privKey, setPrivKey] = useState('');
  const [result, setResult] = useState<PairValidationResult | ParseError | null>(null);
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    setValidating(true);
    const r = await validateKeyPair(pubKey, privKey);
    setResult(r);
    setValidating(false);
  };

  const pairResult = result && !isParseError(result) ? result : null;
  const parseError = result && isParseError(result) ? result : null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">Public Key</label>
        <textarea
          value={pubKey}
          onChange={e => { setPubKey(e.target.value); setResult(null); }}
          rows={4}
          placeholder="Paste public key (ssh-ed25519 AAAA…)"
          spellCheck={false}
          className="w-full font-mono text-xs bg-canvas border border-base rounded-md p-2 text-main placeholder-muted resize-none focus:outline-none focus:border-primary/50 custom-scrollbar transition-colors"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted uppercase tracking-wide">Private Key</label>
        <textarea
          value={privKey}
          onChange={e => { setPrivKey(e.target.value); setResult(null); }}
          rows={8}
          placeholder="Paste private key (-----BEGIN OPENSSH PRIVATE KEY-----…)"
          spellCheck={false}
          className="w-full font-mono text-xs bg-canvas border border-base rounded-md p-2 text-main placeholder-muted resize-none focus:outline-none focus:border-primary/50 custom-scrollbar transition-colors"
        />
      </div>

      <button
        onClick={handleValidate}
        disabled={validating || !pubKey.trim() || !privKey.trim()}
        className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {validating ? 'Validating…' : 'Validate'}
      </button>

      {parseError && (
        <p className="text-sm text-red-400">{parseError.error}</p>
      )}

      {pairResult && (
        <div className={`flex items-center gap-2 p-3 rounded-md border text-sm ${
          pairResult.match
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {pairResult.match
            ? <CheckCircle size={16} className="shrink-0" />
            : <XCircle size={16} className="shrink-0" />}
          <span>{pairResult.detail}</span>
        </div>
      )}
    </div>
  );
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ inspectMode, onInspectModeChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex bg-surface-secondary/50 rounded-lg p-0.5 self-start w-fit">
        {(['single', 'pair'] as InspectMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => onInspectModeChange(mode)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              inspectMode === mode ? 'bg-primary/20 text-primary' : 'text-muted hover:text-main'
            }`}
          >
            {mode === 'single' ? 'Single Key' : 'Validate Pair'}
          </button>
        ))}
      </div>

      {inspectMode === 'single' ? <SingleKeyInspector /> : <PairValidator />}
    </div>
  );
};
