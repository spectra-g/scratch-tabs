import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { ChecksumState, HashAlgorithm, FileInfo, HashingProgress } from './types';
import { FileDropzone } from './components/FileDropzone';
import { HashOutput } from './components/HashOutput';
import { hashText, hashFile, compareHashes } from './utils/hashing';
import { Shield, Type, Settings, CheckSquare, Upload } from '../../components/Icons';

interface ChecksumTabletProps {
  state: ChecksumState;
  onChange: (newState: ChecksumState) => void;
}

export const ChecksumTablet: React.FC<ChecksumTabletProps> = ({
  state,
  onChange,
}) => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [lastProcessingDuration, setLastProcessingDuration] = useState<number | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  const stateRef = useRef(state);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep refs current
  onChangeRef.current = onChange;
  stateRef.current = state;
  
  // Sync textarea value when state changes externally (like file upload)
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== state.inputText) {
      textareaRef.current.value = state.inputText;
    }
  }, [state.inputText]);

  // Stabilize selectedAlgorithms reference to prevent unnecessary re-renders
  const selectedAlgorithms = useMemo(() => state.selectedAlgorithms, [JSON.stringify(state.selectedAlgorithms)]);

  // Debounced text hashing
  useEffect(() => {
    if (!state.inputText.trim()) {
      // Only clear if we have hashes to avoid unnecessary re-renders
      if (Object.keys(state.calculatedHashes).length > 0 || state.comparisonResult !== 'none') {
        onChange({
          ...state,
          calculatedHashes: {} as Record<HashAlgorithm, string>,
          comparisonResult: 'none',
        });
      }
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const processingStart = Date.now();
        
        const hashes = await hashText(state.inputText, selectedAlgorithms);
        
        const processingEnd = Date.now();
        const processingDuration = processingEnd - processingStart;
        
        onChange({
          ...state,
          calculatedHashes: hashes,
          isProcessing: false,
          lastProcessedAt: processingEnd,
        });
        
        // Store the processing duration for display
        setLastProcessingDuration(processingDuration);
      } catch (error) {
        console.error('Text hashing error:', error);
        onChange({
          ...state,
          isProcessing: false,
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // Deliberately excluding state and onChange from dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.inputText, selectedAlgorithms]);

  // Update comparison result when hashes or expected checksum changes
  useEffect(() => {
    if (!state.expectedChecksum.trim()) {
      if (state.comparisonResult !== 'none') {
        onChange({ ...state, comparisonResult: 'none' });
      }
      return;
    }

    const hasMatch = Object.values(state.calculatedHashes).some(hash => 
      hash && compareHashes(hash, state.expectedChecksum)
    );

    const newComparisonResult = hasMatch ? 'match' : 'no-match';
    if (newComparisonResult !== state.comparisonResult) {
      onChange({ ...state, comparisonResult: newComparisonResult });
    }
    // Deliberately excluding state and onChange from dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.calculatedHashes, state.expectedChecksum, state.comparisonResult]);

  const handleFileSelected = useCallback(async (file: File, fileInfo: FileInfo) => {
    setCurrentFile(file);
    
    const currentState = stateRef.current;
    const initialState = {
      ...currentState,
      inputText: '', // Clear text input when file is selected
      fileInfo,
      isProcessing: true,
      processingProgress: 0,
      calculatedHashes: {} as Record<HashAlgorithm, string>,
      comparisonResult: 'none' as const,
    };
    onChangeRef.current(initialState);

    try {
      const algorithms = selectedAlgorithms;
      const hashes = await hashFile(file, {
        algorithms,
        onProgress: (progress: HashingProgress) => {
          onChangeRef.current({
            ...initialState,
            processingProgress: progress.progress,
            processingAlgorithm: progress.algorithm,
            isProcessing: true,
          });
        },
      });

      onChangeRef.current({
        ...initialState,
        calculatedHashes: hashes,
        isProcessing: false,
        processingProgress: 100,
        lastProcessedAt: Date.now(),
      });
    } catch (error) {
      console.error('File hashing error:', error);
      onChangeRef.current({
        ...initialState,
        isProcessing: false,
        processingProgress: 0,
      });
    }
  }, [selectedAlgorithms]);

  const handleTextChange = useCallback((text: string) => {
    onChangeRef.current({
      ...stateRef.current,
      inputText: text,
      fileInfo: null, // Clear file info when switching to text
    });
    setCurrentFile(null);
    // Clear processing time while typing
    setLastProcessingDuration(undefined);
  }, []);

  const handleExpectedChecksumChange = useCallback((checksum: string) => {
    onChangeRef.current({
      ...stateRef.current,
      expectedChecksum: checksum,
    });
  }, []);

  const handleAlgorithmToggle = useCallback((algorithm: HashAlgorithm) => {
    const currentState = stateRef.current;
    const isCurrentlySelected = currentState.selectedAlgorithms.includes(algorithm);
    
    // Don't allow deselecting the last algorithm
    if (isCurrentlySelected && currentState.selectedAlgorithms.length === 1) {
      return;
    }
    
    const newAlgorithms = isCurrentlySelected
      ? currentState.selectedAlgorithms.filter(alg => alg !== algorithm)
      : [...currentState.selectedAlgorithms, algorithm];

    onChangeRef.current({
      ...currentState,
      selectedAlgorithms: newAlgorithms,
      calculatedHashes: {} as Record<HashAlgorithm, string>, // Clear previous results
    });
  }, []);

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
                Calculate file and text hashes securely
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Processing Status */}
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
            
            {/* Privacy Panel - Far Right */}
            <div className="bg-green-900/20 border border-green-700 rounded-md p-2">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full mt-1 flex-shrink-0"></div>
                <div>
                  <div className="text-green-300 text-xs font-medium">Privacy Guaranteed</div>
                  <div className="text-green-400/80 text-xs mt-0.5">
                    Your files are never uploaded. All calculations happen locally in your browser.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Algorithm Selection */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings size={14} />
                <h3 className="text-sm font-medium text-gray-200">Hash Algorithms</h3>
              </div>
              <div className="flex items-center space-x-1.5">
                {allAlgorithms.map((algorithm) => (
                  <button
                    key={algorithm}
                    type="button"
                    onClick={() => handleAlgorithmToggle(algorithm)}
                    disabled={state.isProcessing}
                    className={`flex items-center space-x-1 px-2.5 py-1.5 rounded border transition-colors text-xs ${
                      state.selectedAlgorithms.includes(algorithm)
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:bg-gray-700/50'
                    } ${state.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <CheckSquare size={10} className={
                      state.selectedAlgorithms.includes(algorithm) ? 'text-blue-400' : 'text-gray-500'
                    } />
                    <span className="font-medium">{algorithm}</span>
                  </button>
                ))}
              </div>
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
                  ref={textareaRef}
                  defaultValue={state.inputText}
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
              <div className="flex items-center space-x-2">
                <Upload size={18} />
                <h3 className="font-semibold text-gray-200">File Input</h3>
              </div>
              
              <div className="space-y-3">
                <FileDropzone
                  onFileSelected={handleFileSelected}
                  isProcessing={state.isProcessing}
                  currentFile={state.fileInfo}
                />
              </div>
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
                  role="progressbar"
                  aria-valuenow={state.processingProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Processing ${state.processingAlgorithm} - ${state.processingProgress}% complete`}
                ></div>
              </div>
            </div>
          )}

          {/* Hash Output */}
          <HashOutput
            state={state}
            onExpectedChecksumChange={handleExpectedChecksumChange}
            processingTime={lastProcessingDuration}
          />
        </div>
      </div>
    </div>
  );
};

// Default export for the dynamic registry
const createChecksumInitialState = (payload?: any) => ({
  type: 'checksum' as const,
  inputText: payload?.text || '',
  fileInfo: null,
  calculatedHashes: {} as Record<import('./types').HashAlgorithm, string>,
  expectedChecksum: '',
  comparisonResult: 'none' as const,
  isProcessing: false,
  processingProgress: 0,
  processingAlgorithm: '',
  selectedAlgorithms: ['SHA-256', 'SHA-512', 'CRC32'] as import('./types').HashAlgorithm[],
  lastProcessedAt: 0,
});

export default {
  id: 'checksum',
  label: 'Checksum Calculator',
  
  createInitialState: createChecksumInitialState,
  
  serializeState: (state: any) => JSON.stringify(state),
  
  deserializeState: (serialized: string) => {
    try {
      return JSON.parse(serialized);
    } catch {
      return createChecksumInitialState();
    }
  },
  
  render: (state: any, onChange: (newState: any) => void) => 
    React.createElement(ChecksumTablet, { state, onChange }),
};