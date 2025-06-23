import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tablet, TabletState } from '../types';
import { motion } from 'framer-motion';
import { Copy, Trash2, Check, History as HistoryIcon, KeyRound, RefreshCw, Sparkles } from 'lucide-react';
import { wordlist } from './wordlist';

// --- Types ---
type PasswordMode = 'password' | 'passphrase';
type Capitalization = 'none' | 'title' | 'random';

interface PasswordSettings {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSpecial: boolean;
  excludeAmbiguous: boolean;
}

interface PassphraseSettings {
  wordCount: number;
  separator: string;
  capitalize: Capitalization;
}

interface PasswordHistoryEntry {
  id: string;
  password: string;
  identifier: string;
  purpose: string;
  timestamp: number;
}

interface PasswordGeneratorData {
  mode: PasswordMode;
  passwordSettings: PasswordSettings;
  passphraseSettings: PassphraseSettings;
  currentPassword: string;
  history: PasswordHistoryEntry[];
}

interface PasswordTabletState extends TabletState {
  type: 'password';
  data: PasswordGeneratorData;
}

// Handle legacy state format
interface LegacyPasswordData {
  settings?: PasswordSettings;
  currentPassword?: string;
  history?: PasswordHistoryEntry[];
  length?: number;
  complexity?: string;
}

const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

// --- Generation & Strength Logic ---

function generateSecurePassword(settings: PasswordSettings): string {
  let charset = '';
  const requiredChars: string[] = [];
  const addCharset = (base: string, shouldExclude: boolean, excludeChars: string) => {
    const chars = shouldExclude ? base.replace(new RegExp(`[${excludeChars}]`, 'g'), '') : base;
    if (chars) {
      charset += chars;
      const randomBytes = new Uint8Array(1);
      crypto.getRandomValues(randomBytes);
      requiredChars.push(chars[randomBytes[0] % chars.length]);
    }
  };
  if (settings.useUppercase) addCharset(CHARSETS.upper, settings.excludeAmbiguous, 'IO');
  if (settings.useLowercase) addCharset(CHARSETS.lower, settings.excludeAmbiguous, 'il');
  if (settings.useNumbers) addCharset(CHARSETS.numbers, settings.excludeAmbiguous, '10');
  if (settings.useSpecial) addCharset(CHARSETS.special, false, '');
  if (charset === '') charset = CHARSETS.lower;
  const passwordArray: string[] = [...requiredChars];
  const remainingLength = settings.length - passwordArray.length;
  if (remainingLength > 0) {
    const randomBytes = new Uint8Array(remainingLength);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < remainingLength; i++) {
      passwordArray.push(charset[randomBytes[i] % charset.length]);
    }
  }
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }
  return passwordArray.slice(0, settings.length).join('');
}

function generateSecurePassphrase(settings: PassphraseSettings): string {
  const words: string[] = [];
  const randomValues = new Uint32Array(settings.wordCount);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < settings.wordCount; i++) {
    words.push(wordlist[randomValues[i] % wordlist.length]);
  }
  return words.map(word => {
    if (settings.capitalize === 'title') return word.charAt(0).toUpperCase() + word.slice(1);
    if (settings.capitalize === 'random' && Math.random() > 0.5) return word.toUpperCase();
    return word;
  }).join(settings.separator);
}

