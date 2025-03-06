import React from 'react';
import { Copy } from 'lucide-react';
import { Tablet, TabletState } from '../types';

interface PasswordConfig {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSpecial: boolean;
}

interface PasswordEntry {
  label: string;
  config: PasswordConfig;
  value: string;
}

interface PasswordTabletState extends TabletState {
  type: 'password';
  data: {
    passwords: PasswordEntry[];
  };
}

const DEFAULT_CONFIGS: PasswordConfig[] = [
  {
    length: 12,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSpecial: false,
  },
  {
    length: 16,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSpecial: true,
  },
  {
    length: 32,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSpecial: true,
  },
];

function generatePassword(config: PasswordConfig): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let chars = '';
  if (config.useUppercase) chars += upper;
  if (config.useLowercase) chars += lower;
  if (config.useNumbers) chars += numbers;
  if (config.useSpecial) chars += special;
  
  let password = '';
  for (let i = 0; i < config.length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return password;
}

export const PasswordTablet: Tablet = {
  id: 'password',
  label: 'Password Generator',
  keywords: ['password', 'generator', 'secure', 'random'],
  
  createInitialState(): PasswordTabletState {
    return {
      type: 'password',
      data: {
        passwords: DEFAULT_CONFIGS.map((config, i) => ({
          label: `Password ${i + 1}`,
          config,
          value: generatePassword(config),
        })),
      },
    };
  },
  
  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },
  
  deserializeState(json: string): TabletState {
    return JSON.parse(json);
  },
  
  render(state: PasswordTabletState, onChange) {
    const regeneratePassword = (index: number) => {
      const newPasswords = [...state.data.passwords];
      newPasswords[index] = {
        ...newPasswords[index],
        value: generatePassword(newPasswords[index].config),
      };
      onChange({
        ...state,
        data: { passwords: newPasswords },
      });
    };
    
    const copyPassword = async (password: string) => {
      await navigator.clipboard.writeText(password);
    };
    
    return (
      <div className="p-6 space-y-6 bg-gray-900">
        <h2 className="text-xl font-semibold text-gray-100">Password Generator</h2>
        <div className="grid gap-4">
          {state.data.passwords.map((entry, i) => (
            <div key={i} className="bg-gray-800/50 backdrop-blur border border-gray-700/50 rounded-lg overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">{entry.label}</span>
                <button
                  onClick={() => regeneratePassword(i)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Regenerate
                </button>
              </div>
              <div className="p-4 flex items-center space-x-3">
                <code className="flex-1 font-mono text-gray-100 bg-gray-900/50 px-3 py-2 rounded-md">
                  {entry.value}
                </code>
                <button
                  onClick={() => copyPassword(entry.value)}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-md transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
};