import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import type { KeyAlgorithm, GeneratedKeyPair, SshKeygenSettings } from '../sshKeygenTypes';
import { generateKey } from '../useSshKeygenEngine';
import { KeyOutputBlock } from './KeyOutputBlock';
import { KeyMetadataRow } from './KeyMetadataRow';

const ALGORITHMS: { id: KeyAlgorithm; label: string; badge?: string }[] = [
  { id: 'ed25519', label: 'Ed25519', badge: 'Recommended' },
  { id: 'rsa-3072', label: 'RSA 3072' },
  { id: 'rsa-4096', label: 'RSA 4096' },
  { id: 'ecdsa-p256', label: 'ECDSA P-256' },
  { id: 'ecdsa-p384', label: 'ECDSA P-384' },
  { id: 'ecdsa-p521', label: 'ECDSA P-521' },
];

const ALGO_LABEL: Record<KeyAlgorithm, string> = {
  'ed25519': 'Ed25519',
  'rsa-3072': 'RSA 3072',
  'rsa-4096': 'RSA 4096',
  'ecdsa-p256': 'ECDSA P-256',
  'ecdsa-p384': 'ECDSA P-384',
  'ecdsa-p521': 'ECDSA P-521',
};

const ALGO_FILENAME: Record<KeyAlgorithm, string> = {
  'ed25519': 'ed25519',
  'rsa-3072': 'rsa',
  'rsa-4096': 'rsa',
  'ecdsa-p256': 'ecdsa',
  'ecdsa-p384': 'ecdsa',
  'ecdsa-p521': 'ecdsa',
};

interface GeneratorPanelProps {
  data: SshKeygenSettings;
  onChange: (partial: Partial<SshKeygenSettings>) => void;
}

export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({ data, onChange }) => {
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedKeyPair | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);
    try {
      const keyPair = await generateKey(data.algorithm, data.comment, passphrase);
      setResult(keyPair);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const algoFilename = result ? ALGO_FILENAME[result.algorithm] : '';

  return (
    <div className="space-y-4">
      <div className="tablet-card space-y-4">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted uppercase tracking-wide">Algorithm</span>
          <div className="grid grid-cols-3 gap-1.5">
            {ALGORITHMS.map(({ id, label, badge }) => (
              <button
                key={id}
                onClick={() => onChange({ algorithm: id })}
                className={`relative px-2 py-1.5 rounded-md text-xs border transition-colors ${
                  data.algorithm === id
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'border-base text-muted hover:text-main hover:border-base/60'
                }`}
              >
                {label}
                {badge && (
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-px text-[9px] leading-none bg-primary/15 text-primary border border-primary/30 rounded-full">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted uppercase tracking-wide" htmlFor="ssh-comment">
            Comment
          </label>
          <input
            id="ssh-comment"
            type="text"
            value={data.comment}
            onChange={e => onChange({ comment: e.target.value })}
            placeholder="user@hostname"
            className="w-full bg-canvas border border-base rounded-md px-3 py-1.5 text-sm text-main placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted uppercase tracking-wide" htmlFor="ssh-passphrase">
            Passphrase
          </label>
          <div className="relative">
            <input
              id="ssh-passphrase"
              type={showPassphrase ? 'text' : 'password'}
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              placeholder="Optional passphrase"
              className="w-full bg-canvas border border-base rounded-md px-3 py-1.5 pr-9 text-sm text-main placeholder-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassphrase(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-main transition-colors"
              tabIndex={-1}
            >
              {showPassphrase ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          data-testid="generate-key-button"
          className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
        >
          {generating && <Loader2 size={14} className="animate-spin" />}
          {generating ? 'Generating…' : 'Generate Key Pair'}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 text-xs font-medium">
              {ALGO_LABEL[result.algorithm]}
            </span>
            {data.algorithm !== result.algorithm && (
              <span className="text-xs text-muted">
                Showing previous result — click Generate for {ALGO_LABEL[data.algorithm]}
              </span>
            )}
          </div>
          <div className="p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            This key pair is not saved. Copy or download your private key before closing this tab.
          </div>

          <div className="tablet-card space-y-4">
            <KeyOutputBlock
              label="Private Key"
              value={result.privateKey}
              testId="private-key-output"
              downloadFilename={`id_${algoFilename}`}
            />
            <KeyOutputBlock
              label="Public Key (authorized_keys format)"
              value={result.publicKey}
              testId="public-key-output"
              downloadFilename={`id_${algoFilename}.pub`}
            />
            <div className="space-y-0.5 border-t border-base pt-3">
              <KeyMetadataRow
                label="SHA-256 Fingerprint"
                value={result.fingerprintSha256}
                testId="fingerprint-sha256"
                copyable
              />
              <KeyMetadataRow
                label="MD5 Fingerprint"
                value={result.fingerprintMd5}
                testId="fingerprint-md5"
                copyable
              />
              {result.isEncrypted && (
                <KeyMetadataRow label="Encrypted" value="Yes (passphrase-protected)" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
