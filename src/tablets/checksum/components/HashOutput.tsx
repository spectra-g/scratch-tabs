import React, { useState } from 'react';
import { Copy, CheckCircle, XCircle, Eye, EyeOff, Type, File } from '../../../components/Icons';
import { HashAlgorithm, ChecksumState } from '../types';
import { compareHashes, formatProcessingTime } from '../utils/hashing';

interface HashOutputProps {
  state: ChecksumState;
  onExpectedChecksumChange: (checksum: string) => void;
  processingTime?: number;
}

export const HashOutput: React.FC<HashOutputProps> = ({
  state,
  onExpectedChecksumChange,
  processingTime,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showAllHashes, setShowAllHashes] = useState(true);

  const handleCopyHash = async (algorithm: HashAlgorithm, hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(algorithm);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (error) {
      console.error('Failed to copy hash:', error);
    }
  };

  const getComparisonIcon = (hash: string) => {
    if (!state.expectedChecksum.trim()) return null;

    const matches = compareHashes(hash, state.expectedChecksum);
    return matches ? (
      <CheckCircle size={16} className="text-green-400" />
    ) : (
      <XCircle size={16} className="text-red-400" />
    );
  };

  const getComparisonBorder = (hash: string) => {
    if (!state.expectedChecksum.trim()) return 'border-base';

    const matches = compareHashes(hash, state.expectedChecksum);
    return matches ? 'border-green-500/50' : 'border-red-500/50';
  };

  const hasAnyHashes = Object.values(state.calculatedHashes).some(hash => hash && hash.length > 0);
  const visibleAlgorithms = showAllHashes
    ? state.selectedAlgorithms
    : state.selectedAlgorithms.filter(alg => state.calculatedHashes[alg]);

  return (
    <div className="space-y-6">
      {/* Expected Checksum Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-secondary">
          Expected Checksum (Optional)
          <span className="text-xs text-muted ml-2">Paste a checksum to verify</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={state.expectedChecksum}
            onChange={(e) => onExpectedChecksumChange(e.target.value)}
            placeholder="Paste expected checksum here for comparison..."
            className="w-full px-3 py-2 bg-surface text-main border border-base rounded-md placeholder-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
          />
          {state.expectedChecksum && (
            <button
              onClick={() => onExpectedChecksumChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
              aria-label="Clear expected checksum"
              title="Clear expected checksum"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Hash Results */}
      {hasAnyHashes && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-main">Calculated Hashes</h3>
              {/* Source Indicator */}
              <div className="flex items-center space-x-1 px-2 py-1 bg-surface-raised rounded-md border border-base">
                {state.fileInfo ? (
                  <>
                    <File size={14} className="text-info" />
                    <span className="text-xs text-secondary">{state.fileInfo.name}</span>
                  </>
                ) : (
                  <>
                    <Type size={14} className="text-success" />
                    <span className="text-xs text-secondary">Text Input</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {processingTime && (
                <span className="text-xs text-gray-400">
                  Processed in {formatProcessingTime(processingTime)}
                </span>
              )}
              <button
                onClick={() => setShowAllHashes(!showAllHashes)}
                className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-200"
              >
                {showAllHashes ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showAllHashes ? 'Hide Empty' : 'Show All'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {visibleAlgorithms.map((algorithm) => {
              const hash = state.calculatedHashes[algorithm];
              const isEmpty = !hash || hash.length === 0;
              const isError = hash && hash.startsWith('Error:');

              return (
                <div
                  key={algorithm}
                  className={`bg-surface border rounded-lg p-4 transition-colors ${getComparisonBorder(hash)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-main">{algorithm}</span>
                      {algorithm === 'MD5' && (
                        <span className="text-xs bg-warning-subtle text-warning border border-warning/50 px-2 py-0.5 rounded-md font-medium">
                          ⚠️ Legacy Only
                        </span>
                      )}
                      {state.expectedChecksum && hash && !isError && getComparisonIcon(hash)}
                    </div>
                    {hash && !isEmpty && !isError && (
                      <button
                        onClick={() => handleCopyHash(algorithm, hash)}
                        className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${copiedHash === algorithm
                            ? 'bg-success-subtle border border-success text-success'
                            : 'bg-element hover:bg-element-hover text-secondary'
                          }`}
                      >
                        {copiedHash === algorithm ? (
                          <CheckCircle size={12} className="text-green-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                        <span>{copiedHash === algorithm ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>

                  <div className="font-mono text-sm break-all">
                    {isEmpty ? (
                      <span className="text-muted italic">
                        {state.isProcessing ? 'Calculating...' : 'Not calculated'}
                      </span>
                    ) : isError ? (
                      <span className="text-danger">{hash}</span>
                    ) : (
                      <span className="text-main">{hash}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security Warning for MD5 */}
          {state.selectedAlgorithms.includes('MD5') && state.calculatedHashes['MD5'] && !state.calculatedHashes['MD5'].startsWith('Error:') && (
            <div className="bg-warning-subtle border border-warning/30 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <span className="text-warning font-semibold">⚠️</span>
                <div>
                  <h4 className="font-medium text-warning mb-1">Security Notice</h4>
                  <p className="text-sm text-warning/80">
                    MD5 is cryptographically broken and should not be used for security purposes.
                    It's provided only for legacy compatibility with existing checksums.
                    For new applications, use SHA-256 or higher.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Summary */}
          {state.expectedChecksum.trim() && hasAnyHashes && (
            <div className="bg-surface-secondary border border-base rounded-lg p-4">
              <h4 className="font-medium text-main mb-3">Verification Results</h4>
              <div className="space-y-2">
                {state.selectedAlgorithms
                  .filter(alg => state.calculatedHashes[alg] && !state.calculatedHashes[alg].startsWith('Error:'))
                  .map((algorithm) => {
                    const hash = state.calculatedHashes[algorithm];
                    const matches = compareHashes(hash, state.expectedChecksum);

                    return (
                      <div key={algorithm} className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">{algorithm}</span>
                        <div className="flex items-center space-x-2">
                          {matches ? (
                            <>
                              <CheckCircle size={16} className="text-green-400" />
                              <span className="text-sm text-green-400 font-medium">Match</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} className="text-red-400" />
                              <span className="text-sm text-red-400 font-medium">No Match</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};