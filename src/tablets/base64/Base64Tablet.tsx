import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tablet, TabletState } from '../types';
import { Base64TabletState, HistoryItem } from './types';
import { base64Formats, getFormatById } from './utils/base64Formats';
import { encodingOptions, getEncodingById } from './utils/encodingOptions';
import { 
  encodeBase64, 
  decodeBase64, 
  validateBase64, 
  calculateBase64Stats,
  processLineByLine,
  isLikelyBase64,
  downloadAsFile,
  handleFileDrop
} from './utils/base64Utils';
import { Base64Toolbar } from './components/Base64Toolbar';
import { Base64Input } from './components/Base64Input';
import { Base64Output } from './components/Base64Output';
import { Base64Stats } from './components/Base64Stats';
import { Base64History } from './components/Base64History';

// Separate React component for Base64 tablet UI
const Base64TabletUI: React.FC<{
  state: Base64TabletState;
  onChange: (state: Base64TabletState) => void;
  tabletId: string; // Add tablet ID for unique identification
}> = ({ state, onChange, tabletId }) => {
  const { 
    input, 
    output, 
    mode, 
    selectedFormat, 
    selectedEncoding, 
    wrapOutput, 
    preserveNewlines, 
    history, 
    error, 
    isDragging,
    layout
  } = state.data;

  const [stats, setStats] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isValidBase64, setIsValidBase64] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process input based on mode
  const processInput = useCallback(() => {
    if (!input) {
      onChange({
        ...state,
        data: {
          ...state.data,
          output: '',
          error: null
        }
      });
      setStats(null);
      return;
    }

    try {
      let result = '';
      
      if (mode === 'encode') {
        result = encodeBase64(input, selectedFormat, selectedEncoding, wrapOutput);
      } else if (mode === 'decode') {
        result = decodeBase64(input, selectedFormat, selectedEncoding);
      } else if (mode === 'line-by-line') {
        // Determine if we should encode or decode based on input
        const shouldEncode = !isLikelyBase64(input.split('\n')[0] || '');
        result = processLineByLine(
          input, 
          shouldEncode ? 'encode' : 'decode', 
          selectedFormat, 
          selectedEncoding,
          preserveNewlines
        );
      }

      // Calculate stats
      const newStats = calculateBase64Stats(input, result);
      setStats(newStats);

      // Add to history
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        action: mode === 'line-by-line' 
          ? (isLikelyBase64(input.split('\n')[0] || '') ? 'decode' : 'encode')
          : mode,
        input,
        output: result,
        format: selectedFormat,
        encoding: selectedEncoding
      };

      onChange({
        ...state,
        data: {
          ...state.data,
          output: result,
          error: null,
          history: [historyItem, ...state.data.history.slice(0, 99)] // Keep last 100 items
        }
      });
    } catch (err) {
      onChange({
        ...state,
        data: {
          ...state.data,
          error: err instanceof Error ? err.message : String(err)
        }
      });
    }
  }, [input, mode, selectedFormat, selectedEncoding, wrapOutput, preserveNewlines, state, onChange]);

  // Validate Base64 input
  useEffect(() => {
    if (mode === 'decode' && input) {
      const isValid = validateBase64(input, selectedFormat);
      setIsValidBase64(isValid);
    } else {
      setIsValidBase64(true);
    }
  }, [input, mode, selectedFormat]);

  // Process input when relevant state changes (excluding processInput from dependencies)
  useEffect(() => {
    if (input) {
      processInput();
    }
  }, [input, mode, selectedFormat, selectedEncoding, wrapOutput, preserveNewlines]);

  // Handle keyboard shortcuts - make them specific to this tablet instance
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check if this tablet is the active one by looking for the tablet container
      const tabletContainer = document.querySelector(`[data-tablet-id="${tabletId}"]`);
      if (!tabletContainer || !tabletContainer.contains(e.target as Node)) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'e') {
          e.preventDefault();
          onChange({
            ...state,
            data: {
              ...state.data,
              mode: 'encode'
            }
          });
        } else if (e.key === 'd') {
          e.preventDefault();
          onChange({
            ...state,
            data: {
              ...state.data,
              mode: 'decode'
            }
          });
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          const modes = ['encode', 'decode', 'line-by-line'];
          const currentIndex = modes.indexOf(mode);
          const newIndex = e.key === 'ArrowUp' 
            ? (currentIndex - 1 + modes.length) % modes.length 
            : (currentIndex + 1) % modes.length;
          
          onChange({
            ...state,
            data: {
              ...state.data,
              mode: modes[newIndex] as 'encode' | 'decode' | 'line-by-line'
            }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, onChange, mode, tabletId]);

  // Handle file upload
  const handleUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const fileContent = await handleFileDrop(file);
        onChange({
          ...state,
          data: {
            ...state.data,
            input: fileContent
          }
        });
      } catch (error) {
        onChange({
          ...state,
          data: {
            ...state.data,
            error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
          }
        });
      }
    }
  }, [state, onChange]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (output) {
      const filename = mode === 'encode' ? 'encoded.txt' : 'decoded.txt';
      downloadAsFile(output, filename);
    }
  }, [output, mode]);

  // Handle clear
  const handleClear = useCallback(() => {
    onChange({
      ...state,
      data: {
        ...state.data,
        input: '',
        output: '',
        error: null
      }
    });
    setStats(null);
  }, [state, onChange]);

  // Handle swap
  const handleSwap = useCallback(() => {
    onChange({
      ...state,
      data: {
        ...state.data,
        input: output,
        output: '',
        mode: mode === 'encode' ? 'decode' : 'encode',
        error: null
      }
    });
  }, [state, onChange, output, mode]);

  // Handle copy
  const handleCopyOutput = useCallback(() => {
    if (output) {
      navigator.clipboard.writeText(output);
    }
  }, [output]);

  const handleCopyInput = useCallback(() => {
    if (input) {
      navigator.clipboard.writeText(input);
    }
  }, [input]);

  // Handle history
  const handleClearHistory = useCallback(() => {
    onChange({
      ...state,
      data: {
        ...state.data,
        history: []
      }
    });
  }, [state, onChange]);

  const handleRestoreHistoryItem = useCallback((item: HistoryItem) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        input: item.input,
        output: item.output,
        mode: item.action,
        selectedFormat: item.format,
        selectedEncoding: item.encoding,
        error: null
      }
    });
    setStats(calculateBase64Stats(item.input, item.output));
  }, [state, onChange]);

  const handleDeleteHistoryItem = useCallback((id: string) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        history: history.filter(item => item.id !== id)
      }
    });
  }, [state, onChange, history]);

  // Update state helpers
  const setInput = useCallback((value: string) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        input: value,
        error: null
      }
    });
  }, [state, onChange]);

  const setMode = useCallback((newMode: 'encode' | 'decode' | 'line-by-line') => {
    onChange({
      ...state,
      data: {
        ...state.data,
        mode: newMode,
        error: null
      }
    });
  }, [state, onChange]);

  const setSelectedFormat = useCallback((format: string) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        selectedFormat: format,
        error: null
      }
    });
  }, [state, onChange]);

  const setSelectedEncoding = useCallback((encoding: string) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        selectedEncoding: encoding,
        error: null
      }
    });
  }, [state, onChange]);

  const setWrapOutput = useCallback((wrap: boolean) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        wrapOutput: wrap,
        error: null
      }
    });
  }, [state, onChange]);

  const setPreserveNewlines = useCallback((preserve: boolean) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        preserveNewlines: preserve,
        error: null
      }
    });
  }, [state, onChange]);

  const setIsDragging = useCallback((dragging: boolean) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        isDragging: dragging
      }
    });
  }, [state, onChange]);

  const setLayout = useCallback((newLayout: 'horizontal' | 'vertical') => {
    onChange({
      ...state,
      data: {
        ...state.data,
        layout: newLayout
      }
    });
  }, [state, onChange]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200" data-tablet-id={tabletId}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* Toolbar */}
      <Base64Toolbar
        mode={mode}
        setMode={setMode}
        selectedFormat={selectedFormat}
        setSelectedFormat={setSelectedFormat}
        selectedEncoding={selectedEncoding}
        setSelectedEncoding={setSelectedEncoding}
        wrapOutput={wrapOutput}
        setWrapOutput={setWrapOutput}
        preserveNewlines={preserveNewlines}
        setPreserveNewlines={setPreserveNewlines}
        onCopyOutput={handleCopyOutput}
        onCopyInput={handleCopyInput}
        onClear={handleClear}
        onSwap={handleSwap}
        onDownload={handleDownload}
        onUpload={handleUpload}
        formats={base64Formats}
        encodings={encodingOptions}
        hasOutput={!!output}
        hasInput={!!input}
        canProcess={!!input}
        layout={layout}
        setLayout={setLayout}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
      />
      
      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <Base64History
            history={history}
            onClearHistory={handleClearHistory}
            onRestoreItem={handleRestoreHistoryItem}
            onDeleteItem={handleDeleteHistoryItem}
          />
        )}
      </AnimatePresence>
      
      {/* Main Content */}
      <div className={`flex-1 p-3 flex ${layout === 'horizontal' ? 'flex-row' : 'flex-col'} gap-3 overflow-auto custom-scrollbar`}>
        {/* Input */}
        <Base64Input
          value={input}
          onChange={setInput}
          placeholder={
            mode === 'encode' 
              ? 'Enter text to encode...' 
              : mode === 'decode' 
              ? 'Enter Base64 to decode...' 
              : 'Enter text or Base64 (one per line)...'
          }
          error={error}
          mode={mode}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
        
        {/* Output */}
        <Base64Output
          value={output}
          isValid={isValidBase64}
          mode={mode}
        />
      </div>
      
      {/* Stats Footer */}
      <div className="p-3 border-t border-gray-700/50">
        <AnimatePresence>
          {stats && input && output && (
            <Base64Stats stats={stats} mode={mode} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Wrapper component to handle stable ID generation
const Base64TabletWrapper: React.FC<{
  state: Base64TabletState;
  onChange: (state: Base64TabletState) => void;
}> = ({ state, onChange }) => {
  const tabletInstanceId = React.useMemo(() => `base64-${crypto.randomUUID()}`, []);
  return <Base64TabletUI state={state} onChange={onChange} tabletId={tabletInstanceId} />;
};

export const Base64Tablet: Tablet = {
  id: 'base64',
  label: 'Base64 Encoder/Decoder',
  keywords: ['base64', 'encode', 'decode', 'converter', 'binary', 'text'],

  createInitialState(): Base64TabletState {
    return {
      type: 'base64',
      data: {
        input: '',
        output: '',
        mode: 'encode',
        selectedFormat: 'standard',
        selectedEncoding: 'utf8',
        wrapOutput: false,
        preserveNewlines: true,
        history: [],
        error: null,
        isDragging: false,
        layout: 'horizontal'
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json) as Base64TabletState;
      if (parsed.type === 'base64' && parsed.data) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse Base64 tablet state:', e);
    }
    return this.createInitialState();
  },

  render(state: Base64TabletState, onChange) {
    return <Base64TabletWrapper state={state} onChange={onChange} />;
  }
};