import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v1 as uuidv1, v4 as uuidv4, validate as uuidValidate, version as uuidVersion } from 'uuid';
import { 
  Copy, 
  RefreshCw, 
  Download, 
  Trash2, 
  ClipboardPaste, 
  Search, 
  CheckCircle, 
  Clock, 
  Settings, 
  X, 
  ChevronDown, 
  FileText, 
  Database, 
  List, 
  Grid2X2
} from 'lucide-react';
import { Tablet, TabletState } from '../types';

// UUID v7 polyfill (time-ordered UUIDs)
function uuidv7(): string {
  const msTimestamp = Date.now();
  
  // Convert timestamp to hexadecimal and pad to 12 characters
  const timestampHex = msTimestamp.toString(16).padStart(12, '0');
  
  // Generate 16 random bytes (similar to v4 UUID)
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  
  // Set the timestamp in the first 6 bytes
  for (let i = 0; i < 6; i++) {
    randomBytes[i] = parseInt(timestampHex.substring(i * 2, i * 2 + 2), 16);
  }
  
  // Set version 7
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x70;
  
  // Set variant (RFC4122)
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;
  
  // Convert to UUID string format
  const hexString = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
  
  return [
    hexString.substring(0, 8),
    hexString.substring(8, 12),
    hexString.substring(12, 16),
    hexString.substring(16, 20),
    hexString.substring(20, 32)
  ].join('-');
}

// ULID implementation
function generateULID(): string {
  // Time component: first 10 characters (48 bits)
  const now = Date.now();
  const timeComponent = encodeTime(now);
  
  // Random component: last 16 characters (80 bits)
  const randomComponent = encodeRandom();
  
  return timeComponent + randomComponent;
}

// Crockford's Base32 encoding
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encodeTime(time: number): string {
  const timeChars = new Array(10);
  
  // Encode time using Crockford's Base32
  for (let i = 9; i >= 0; i--) {
    timeChars[i] = ENCODING.charAt(time % 32);
    time = Math.floor(time / 32);
  }
  
  return timeChars.join('');
}

function encodeRandom(): string {
  const randomChars = new Array(16);
  const randomBytes = new Uint8Array(10); // 80 bits = 10 bytes
  
  crypto.getRandomValues(randomBytes);
  
  for (let i = 0; i < 16; i++) {
    // Each byte provides enough bits for 1.6 Base32 characters
    // So we need to handle the bit manipulation carefully
    let index;
    if (i % 5 === 0) {
      // For every 5th character, use the first 5 bits of a new byte
      index = randomBytes[Math.floor(i / 5) * 3] & 31;
    } else if (i % 5 === 1) {
      // Use the last 3 bits of the first byte and first 2 bits of the second byte
      index = ((randomBytes[Math.floor(i / 5) * 3] >> 5) | (randomBytes[Math.floor(i / 5) * 3 + 1] << 3)) & 31;
    } else if (i % 5 === 2) {
      // Use the middle 5 bits of the second byte
      index = (randomBytes[Math.floor(i / 5) * 3 + 1] >> 2) & 31;
    } else if (i % 5 === 3) {
      // Use the last 2 bits of the second byte and first 3 bits of the third byte
      index = ((randomBytes[Math.floor(i / 5) * 3 + 1] >> 7) | (randomBytes[Math.floor(i / 5) * 3 + 2] << 1)) & 31;
    } else {
      // Use the last 5 bits of the third byte
      index = (randomBytes[Math.floor(i / 5) * 3 + 2] >> 4) & 31;
    }
    
    randomChars[i] = ENCODING.charAt(index);
  }
  
  return randomChars.join('');
}

// Decode ULID timestamp
function decodeULIDTime(ulid: string): number {
  const timeChars = ulid.substring(0, 10);
  let time = 0;
  
  for (let i = 0; i < 10; i++) {
    time = time * 32 + ENCODING.indexOf(timeChars.charAt(i));
  }
  
  return time;
}

// Validate ULID format
function isValidULID(ulid: string): boolean {
  if (ulid.length !== 26) return false;
  
  // Check if all characters are valid Crockford's Base32
  return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(ulid);
}

