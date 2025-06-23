import React, { useState, useEffect } from 'react';
import { Copy, Trash2, Download, Check, History as HistoryIcon, KeyRound, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Tablet, TabletState } from '../types';

const MIN_LENGTH = 6;
const MAX_LENGTH = 64;
const DEFAULT_LENGTH = 12;
const CHARSETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

type ComplexityLevel = 'basic' | 'complex'; // Define the complexity levels

interface PasswordHistoryEntry {
  id: string;
  password: string;
  identifier: string;
  purpose: string;
  timestamp: number;
}

interface PasswordGeneratorData {
  length: number;
  complexity: ComplexityLevel; // Use the new complexity level state
  currentPassword: string;
  history: PasswordHistoryEntry[];
}

interface PasswordTabletState extends TabletState {
  type: 'password';
  data: PasswordGeneratorData;
}

function generatePassword(
  length: number,
  complexity: ComplexityLevel // Accept complexity level directly
): string {
  let useUppercase = true;
  let useLowercase = true;
  let useNumbers = true;
  let useSpecial = complexity === 'complex'; // Only use special chars if complex

  let chars = '';
  if (useUppercase) chars += CHARSETS.upper;
  if (useLowercase) chars += CHARSETS.lower;
  if (useNumbers) chars += CHARSETS.numbers;
  if (useSpecial) chars += CHARSETS.special;

  // This check is likely redundant now but safe to keep
  if (chars === '') {
    chars = CHARSETS.lower;
  }

  let password = '';
  const requiredChars: string[] = [];
  if (useUppercase) requiredChars.push(CHARSETS.upper[Math.floor(Math.random() * CHARSETS.upper.length)]);
  if (useLowercase) requiredChars.push(CHARSETS.lower[Math.floor(Math.random() * CHARSETS.lower.length)]);
  if (useNumbers) requiredChars.push(CHARSETS.numbers[Math.floor(Math.random() * CHARSETS.numbers.length)]);
  if (useSpecial) requiredChars.push(CHARSETS.special[Math.floor(Math.random() * CHARSETS.special.length)]);

  const remainingLength = Math.max(0, length - requiredChars.length); // Ensure non-negative
  for (let i = 0; i < remainingLength; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  password = requiredChars.join('') + password;
  password = password.split('').sort(() => 0.5 - Math.random()).join('');

  return password.slice(0, length);
}

async function copyToClipboard(text: string, callback?: () => void) {
     try {
        await navigator.clipboard.writeText(text);
        if (callback) callback();
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

// --- Component ---
export const PasswordTablet: Tablet = {
  id: 'password',
  label: 'Password Generator',
  keywords: ['password', 'generator', 'secure', 'random', 'key'],

  createInitialState(): PasswordTabletState {
    const initialSettings = {
      length: DEFAULT_LENGTH,
      complexity: 'basic' as ComplexityLevel, // Default to basic
    };
    return {
      type: 'password',
      data: {
        ...initialSettings,
        currentPassword: generatePassword(
          initialSettings.length,
          initialSettings.complexity
        ),
        history: [],
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
     try {
        const parsed = JSON.parse(json);
        if (parsed.type === 'password' && parsed.data && Array.isArray(parsed.data.history)) {
            const complexity: ComplexityLevel = parsed.data.complexity === 'complex' ? 'complex' : 'basic';
            const length = parsed.data.length ?? DEFAULT_LENGTH;

            return {
                ...parsed,
                data: {
                    ...parsed.data,
                    length: length,
                    complexity: complexity,
                    currentPassword: parsed.data.currentPassword ?? generatePassword(length, complexity),
                }
            };
        }
    } catch (e) {
        console.error("Failed to deserialize password state:", e);
    }
    return PasswordTablet.createInitialState();
  },

  render(state: PasswordTabletState, onChange) {
    const { data } = state;
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const updateData = (newData: Partial<PasswordGeneratorData>) => {
      onChange({ ...state, data: { ...data, ...newData } });
    };

    // --- Regenerate Password Effect ---
    useEffect(() => {
      const newPassword = generatePassword(
        data.length,
        data.complexity // Pass complexity directly
      );
      if (newPassword !== data.currentPassword) {
        updateData({ currentPassword: newPassword });
      }
      // Depend on length and complexity
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.length, data.complexity]);

    // --- Handlers ---
    const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateData({ length: parseInt(e.target.value, 10) });
    };

    // New handler for complexity radio buttons
    const handleComplexityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateData({ complexity: e.target.value as ComplexityLevel });
    };

    const handleCopyToHistory = () => {
      const passwordToSave = data.currentPassword; // Capture current password
      const newEntry: PasswordHistoryEntry = {
        id: crypto.randomUUID(),
        password: passwordToSave,
        identifier: '',
        purpose: '',
        timestamp: Date.now(),
      };

      // Copy first
      copyToClipboard(passwordToSave, () => {
          setCopiedId('current');
          setTimeout(() => setCopiedId(null), 1500);
      });

      // Then update state: add to history AND generate a new password
      updateData({
          history: [newEntry, ...data.history],
          currentPassword: generatePassword(data.length, data.complexity) // Regenerate
      });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateData({ currentPassword: e.target.value });
    };

    const handleHistoryChange = (id: string, field: 'identifier' | 'purpose', value: string) => {
         const newHistory = data.history.map(entry =>
            entry.id === id ? { ...entry, [field]: value } : entry
        );
        updateData({ history: newHistory });
    };

    const deleteHistoryEntry = (id: string) => {
         updateData({ history: data.history.filter(entry => entry.id !== id) });
    };

    const handleExport = () => {
         if (!data.history || data.history.length === 0) return;
          const csvContent = data.history
            .map(entry => {
                const escapeCsv = (field: string) => {
                    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
                        return `"${field.replace(/"/g, '""')}"`;
                    }
                    return field;
                };
                return [
                    escapeCsv(entry.password),
                    escapeCsv(entry.identifier),
                    escapeCsv(entry.purpose)
                ].join(',');
            })
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
        link.setAttribute('href', url);
        link.setAttribute('download', `password_export_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleCopyField = (text: string, id: string) => {
         copyToClipboard(text, () => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 1500);
        });
    }

    // --- Render ---
    return (
      <div className="p-4 md:p-6 space-y-6 bg-gray-900 h-full flex flex-col text-gray-200">
        {/* Generator Panel */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 space-y-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <KeyRound size={20} /> Password Generator
          </h2>

          {/* Password Display */}
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={data.currentPassword}
              onChange={handlePasswordChange}
              className="flex-1 font-mono text-lg text-gray-100 bg-gray-900/50 px-3 py-2 rounded-md border border-gray-700/50 focus:border-blue-500/50 focus:outline-none transition-colors"
              placeholder="Your password..."
              title="Edit password manually or use generator settings"
            />
            <button
              onClick={handleCopyToHistory}
              className={`p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-all duration-150 relative ${copiedId === 'current' ? 'text-green-400' : ''}`}
              title="Copy and Add to History"
            >
              {copiedId === 'current' ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2">
            {/* Length Slider */}
            <div className="flex items-center space-x-3">
              <label htmlFor="length" className="text-sm font-medium text-gray-300 w-20 flex-shrink-0">Length:</label>
              <input
                type="range"
                id="length"
                name="length"
                min={MIN_LENGTH}
                max={MAX_LENGTH}
                value={data.length}
                onChange={handleLengthChange}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-blue-500"
              />
              <span className="text-sm font-mono bg-gray-700/60 px-2 py-0.5 rounded w-10 text-center flex-shrink-0">{data.length}</span>
            </div>

            {/* Complexity Radio Buttons */}
            <div className="flex items-center space-x-6">
               <span className="text-sm font-medium text-gray-300 w-20 flex-shrink-0">Complexity:</span>
               <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer text-sm">
                        <input
                            type="radio"
                            name="complexity"
                            value="basic"
                            checked={data.complexity === 'basic'}
                            onChange={handleComplexityChange}
                            className="h-4 w-4 border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-700 accent-blue-500"
                        />
                        <span className="text-gray-300 flex items-center gap-1"><ShieldCheck size={14} className="text-green-500"/> Basic</span>
                        <span className="text-xs text-gray-500">(A-Z, a-z, 0-9)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer text-sm">
                        <input
                            type="radio"
                            name="complexity"
                            value="complex"
                            checked={data.complexity === 'complex'}
                            onChange={handleComplexityChange}
                            className="h-4 w-4 border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-gray-700 accent-blue-500"
                        />
                        <span className="text-gray-300 flex items-center gap-1"><ShieldAlert size={14} className="text-yellow-500"/> Complex</span>
                         <span className="text-xs text-gray-500">(Incl. !@#...)</span>
                    </label>
               </div>
            </div>
          </div>
        </div>

        {/* History Panel */}
        <div className="flex-grow flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3 flex-shrink-0 px-1">
            <h3 className="text-base font-medium text-gray-200 flex items-center gap-2">
                <HistoryIcon size={18}/> History
            </h3>
            <button
              onClick={handleExport}
              disabled={!data.history || data.history.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar border border-gray-700/50 rounded-lg bg-gray-800/30 flex-grow">
            {(!data.history || data.history.length === 0) ? (
              <div className="text-center text-gray-500 italic py-10">No passwords saved yet. Click Copy above to save.</div>
            ) : (
              <table className="w-full text-sm text-left text-gray-300">
                 <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-4 py-2">Password</th>
                    <th scope="col" className="px-4 py-2">Identifier</th>
                    <th scope="col" className="px-4 py-2">Purpose</th>
                    <th scope="col" className="px-4 py-2">Generated</th>
                    <th scope="col" className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {data.history.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      {/* Password Cell */}
                      <td className="px-4 py-2 font-mono">
                        <span className="blur-[3px] select-none hover:blur-none transition duration-150" title="Hover to reveal">
                            {entry.password}
                        </span>
                      </td>
                      {/* Identifier Cell */}
                      <td className="px-4 py-2">
                        <div className="flex items-center space-x-1">
                           <input
                             type="text"
                             value={entry.identifier}
                             onChange={(e) => handleHistoryChange(entry.id, 'identifier', e.target.value)}
                             placeholder="e.g., Google Account"
                             className="w-full bg-transparent focus:bg-gray-700/50 border-0 border-b border-gray-600/50 focus:border-blue-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-100 placeholder-gray-500 transition"
                           />
                           {entry.identifier && (
                               <button
                                   onClick={() => handleCopyField(entry.identifier, `${entry.id}-identifier`)}
                                   className={`p-1 rounded transition-colors ${copiedId === `${entry.id}-identifier` ? 'text-green-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'}`}
                                   title="Copy Identifier"
                                >
                                   {copiedId === `${entry.id}-identifier` ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                           )}
                        </div>
                      </td>
                      {/* Purpose Cell */}
                      <td className="px-4 py-2">
                         <div className="flex items-center space-x-1">
                           <input
                             type="text"
                             value={entry.purpose}
                             onChange={(e) => handleHistoryChange(entry.id, 'purpose', e.target.value)}
                             placeholder="e.g., Primary Login"
                             className="w-full bg-transparent focus:bg-gray-700/50 border-0 border-b border-gray-600/50 focus:border-blue-500 focus:ring-0 px-1 py-0.5 text-xs text-gray-100 placeholder-gray-500 transition"
                           />
                           {entry.purpose && (
                               <button
                                   onClick={() => handleCopyField(entry.purpose, `${entry.id}-purpose`)}
                                   className={`p-1 rounded transition-colors ${copiedId === `${entry.id}-purpose` ? 'text-green-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'}`}
                                   title="Copy Purpose"
                                >
                                   {copiedId === `${entry.id}-purpose` ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                           )}
                        </div>
                      </td>
                      {/* Timestamp Cell */}
                      <td className="px-4 py-2 whitespace-nowrap text-gray-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      {/* Actions Cell */}
                      <td className="px-4 py-2 text-center">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            onClick={() => handleCopyField(entry.password, `${entry.id}-password`)}
                            className={`p-1 rounded transition-colors ${copiedId === `${entry.id}-password` ? 'text-green-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-600/50'}`}
                            title="Copy Password"
                          >
                            {copiedId === `${entry.id}-password` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={() => deleteHistoryEntry(entry.id)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                            title="Delete Entry"
                          >
                            <Trash2 size={14} />
                          </button>
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
  },
};