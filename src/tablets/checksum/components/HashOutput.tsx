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
    if (!state.expectedChecksum.trim()) return 'border-gray-700';
    
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
        <label className="block text-sm font-medium text-gray-300">
          Expected Checksum (Optional)
          <span className="text-xs text-gray-500 ml-2">Paste a checksum to verify</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={state.expectedChecksum}
            onChange={(e) => onExpectedChecksumChange(e.target.value)}
            placeholder="Paste expected checksum here for comparison..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <h3 className="text-lg font-semibold text-gray-200">Calculated Hashes</h3>
              {/* Source Indicator */}
              <div className="flex items-center space-x-1 px-2 py-1 bg-gray-700/50 rounded-md">
                {state.fileInfo ? (
                  <>
                    <File size={14} className="text-blue-400" />
                    <span className="text-xs text-gray-300">{state.fileInfo.name}</span>
                  </>
                ) : (
                  <>
                    <Type size={14} className="text-green-400" />
                    <span className="text-xs text-gray-300">Text Input</span>
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
                  className={`bg-gray-800 border rounded-lg p-4 transition-colors ${getComparisonBorder(hash)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-200">{algorithm}</span>
                      {state.expectedChecksum && hash && !isError && getComparisonIcon(hash)}
                    </div>
                    {hash && !isEmpty && !isError && (
                      <button
                        onClick={() => handleCopyHash(algorithm, hash)}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                      >
                        <Copy size={12} />
                        <span>{copiedHash === algorithm ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="font-mono text-sm break-all">
                    {isEmpty ? (
                      <span className="text-gray-500 italic">
                        {state.isProcessing ? 'Calculating...' : 'Not calculated'}
                      </span>
                    ) : isError ? (
                      <span className="text-red-400">{hash}</span>
                    ) : (
                      <span className="text-gray-300">{hash}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison Summary */}
          {state.expectedChecksum.trim() && hasAnyHashes && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-200 mb-3">Verification Results</h4>
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