// UUID Analysis
interface UuidAnalysis {
  isValid: boolean;
  version?: number;
  timestamp?: Date;
  variant?: string;
  format?: string;
  isULID?: boolean;
  ulidTimestamp?: Date;
}

function analyzeId(id: string): UuidAnalysis {
  // Remove all hyphens and convert to uppercase for normalization
  const normalized = id.replace(/-/g, '').toUpperCase();
  
  // Check if it's a ULID (26 characters, Crockford's Base32)
  if (normalized.length === 26 && isValidULID(normalized)) {
    const timestamp = decodeULIDTime(normalized);
    return {
      isValid: true,
      isULID: true,
      ulidTimestamp: new Date(timestamp),
      format: 'ULID'
    };
  }
  
  // Check if it's a UUID
  if (uuidValidate(id)) {
    const ver = uuidVersion(id);
    let timestamp: Date | undefined;
    
    // Extract timestamp for v1
    if (ver === 1) {
      // UUID v1 timestamp extraction
      // This is a simplified approach - full implementation would be more complex
      const parts = id.split('-');
      const timeLow = parseInt(parts[0], 16);
      const timeMid = parseInt(parts[1], 16);
      const timeHigh = parseInt(parts[2].substring(0, 4), 16);
      
      // Combine the parts and adjust for UUID epoch (October 15, 1582)
      const uuidEpoch = Date.UTC(1582, 9, 15, 0, 0, 0, 0);
      const uuidTimestamp = ((timeHigh & 0x0FFF) << 48) | (timeMid << 32) | timeLow;
      const jsTimestamp = uuidTimestamp / 10000 + uuidEpoch;
      
      timestamp = new Date(jsTimestamp);
    }
    
    // For v7, extract the timestamp from the first component
    if (ver === 7) {
      const timestampHex = id.split('-')[0];
      const timestampMs = parseInt(timestampHex, 16);
      timestamp = new Date(timestampMs);
    }
    
    return {
      isValid: true,
      version: ver,
      timestamp,
      variant: 'RFC4122',
      format: 'UUID'
    };
  }
  
  return { isValid: false };
}

// Types
interface UuidItem {
  id: string;
  type: 'v1' | 'v4' | 'v7' | 'ulid';
  timestamp: Date;
  copied?: boolean;
}

interface UuidTabletState extends TabletState {
  type: 'uuid';
  data: {
    items: UuidItem[];
    settings: {
      autoGenerate: boolean;
      interval: number;
      format: 'hyphenated' | 'no-hyphens';
      case: 'lower' | 'upper';
      viewMode: 'list' | 'grid';
      selectedType: 'v1' | 'v4' | 'v7' | 'ulid';
    };
    analysis: UuidAnalysis | null;
    bulkGeneration: {
      count: number;
      type: 'v1' | 'v4' | 'v7' | 'ulid';
      result: string[];
    };
  };
}

