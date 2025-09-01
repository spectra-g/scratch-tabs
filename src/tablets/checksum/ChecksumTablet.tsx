import React, { useCallback, useState, useEffect } from 'react';
import { ChecksumState, HashAlgorithm, FileInfo, HashingProgress } from './types';
import { FileDropzone } from './components/FileDropzone';
import { HashOutput } from './components/HashOutput';
import { hashText, hashFile, compareHashes } from './utils/hashing';
import { Shield, Type, Settings, CheckSquare } from '../../components/Icons';

interface ChecksumTabletProps {
  state: ChecksumState;
  onChange: (newState: ChecksumState) => void;
}

export const ChecksumTablet: React.FC<ChecksumTabletProps> = ({
  state,
  onChange,
}) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number>(0);

  // Debounced text hashing
  useEffect(() => {
    if (!state.inputText.trim()) {
      onChange({
        ...state,
        calculatedHashes: {} as Record<HashAlgorithm, string>,
        comparisonResult: 'none',
      });
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        onChange({ ...state, isProcessing: true });
        
        const hashes = await hashText(state.inputText, state.selectedAlgorithms);
        
        onChange({
          ...state,
          calculatedHashes: hashes,
          isProcessing: false,
          lastProcessedAt: Date.now(),
        });
      } catch (error) {
        console.error('Text hashing error:', error);
        onChange({
          ...state,
          isProcessing: false,
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [state.inputText, state.selectedAlgorithms]);

  // Update comparison result when hashes or expected checksum changes
  useEffect(() => {
    if (!state.expectedChecksum.trim()) {
      onChange({ ...state, comparisonResult: 'none' });
      return;
    }

    const hasMatch = Object.values(state.calculatedHashes).some(hash => 
      hash && compareHashes(hash, state.expectedChecksum)
    );

    const newComparisonResult = hasMatch ? 'match' : 'no-match';
    if (newComparisonResult !== state.comparisonResult) {
      onChange({ ...state, comparisonResult: newComparisonResult });
    }
  }, [state.calculatedHashes, state.expectedChecksum]);

  const handleFileSelected = useCallback(async (file: File, fileInfo: FileInfo) => {
    setCurrentFile(file);
    setProcessingStartTime(Date.now());
    
    onChange({
      ...state,
      fileInfo,
      isProcessing: true,
      processingProgress: 0,
      calculatedHashes: {} as Record<HashAlgorithm, string>,
      comparisonResult: 'none',
    });

    try {
      const hashes = await hashFile(file, {
        algorithms: state.selectedAlgorithms,
        onProgress: (progress: HashingProgress) => {
          onChange({
            ...state,
            processingProgress: progress.progress,
            processingAlgorithm: progress.algorithm,
          });
        },
      });

      const processingTime = Date.now() - processingStartTime;

      onChange({
        ...state,
        calculatedHashes: hashes,
        isProcessing: false,
        processingProgress: 100,
        lastProcessedAt: Date.now(),
      });
    } catch (error) {
      console.error('File hashing error:', error);
      onChange({
        ...state,
        isProcessing: false,
        processingProgress: 0,
      });
    }
  }, [state, processingStartTime]);

  const handleTextChange = useCallback((text: string) => {
    onChange({
      ...state,
      inputText: text,
      fileInfo: null, // Clear file info when switching to text
    });
    setCurrentFile(null);
  }, [state, onChange]);

  const handleExpectedChecksumChange = useCallback((checksum: string) => {
    onChange({
      ...state,
      expectedChecksum: checksum,
    });
  }, [state, onChange]);

  const handleAlgorithmToggle = useCallback((algorithm: HashAlgorithm) => {
    const newAlgorithms = state.selectedAlgorithms.includes(algorithm)
      ? state.selectedAlgorithms.filter(alg => alg !== algorithm)
      : [...state.selectedAlgorithms, algorithm];
    
    // Ensure at least one algorithm is selected
    if (newAlgorithms.length === 0) return;

    onChange({
      ...state,
      selectedAlgorithms: newAlgorithms,
      calculatedHashes: {} as Record<HashAlgorithm, string>, // Clear previous results
    });
  }, [state, onChange]);

  const allAlgorithms: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'CRC32'];

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield size={28} className="text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Secure Checksum Calculator</h1>
              <p className="text-gray-400 mt-1">
                Calculate file and text hashes locally in your browser
              </p>
            </div>
          </div>
          
          {state.isProcessing && (
            <div className="text-right">
              <div className="text-sm text-gray-300">
                Processing {state.processingAlgorithm}...
              </div>
              <div className="text-xs text-gray-500">
                {state.processingProgress}% complete
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Algorithm Selection */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Settings size={18} />
              <h3 className="font-semibold text-gray-200">Hash Algorithms</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allAlgorithms.map((algorithm) => (
                <button
                  key={algorithm}
                  onClick={() => handleAlgorithmToggle(algorithm)}
                  disabled={state.isProcessing}
                  className={`flex items-center space-x-2 p-3 rounded-md border transition-colors ${
                    state.selectedAlgorithms.includes(algorithm)
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:bg-gray-700/50'
                  } ${state.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <CheckSquare size={16} className={
                    state.selectedAlgorithms.includes(algorithm) ? 'text-blue-400' : 'text-gray-500'
                  } />
                  <span className="text-sm font-medium">{algorithm}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Text Input */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Type size={18} />
                <h3 className="font-semibold text-gray-200">Text Input</h3>
              </div>
              
              <div className="space-y-3">
                <textarea
                  value={state.inputText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Type or paste text here to calculate hashes in real-time..."
                  disabled={state.isProcessing}
                  className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
                />
                
                {state.inputText && (
                  <div className="text-xs text-gray-400">
                    {state.inputText.length.toLocaleString()} characters
                  </div>
                )}
              </div>
            </div>

            {/* File Input */}
            <div className="space-y-4">
              <FileDropzone
                onFileSelected={handleFileSelected}
                isProcessing={state.isProcessing}
                currentFile={state.fileInfo}
              />
            </div>
          </div>

          {/* Progress Bar */}
          {state.isProcessing && state.processingProgress > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                  Processing {state.processingAlgorithm}
                </span>
                <span className="text-sm text-gray-400">
                  {state.processingProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.processingProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Hash Output */}
          <HashOutput
            state={state}
            onExpectedChecksumChange={handleExpectedChecksumChange}
            processingTime={state.lastProcessedAt ? Date.now() - state.lastProcessedAt : undefined}
          />
        </div>
      </div>
    </div>
  );
};