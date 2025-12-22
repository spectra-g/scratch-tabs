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
    <div className="bg-surface-secondary rounded-lg overflow-hidden border border-base">
      <div className="bg-surface-highlight/50 px-4 py-3 border-b border-base">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-main flex items-center">
            <History size={18} className="mr-2" />
            Pinned Dates
          </h3>

          {isValidDateValue(parsedDate) && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1 bg-primary hover:opacity-90 text-white rounded-md text-sm transition-colors flex items-center"
            >
              <Plus size={14} className="mr-1" />
              Pin Current
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 bg-surface-highlight/20 border-b border-base">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (optional)"
              className="input-themed flex-1 px-3 py-2 text-sm"
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
              className="px-3 py-2 bg-success hover:opacity-90 text-white rounded-md text-sm transition-colors"
            >
              <Pin size={14} />
            </button>
          </div>
        </div>
      )}

      {/* History list */}
      {history.length > 0 ? (
        <div className="divide-y divide-base max-h-64 overflow-y-auto custom-scrollbar">
          {history.map((item) => (
            <div key={item.id} className="p-4 hover:bg-surface-highlight/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-main flex items-center">
                  <Pin size={14} className="mr-2 text-primary" />
                  {item.label}
                </h4>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => copyDateInput(item.originalInput)}
                    className="p-1 hover:bg-element-hover rounded transition-colors text-secondary hover:text-main"
                    title="Copy original input"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => removePinnedDate(item.id)}
                    className="p-1 hover:bg-element-hover rounded transition-colors text-secondary hover:text-danger"
                    title="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="text-secondary">
                  {format(ensureDate(item.date) || new Date(), 'EEEE, MMMM d, yyyy, h:mm:ss a')}
                </div>
                <div className="text-muted font-mono text-xs">
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
                className="mt-2 text-xs text-primary hover:opacity-80 transition-colors"
              >
                Load this date
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center">
          <Pin size={32} className="mx-auto text-muted mb-2" />
          <p className="text-secondary">No pinned dates yet</p>
          <p className="text-muted text-sm mt-1">
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