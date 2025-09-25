import React, { useState } from 'react';
import { History, Pin, X, Copy, Plus } from '../../../components/Icons';
import { PinnedDate } from '../types';
import { format } from 'date-fns';
import { isValidDateValue, ensureDate } from '../utils/dateUtils';

interface HistoryPanelProps {
  history: PinnedDate[];
  onHistoryChange: (history: PinnedDate[]) => void;
  onSelectDate: (date: Date, input: string) => void;
  currentInput: string;
  parsedDate: Date | null;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onHistoryChange,
  onSelectDate,
  currentInput,
  parsedDate
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const pinCurrentDate = () => {
    if (!isValidDateValue(parsedDate)) return;
    
    const validDate = ensureDate(parsedDate);
    if (!validDate) return;

    // Generate a default input if none provided (since TabbedInput manages its own state)
    const defaultInput = validDate.toISOString();
    const inputToUse = currentInput.trim() || defaultInput;

    const label = newLabel.trim() || `Date ${history.length + 1}`;
    const newPinnedDate: PinnedDate = {
      id: crypto.randomUUID(),
      label,
      date: validDate,
      originalInput: inputToUse,
      pinnedAt: Date.now()
    };

    onHistoryChange([newPinnedDate, ...history]);
    setNewLabel('');
    setShowAddForm(false);
  };

  const removePinnedDate = (id: string) => {
    onHistoryChange(history.filter(item => item.id !== id));
  };

  const copyDateInput = async (input: string) => {
    try {
      await navigator.clipboard.writeText(input);
    } catch {
      // Silently handle copy failures
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-200 flex items-center">
            <History size={18} className="mr-2" />
            Pinned Dates
          </h3>
          
          {isValidDateValue(parsedDate) && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors flex items-center"
            >
              <Plus size={14} className="mr-1" />
              Pin Current
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 bg-gray-750 border-b border-gray-700">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  pinCurrentDate();
                } else if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setNewLabel('');
                }
              }}
              autoFocus
            />
            <button
              onClick={pinCurrentDate}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
            >
              <Pin size={14} />
            </button>
          </div>
        </div>
      )}

      {/* History list */}
      {history.length > 0 ? (
        <div className="divide-y divide-gray-700 max-h-64 overflow-y-auto custom-scrollbar">
          {history.map((item) => (
            <div key={item.id} className="p-4 hover:bg-gray-700/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-200 flex items-center">
                  <Pin size={14} className="mr-2 text-blue-400" />
                  {item.label}
                </h4>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => copyDateInput(item.originalInput)}
                    className="p-1 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-gray-200"
                    title="Copy original input"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => removePinnedDate(item.id)}
                    className="p-1 hover:bg-gray-600 rounded transition-colors text-gray-400 hover:text-red-400"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="text-gray-300">
                  {format(ensureDate(item.date) || new Date(), 'EEEE, MMMM d, yyyy, h:mm:ss a')}
                </div>
                <div className="text-gray-500 font-mono text-xs">
                  Input: {item.originalInput}
                </div>
              </div>

              <button
                onClick={() => {
                  const validDate = ensureDate(item.date);
                  if (validDate) {
                    onSelectDate(validDate, item.originalInput);
                  }
                }}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Load this date
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center">
          <Pin size={32} className="mx-auto text-gray-600 mb-2" />
          <p className="text-gray-400">No pinned dates yet</p>
          <p className="text-gray-500 text-sm mt-1">
            {isValidDateValue(parsedDate) 
              ? "Click 'Pin Current' above to save this date" 
              : "Enter a date above, then pin it for quick reference"
            }
          </p>
        </div>
      )}
    </div>
  );
};