// Component for UUID item
const UuidItemComponent: React.FC<{
  item: UuidItem;
  format: 'hyphenated' | 'no-hyphens';
  casing: 'lower' | 'upper';
  onCopy: (id: string) => void;
}> = ({ item, format, casing, onCopy }) => {
  const formattedId = format === 'hyphenated' 
    ? item.id 
    : item.id.replace(/-/g, '');
  
  const displayId = casing === 'upper' 
    ? formattedId.toUpperCase() 
    : formattedId.toLowerCase();
  
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:border-gray-600/50 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-0.5 rounded ${
            item.type === 'v1' ? 'bg-blue-500/20 text-blue-400' :
            item.type === 'v4' ? 'bg-green-500/20 text-green-400' :
            item.type === 'v7' ? 'bg-purple-500/20 text-purple-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {item.type === 'ulid' ? 'ULID' : `UUID ${item.type}`}
          </span>
          <span className="text-xs text-gray-400">
            {item.timestamp.toLocaleTimeString()}
          </span>
        </div>
        <button
          onClick={() => onCopy(displayId)}
          className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
          title="Copy to clipboard"
        >
          {item.copied ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
      </div>
      <div 
        className="font-mono text-sm text-gray-200 break-all cursor-pointer"
        onClick={() => onCopy(displayId)}
        title="Click to copy"
      >
        {displayId}
      </div>
    </div>
  );
};

// Main Tablet Component
export const UuidTablet: Tablet = {
  id: 'uuid',
  label: 'UUID Generator',
  keywords: ['uuid', 'guid', 'id', 'generator', 'ulid', 'identifier'],

  createInitialState(): UuidTabletState {
    return {
      type: 'uuid',
      data: {
        items: [],
        settings: {
          autoGenerate: false,
          interval: 5,
          format: 'hyphenated',
          case: 'lower',
          viewMode: 'list',
          selectedType: 'v4'
        },
        analysis: null,
        bulkGeneration: {
          count: 10,
          type: 'v4',
          result: []
        }
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'uuid' && parsed.data) {
        // Convert timestamp strings back to Date objects
        if (parsed.data.items) {
          parsed.data.items = parsed.data.items.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
        }
        
        // Convert analysis timestamp if it exists
        if (parsed.data.analysis && parsed.data.analysis.timestamp) {
          parsed.data.analysis.timestamp = new Date(parsed.data.analysis.timestamp);
        }
        
        if (parsed.data.analysis && parsed.data.analysis.ulidTimestamp) {
          parsed.data.analysis.ulidTimestamp = new Date(parsed.data.analysis.ulidTimestamp);
        }
        
        return parsed;
      }
    } catch (e) {
      console.error("Failed to deserialize UUID tablet state:", e);
    }
    
    // Return default state on error
    return this.createInitialState();
  },

  render(state: UuidTabletState, onChange) {
    const { data } = state;
    const { items, settings, analysis, bulkGeneration } = data;
    
    // Refs
    const timerRef = useRef<number | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showBulkGeneration, setShowBulkGeneration] = useState(false);
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [idToAnalyze, setIdToAnalyze] = useState('');
    const [copiedItemIds, setCopiedItemIds] = useState<Set<string>>(new Set());
    const [copiedBulk, setCopiedBulk] = useState(false);
    
    // Generate a new UUID based on selected type
    const generateId = useCallback((): UuidItem => {
      let id: string;
      const now = new Date();
      
      switch (settings.selectedType) {
        case 'v1':
          id = uuidv1();
          break;
        case 'v7':
          id = uuidv7();
          break;
        case 'ulid':
          id = generateULID();
          break;
        case 'v4':
        default:
          id = uuidv4();
          break;
      }
      
      return {
        id,
        type: settings.selectedType,
        timestamp: now
      };
    }, [settings.selectedType]);
    
    // Generate and add a new UUID
    const handleGenerate = useCallback(() => {
      const newItem = generateId();
      onChange({
        ...state,
        data: {
          ...data,
          items: [newItem, ...items.slice(0, 99)] // Keep last 100 items
        }
      });
    }, [state, data, items, onChange, generateId]);
    
    // Generate bulk UUIDs
    const handleBulkGenerate = useCallback(() => {
      const result: string[] = [];
      const type = bulkGeneration.type;
      
      for (let i = 0; i < bulkGeneration.count; i++) {
        let id: string;
        
        switch (type) {
          case 'v1':
            id = uuidv1();
            break;
          case 'v7':
            id = uuidv7();
            break;
          case 'ulid':
            id = generateULID();
            break;
          case 'v4':
          default:
            id = uuidv4();
            break;
        }
        
        // Apply formatting
        if (settings.format === 'no-hyphens') {
          id = id.replace(/-/g, '');
        }
        
        if (settings.case === 'upper') {
          id = id.toUpperCase();
        } else {
          id = id.toLowerCase();
        }
        
        result.push(id);
      }
      
      onChange({
        ...state,
        data: {
          ...data,
          bulkGeneration: {
            ...bulkGeneration,
            result
          }
        }
      });
    }, [state, data, bulkGeneration, settings, onChange]);
    
    // Copy a UUID to clipboard
    const handleCopy = useCallback((id: string) => {
      navigator.clipboard.writeText(id);
      
      // Find the item and mark it as copied
      const newCopiedIds = new Set(copiedItemIds);
      newCopiedIds.add(id);
      setCopiedItemIds(newCopiedIds);
      
      // Clear the copied status after 1.5 seconds
      setTimeout(() => {
        setCopiedItemIds(prev => {
          const updated = new Set(prev);
          updated.delete(id);
          return updated;
        });
      }, 1500);
    }, [copiedItemIds]);
    
    // Copy bulk generated UUIDs
    const handleCopyBulk = useCallback(() => {
      const text = bulkGeneration.result.join('\n');
      navigator.clipboard.writeText(text);
      setCopiedBulk(true);
      setTimeout(() => setCopiedBulk(false), 1500);
    }, [bulkGeneration.result]);
    
    // Analyze a UUID
    const handleAnalyze = useCallback(() => {
      if (!idToAnalyze.trim()) return;
      
      const analysis = analyzeId(idToAnalyze.trim());
      onChange({
        ...state,
        data: {
          ...data,
          analysis
        }
      });
    }, [state, data, idToAnalyze, onChange]);
    
    // Clear analysis
    const handleClearAnalysis = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...data,
          analysis: null
        }
      });
      setIdToAnalyze('');
    }, [state, data, onChange]);
    
    // Export UUIDs
    const handleExport = useCallback((format: 'json' | 'csv' | 'txt') => {
      let content = '';
      let mimeType = '';
      let filename = '';
      
      const exportData = bulkGeneration.result.length > 0 
        ? bulkGeneration.result 
        : items.map(item => {
            let id = item.id;
            if (settings.format === 'no-hyphens') {
              id = id.replace(/-/g, '');
            }
            return settings.case === 'upper' ? id.toUpperCase() : id.toLowerCase();
          });
      
      switch (format) {
        case 'json':
          content = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
          filename = 'uuids.json';
          break;
        case 'csv':
          content = 'uuid\n' + exportData.join('\n');
          mimeType = 'text/csv';
          filename = 'uuids.csv';
          break;
        case 'txt':
        default:
          content = exportData.join('\n');
          mimeType = 'text/plain';
          filename = 'uuids.txt';
          break;
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportOptions(false);
    }, [bulkGeneration.result, items, settings]);
    
    // Clear all generated UUIDs
    const handleClearAll = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...data,
          items: []
        }
      });
    }, [state, data, onChange]);
    
    // Update settings
    const updateSettings = useCallback((updates: Partial<UuidTabletState['data']['settings']>) => {
      onChange({
        ...state,
        data: {
          ...data,
          settings: {
            ...settings,
            ...updates
          }
        }
      });
    }, [state, data, settings, onChange]);
    
    // Update bulk generation settings
    const updateBulkGeneration = useCallback((updates: Partial<UuidTabletState['data']['bulkGeneration']>) => {
      onChange({
        ...state,
        data: {
          ...data,
          bulkGeneration: {
            ...bulkGeneration,
            ...updates
          }
        }
      });
    }, [state, data, bulkGeneration, onChange]);
    
    // Auto-generation timer effect
    useEffect(() => {
      if (settings.autoGenerate) {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
        }
        
        timerRef.current = window.setInterval(() => {
          handleGenerate();
        }, settings.interval * 1000);
      } else if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      return () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [settings.autoGenerate, settings.interval, handleGenerate]);
    
    // Paste from clipboard
    const handlePaste = useCallback(async () => {
      try {
        const text = await navigator.clipboard.readText();
        setIdToAnalyze(text.trim());
      } catch (err) {
        console.error('Failed to read clipboard:', err);
      }
    }, []);
    
    return (
      <div className="h-full bg-gray-900 text-gray-200 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">UUID Generator</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-md transition-colors ${
                  showSettings ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700/50'
                }`}
                title="Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-4 animate-fadeIn">
              <div className="flex flex-col space-y-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-sm text-gray-400">UUID Type</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => updateSettings({ selectedType: 'v1' })}
                      className={`px-3 py-1.5 rounded-md text-sm ${
                        settings.selectedType === 'v1'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      UUID v1
                    </button>
                    <button
                      onClick={() => updateSettings({ selectedType: 'v4' })}
                      className={`px-3 py-1.5 rounded-md text-sm ${
                        settings.selectedType === 'v4'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      UUID v4
                    </button>
                    <button
                      onClick={() => updateSettings({ selectedType: 'v7' })}
                      className={`px-3 py-1.5 rounded-md text-sm ${
                        settings.selectedType === 'v7'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                          : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      UUID v7
                    </button>
                    <button
                      onClick={() => updateSettings({ selectedType: 'ulid' })}
                      className={`px-3 py-1.5 rounded-md text-sm ${
                        settings.selectedType === 'ulid'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                          : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      ULID
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm text-gray-400">Format</label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateSettings({ format: 'hyphenated' })}
                        className={`px-3 py-1.5 rounded-md text-sm flex-1 ${
                          settings.format === 'hyphenated'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        Hyphenated
                      </button>
                      <button
                        onClick={() => updateSettings({ format: 'no-hyphens' })}
                        className={`px-3 py-1.5 rounded-md text-sm flex-1 ${
                          settings.format === 'no-hyphens'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        No Hyphens
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm text-gray-400">Case</label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateSettings({ case: 'lower' })}
                        className={`px-3 py-1.5 rounded-md text-sm flex-1 ${
                          settings.case === 'lower'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        Lowercase
                      </button>
                      <button
                        onClick={() => updateSettings({ case: 'upper' })}
                        className={`px-3 py-1.5 rounded-md text-sm flex-1 ${
                          settings.case === 'upper'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        Uppercase
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm text-gray-400">Auto-Generate</label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateSettings({ autoGenerate: !settings.autoGenerate })}
                        className={`px-3 py-1.5 rounded-md text-sm flex-1 ${
                          settings.autoGenerate
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        {settings.autoGenerate ? 'On' : 'Off'}
                      </button>
                      
                      <select
                        value={settings.interval}
                        onChange={(e) => updateSettings({ interval: Number(e.target.value) })}
                        className="bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={!settings.autoGenerate}
                      >
                        <option value="1">Every 1s</option>
                        <option value="2">Every 2s</option>
                        <option value="5">Every 5s</option>
                        <option value="10">Every 10s</option>
                        <option value="30">Every 30s</option>
                        <option value="60">Every 1m</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm text-gray-400">View Mode</label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateSettings({ viewMode: 'list' })}
                        className={`px-3 py-1.5 rounded-md text-sm flex-1 flex justify-center items-center space-x-1 ${
                          settings.viewMode === 'list'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <List size={14} />
                        <span>List</span>
                      </button>
                      <button
                        onClick={() => updateSettings({ viewMode: 'grid' })}
                        className={`px-3 py-1.5 rounded-md text-sm flex-1 flex justify-center items-center space-x-1 ${
                          settings.viewMode === 'grid'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'
                        }`}
                      >
                        <Grid2X2 size={14} />
                        <span>Grid</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Main Controls */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGenerate}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>Generate {settings.selectedType === 'ulid' ? 'ULID' : `UUID ${settings.selectedType}`}</span>
            </button>
            
            <button
              onClick={() => setShowBulkGeneration(!showBulkGeneration)}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                showBulkGeneration
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-gray-700/50 hover:bg-gray-700 text-gray-200'
              }`}
            >
              <Database size={16} />
              <span>Bulk Generate</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowExportOptions(!showExportOptions)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-md transition-colors flex items-center space-x-2"
              >
                <Download size={16} />
                <span>Export</span>
                <ChevronDown size={14} className={`transition-transform ${showExportOptions ? 'rotate-180' : ''}`} />
              </button>
              
              {showExportOptions && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowExportOptions(false)}
                  />
                  <div className="absolute right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[150px]">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('json')}
                        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors"
                      >
                        <FileText size={14} className="mr-2 text-blue-400" />
                        <span>JSON</span>
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors"
                      >
                        <FileText size={14} className="mr-2 text-green-400" />
                        <span>CSV</span>
                      </button>
                      <button
                        onClick={() => handleExport('txt')}
                        className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-700 transition-colors"
                      >
                        <FileText size={14} className="mr-2 text-gray-400" />
                        <span>Text</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {items.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md transition-colors flex items-center space-x-2"
              >
                <Trash2 size={16} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Bulk Generation Panel */}
        {showBulkGeneration && (
          <div className="border-b border-gray-700/50 p-4 bg-gray-800/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-200">Bulk Generation</h3>
              <button
                onClick={() => setShowBulkGeneration(false)}
                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-400">Count</label>
                <select
                  value={bulkGeneration.count}
                  onChange={(e) => updateBulkGeneration({ count: Number(e.target.value) })}
                  className="bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                  <option value="1000">1000</option>
                </select>
              </div>
              
              <div className="flex flex-col space-y-1">
                <label className="text-sm text-gray-400">Type</label>
                <select
                  value={bulkGeneration.type}
                  onChange={(e) => updateBulkGeneration({ type: e.target.value as any })}
                  className="bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="v1">UUID v1 (timestamp)</option>
                  <option value="v4">UUID v4 (random)</option>
                  <option value="v7">UUID v7 (time-ordered)</option>
                  <option value="ulid">ULID</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={handleBulkGenerate}
                  className="px-4 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-md transition-colors flex items-center space-x-2 w-full"
                >
                  <RefreshCw size={16} />
                  <span>Generate {bulkGeneration.count} IDs</span>
                </button>
              </div>
            </div>
            
            {bulkGeneration.result.length > 0 && (
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">
                    Generated {bulkGeneration.result.length} {bulkGeneration.type === 'ulid' ? 'ULIDs' : `UUIDs (${bulkGeneration.type})`}
                  </span>
                  <button
                    onClick={handleCopyBulk}
                    className="px-3 py-1 bg-gray-700/50 hover:bg-gray-700 rounded-md transition-colors flex items-center space-x-1 text-sm"
                  >
                    {copiedBulk ? (
                      <>
                        <CheckCircle size={14} className="text-green-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy All</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar bg-gray-900/30 rounded-md p-2">
                  <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
                    {bulkGeneration.result.join('\n')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* UUID Analyzer */}
        <div className="border-b border-gray-700/50 p-4">
          <h3 className="text-base font-medium text-gray-200 mb-3">UUID Analyzer</h3>
          <div className="flex space-x-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={idToAnalyze}
                onChange={(e) => setIdToAnalyze(e.target.value)}
                placeholder="Paste UUID or ULID to analyze..."
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <button
                onClick={handlePaste}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                title="Paste from clipboard"
              >
                <ClipboardPaste size={16} />
              </button>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={!idToAnalyze.trim()}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search size={16} />
              <span>Analyze</span>
            </button>
          </div>
          
          {analysis && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 animate-fadeIn">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-medium text-gray-200 mb-2">Analysis Results</h4>
                <button
                  onClick={handleClearAnalysis}
                  className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                  title="Clear analysis"
                >
                  <X size={14} />
                </button>
              </div>
              
              {!analysis.isValid ? (
                <div className="text-red-400 text-sm">
                  Not a valid UUID or ULID format
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Format:</span>
                    <span className="text-gray-200 font-medium">{analysis.format}</span>
                  </div>
                  
                  {analysis.isULID ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Timestamp:</span>
                        <span className="text-gray-200 font-medium">
                          {analysis.ulidTimestamp?.toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Version:</span>
                        <span className="text-gray-200 font-medium">{analysis.version}</span>
                      </div>
                      
                      {analysis.timestamp && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Timestamp:</span>
                          <span className="text-gray-200 font-medium">
                            {analysis.timestamp.toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Variant:</span>
                        <span className="text-gray-200 font-medium">{analysis.variant}</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Generated UUIDs List */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-200">
              Generated IDs {settings.autoGenerate && (
                <span className="text-xs text-blue-400 ml-2 inline-flex items-center">
                  <Clock size={12} className="mr-1" />
                  Auto-generating every {settings.interval}s
                </span>
              )}
            </h3>
            <div className="text-sm text-gray-400">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </div>
          </div>
          
          {items.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <RefreshCw size={32} className="mx-auto mb-2 opacity-50" />
              <p>No IDs generated yet</p>
              <p className="text-sm mt-1">Click "Generate" to create your first ID</p>
            </div>
          ) : (
            <div className={`grid gap-3 ${settings.viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {items.map((item) => (
                <UuidItemComponent
                  key={item.id + item.timestamp.getTime()}
                  item={{
                    ...item,
                    copied: copiedItemIds.has(
                      settings.case === 'upper' 
                        ? (settings.format === 'hyphenated' ? item.id.toUpperCase() : item.id.replace(/-/g, '').toUpperCase())
                        : (settings.format === 'hyphenated' ? item.id.toLowerCase() : item.id.replace(/-/g, '').toLowerCase())
                    )
                  }}
                  format={settings.format}
                  casing={settings.case}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
};