function estimateTimeToCrack(entropy: number): string {
    const guessesPerSecond = 1e12; // 1 trillion guesses per second (very generous for an attacker)
    const combinations = Math.pow(2, entropy);
    const seconds = combinations / guessesPerSecond;

    if (seconds < 60) return "instantly";
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`;
    return "centuries";
}

function calculateStrength(data: PasswordGeneratorData) {
  if (!data.currentPassword) return { entropy: 0, strength: 'Very Weak', color: 'text-red-500', timeToCrack: 'instantly' };

  let poolSize = 0;
  let length = 0;
  
  if (data.mode === 'password') {
    const passwordSettings = data.passwordSettings || {
      length: 16, useUppercase: true, useLowercase: true, useNumbers: true, useSpecial: true, excludeAmbiguous: false
    };
    length = passwordSettings.length;
    if (passwordSettings.useUppercase) poolSize += passwordSettings.excludeAmbiguous ? 24 : 26;
    if (passwordSettings.useLowercase) poolSize += passwordSettings.excludeAmbiguous ? 24 : 26;
    if (passwordSettings.useNumbers) poolSize += passwordSettings.excludeAmbiguous ? 8 : 10;
    if (passwordSettings.useSpecial) poolSize += CHARSETS.special.length;
    if (poolSize === 0) poolSize = 1;
  } else { // Passphrase mode
    const passphraseSettings = data.passphraseSettings || { wordCount: 4, separator: '-', capitalize: 'title' as Capitalization };
    poolSize = wordlist.length;
    length = passphraseSettings.wordCount;
    // Add a bit of entropy for capitalization and separator if used
    if (passphraseSettings.capitalize !== 'none') poolSize += 1;
    if (passphraseSettings.separator) poolSize += 1;
  }
  
  const entropy = Math.log2(Math.pow(poolSize, length));
  const timeToCrack = estimateTimeToCrack(entropy);

  if (entropy < 40) return { entropy: Math.round(entropy), strength: 'Very Weak', color: 'text-red-500', timeToCrack };
  if (entropy < 60) return { entropy: Math.round(entropy), strength: 'Weak', color: 'text-orange-500', timeToCrack };
  if (entropy < 80) return { entropy: Math.round(entropy), strength: 'Moderate', color: 'text-yellow-500', timeToCrack };
  if (entropy < 100) return { entropy: Math.round(entropy), strength: 'Strong', color: 'text-green-500', timeToCrack };
  // Use green-500 for Very Strong to ensure visibility
  return { entropy: Math.round(entropy), strength: 'Very Strong', color: 'text-green-500', timeToCrack };
}


// --- UI Component ---
const PasswordGeneratorUI: React.FC<{
  state: PasswordTabletState;
  onChange: (newState: PasswordTabletState) => void;
}> = ({ state, onChange }) => {
  const { data } = state;
  // Add fallbacks for undefined settings
  const passwordSettings = data.passwordSettings || {
    length: 16, useUppercase: true, useLowercase: true, useNumbers: true, useSpecial: true, excludeAmbiguous: false
  };
  const passphraseSettings = data.passphraseSettings || { wordCount: 4, separator: '-', capitalize: 'title' as Capitalization };
  const currentPassword = data.currentPassword || '';
  const history = data.history || [];
  const mode = data.mode || 'password';
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const passwordStrength = useMemo(() => calculateStrength(data), [data]);

  const regenerate = useCallback(() => {
    const newPassword = mode === 'password'
      ? generateSecurePassword(passwordSettings)
      : generateSecurePassphrase(passphraseSettings);
    onChange({ ...state, data: { ...data, currentPassword: newPassword }});
  }, [mode, passwordSettings, passphraseSettings, state, data, onChange]);
  
  // Only regenerate on initial mount
  useEffect(() => {
    if (!isInitialized.current) {
      regenerate();
      isInitialized.current = true;
    }
  }, []);

  // Regenerate when mode changes
  useEffect(() => {
    if (isInitialized.current) {
      regenerate();
    }
  }, [mode]);

  // Regenerate when settings change (but avoid infinite loop by using JSON.stringify)
  useEffect(() => {
    if (isInitialized.current) {
      regenerate();
    }
  }, [JSON.stringify(passwordSettings), JSON.stringify(passphraseSettings)]);
  
  const updateSettings = (updates: Partial<PasswordSettings>) => {
    onChange({ ...state, data: { ...data, passwordSettings: { ...passwordSettings, ...updates } } });
  };
  const updatePassphraseSettings = (updates: Partial<PassphraseSettings>) => {
    onChange({ ...state, data: { ...data, passphraseSettings: { ...passphraseSettings, ...updates } } });
  };
  
  const handleCopyToHistory = () => {
    const passwordToSave = currentPassword;
    const newEntry: PasswordHistoryEntry = {
      id: crypto.randomUUID(), password: passwordToSave, identifier: '', purpose: '', timestamp: Date.now(),
    };
    navigator.clipboard.writeText(passwordToSave);
    setCopiedId('current');
    setTimeout(() => setCopiedId(null), 1500);
    regenerate();
    onChange({ ...state, data: { ...data, history: [newEntry, ...history.slice(0, 49)] } });
  };

  const handleHistoryChange = (id: string, field: 'identifier' | 'purpose', value: string) => {
    onChange({ ...state, data: { ...data, history: history.map(entry => entry.id === id ? { ...entry, [field]: value } : entry) } });
  };
  const deleteHistoryEntry = (id: string) => {
    onChange({ ...state, data: { ...data, history: history.filter(entry => entry.id !== id) } });
  };
  const handleCopyField = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-900 h-full flex flex-col text-gray-200">
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 space-y-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
          <KeyRound size={20} /> Password & Passphrase Generator
        </h2>
        
        {/* Mode Toggle */}
        <div className="flex bg-gray-800/50 rounded-lg p-0.5 self-start">
          <button onClick={() => onChange({...state, data: {...data, mode: 'password'}})} className={`px-3 py-1.5 rounded-md text-sm transition-colors w-1/2 ${mode === 'password' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}>Password</button>
          <button onClick={() => onChange({...state, data: {...data, mode: 'passphrase'}})} className={`px-3 py-1.5 rounded-md text-sm transition-colors w-1/2 ${mode === 'passphrase' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:text-gray-300'}`}>Passphrase</button>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={currentPassword}
            readOnly
            className="flex-1 font-mono text-lg text-gray-100 bg-gray-900/50 px-3 py-2 rounded-md border border-gray-700/50 focus:border-blue-500/50 focus:outline-none transition-colors"
          />
          <button onClick={regenerate} className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors" title="Regenerate">
            <RefreshCw size={18} />
          </button>
          <button onClick={handleCopyToHistory} className={`p-2 rounded-md transition-all duration-150 relative ${copiedId === 'current' ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`} title="Copy and Save to History">
            {copiedId === 'current' ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
        
        {/* Strength Meter */}
        <div className="flex items-center space-x-3 pt-1">
          <div className="flex-1 bg-gray-700/50 rounded-full h-1.5">
            <motion.div className={`h-1.5 rounded-full ${passwordStrength.color.replace('text-', 'bg-')}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, passwordStrength.entropy / 128 * 100)}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} />
          </div>
          <div className={`text-sm font-medium ${passwordStrength.color}`}>{passwordStrength.strength} ({passwordStrength.entropy} bits)</div>
          <div className="text-xs text-gray-500">(Est. crack time: {passwordStrength.timeToCrack})</div>
        </div>

        {/* Settings */}
        <div className="space-y-3 pt-2">
          {mode === 'password' ? (
            <>
              <div className="flex items-center space-x-3">
                <label htmlFor="length" className="text-sm font-medium text-gray-300 w-28 flex-shrink-0">Length:</label>
                <input type="range" id="length" min="6" max="128" value={passwordSettings.length} onChange={(e) => updateSettings({ length: parseInt(e.target.value) })} className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-blue-500"/>
                <span className="text-sm font-mono bg-gray-700/60 px-2 py-0.5 rounded w-12 text-center flex-shrink-0">{passwordSettings.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                {[ 'useUppercase', 'useLowercase', 'useNumbers', 'useSpecial', 'excludeAmbiguous' ].map(key => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={!!passwordSettings[key as keyof PasswordSettings]} onChange={(e) => updateSettings({ [key]: e.target.checked })} className="h-4 w-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-700 accent-blue-500" />
                    <span className="text-gray-300">{ { 'useUppercase': 'Uppercase (A-Z)', 'useLowercase': 'Lowercase (a-z)', 'useNumbers': 'Numbers (0-9)', 'useSpecial': 'Special (!@#...)', 'excludeAmbiguous': 'Exclude Ambiguous (I,l,1,O,0)' }[key] }</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
               <div className="flex items-center space-x-3">
                <label htmlFor="wordCount" className="text-sm font-medium text-gray-300 w-28 flex-shrink-0">Word Count:</label>
                <input type="range" id="wordCount" min="3" max="10" value={passphraseSettings.wordCount} onChange={(e) => updatePassphraseSettings({ wordCount: parseInt(e.target.value) })} className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-blue-500"/>
                <span className="text-sm font-mono bg-gray-700/60 px-2 py-0.5 rounded w-12 text-center flex-shrink-0">{passphraseSettings.wordCount}</span>
              </div>
              <div className="flex items-center space-x-3">
                <label htmlFor="separator" className="text-sm font-medium text-gray-300 w-28 flex-shrink-0">Separator:</label>
                <input type="text" id="separator" value={passphraseSettings.separator} onChange={(e) => updatePassphraseSettings({ separator: e.target.value })} maxLength={1} className="bg-gray-700/60 rounded w-12 text-center p-1"/>
              </div>
              <div className="flex items-center space-x-3">
                 <label className="text-sm font-medium text-gray-300 w-28 flex-shrink-0">Capitalization:</label>
                 <select value={passphraseSettings.capitalize} onChange={(e) => updatePassphraseSettings({ capitalize: e.target.value as Capitalization })} className="bg-gray-700/60 rounded p-1 text-sm">
                   <option value="none">lowercase</option>
                   <option value="title">Title Case</option>
                   <option value="random">Random Case</option>
                 </select>
              </div>
            </>
          )}
        </div>
      </div>
      {/* History Panel */}
      <div className="flex-grow flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-3 flex-shrink-0 px-1">
          <h3 className="text-base font-medium text-gray-200 flex items-center gap-2"><HistoryIcon size={18}/> History</h3>
          {history.length > 0 && <button onClick={() => onChange({...state, data: {...data, history: []}})} className="flex items-center space-x-1.5 px-3 py-1 bg-red-500/15 text-red-400 rounded-md hover:bg-red-500/25 transition-colors disabled:opacity-50 text-xs" title="Clear History"><Trash2 size={14}/><span>Clear</span></button>}
        </div>
        <div className="overflow-y-auto custom-scrollbar border border-gray-700/50 rounded-lg bg-gray-800/30 flex-grow">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 italic py-10 flex flex-col items-center"><Sparkles size={32} className="opacity-50 mb-2"/>No passwords saved yet.</div>
          ) : (
            <table className="w-full text-sm text-left text-gray-300">
              <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-2">Password</th>
                  <th scope="col" className="px-4 py-2">Identifier</th>
                  <th scope="col" className="px-4 py-2">Purpose</th>
                  <th scope="col" className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2 font-mono"><span className="blur-[3px] select-none hover:blur-none transition duration-150" title="Hover to reveal">{entry.password}</span></td>
                    <td><input type="text" value={entry.identifier} onChange={(e) => handleHistoryChange(entry.id, 'identifier', e.target.value)} placeholder="e.g., Google" className="w-full bg-transparent focus:bg-gray-700/50 border-0 border-b border-gray-600/50 focus:border-blue-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-100 placeholder-gray-500 transition" /></td>
                    <td><input type="text" value={entry.purpose} onChange={(e) => handleHistoryChange(entry.id, 'purpose', e.target.value)} placeholder="e.g., Primary Login" className="w-full bg-transparent focus:bg-gray-700/50 border-0 border-b border-gray-600/50 focus:border-blue-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-100 placeholder-gray-500 transition" /></td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center items-center space-x-2">
                        <button onClick={() => handleCopyField(entry.password, `${entry.id}-password`)} className={`p-1 rounded transition-colors ${copiedId === `${entry.id}-password` ? 'text-green-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'}`} title="Copy Password">{copiedId === `${entry.id}-password` ? <Check size={14} /> : <Copy size={14} />}</button>
                        <button onClick={() => deleteHistoryEntry(entry.id)} className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors" title="Delete Entry"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};


// --- Tablet Definition ---
export const PasswordTablet: Tablet = {
  id: 'password',
  label: 'Password Generator',
  keywords: ['password', 'generator', 'secure', 'random', 'key', 'passphrase'],

  createInitialState(): PasswordTabletState {
    const initialPasswordSettings: PasswordSettings = {
      length: 16, useUppercase: true, useLowercase: true, useNumbers: true, useSpecial: true, excludeAmbiguous: false,
    };
    return {
      type: 'password',
      data: {
        mode: 'password',
        passwordSettings: initialPasswordSettings,
        passphraseSettings: { wordCount: 4, separator: '-', capitalize: 'title' },
        currentPassword: generateSecurePassword(initialPasswordSettings),
        history: [],
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): PasswordTabletState {
    const defaultState = this.createInitialState();
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'password' && parsed.data) {
        const loadedData = parsed.data;
        const finalData: PasswordGeneratorData = {
          mode: loadedData.mode || 'password',
          passwordSettings: { ...defaultState.data.passwordSettings, ...loadedData.passwordSettings },
          passphraseSettings: { ...defaultState.data.passphraseSettings, ...loadedData.passphraseSettings },
          currentPassword: loadedData.currentPassword || '',
          history: Array.isArray(loadedData.history) ? loadedData.history : [],
        };
        
        // --- MIGRATION LOGIC for old states ---
        if (loadedData.complexity) {
          finalData.passwordSettings.useSpecial = loadedData.complexity === 'complex';
          finalData.passwordSettings.length = loadedData.length || defaultState.data.passwordSettings.length;
        }

        return { type: 'password', data: finalData };
      }
    } catch (e) {
      console.error("Failed to deserialize password state, returning default:", e);
    }
    return defaultState;
  },

  render(state: TabletState, onChange: (state: TabletState) => void) {
    const passwordState: PasswordTabletState =
      state && state.type === 'password'
        ? (state as PasswordTabletState)
        : this.createInitialState();
    return <PasswordGeneratorUI state={passwordState} onChange={onChange as (newState: PasswordTabletState) => void} />;
  },
};