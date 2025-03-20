import { useState, useEffect } from 'react';
import { Tablet, TabletState } from '../types';
import { Clipboard, Copy, ClipboardPaste, XCircle, RefreshCw } from 'lucide-react';

interface ClipboardItem {
  id: string;
  content: string;
  timestamp: number;
  expiresAt: number;
}

interface ClipboardTabletState extends TabletState {
  type: 'clipboard';
  data: {
    items: ClipboardItem[];
    editContent: string;
  };
}

const EXPIRY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

export const ClipboardTablet: Tablet = {
  id: 'clipboard',
  label: 'Clipboard Manager',
  keywords: ['clipboard', 'copy', 'paste', 'history'],

  createInitialState(): ClipboardTabletState {
    return {
      type: 'clipboard',
      data: {
        items: [],
        editContent: ''
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    return JSON.parse(json);
  },

  render(state: ClipboardTabletState, onChange) {
    const [hasDuplicates, setHasDuplicates] = useState(false);

    // Check for duplicates whenever items change
    useEffect(() => {
      const contentSet = new Set();
      let duplicateFound = false;
      
      for (const item of state.data.items) {
        if (contentSet.has(item.content)) {
          duplicateFound = true;
          break;
        }
        contentSet.add(item.content);
      }
      
      setHasDuplicates(duplicateFound);
    }, [state.data.items]);

    // Clean up expired items
    useEffect(() => {
      const interval = setInterval(() => {
        const now = Date.now();
        const updatedItems = state.data.items.filter(item => item.expiresAt > now);
        
        if (updatedItems.length !== state.data.items.length) {
          onChange({
            ...state,
            data: {
              ...state.data,
              items: updatedItems
            }
          });
        }
      }, 1000); // Check every second

      return () => clearInterval(interval);
    }, [onChange, state.data.items]);

    const handlePaste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) return;

        const newItem: ClipboardItem = {
          id: crypto.randomUUID(),
          content: text,
          timestamp: Date.now(),
          expiresAt: Date.now() + EXPIRY_TIME
        };

        onChange({
          ...state,
          data: {
            ...state.data,
            items: [newItem, ...state.data.items]
          }
        });
      } catch (error) {
        console.error('Failed to read clipboard:', error);
      }
    };

    const handleCopyEdit = () => {
      if (!state.data.editContent.trim()) return;

      // Copy to clipboard
      navigator.clipboard.writeText(state.data.editContent);

      // Add to items
      const newItem: ClipboardItem = {
        id: crypto.randomUUID(),
        content: state.data.editContent,
        timestamp: Date.now(),
        expiresAt: Date.now() + EXPIRY_TIME
      };

      onChange({
        ...state,
        data: {
          ...state.data,
          items: [newItem, ...state.data.items],
          editContent: '' // Clear the edit field
        }
      });
    };

    const handleCopyItem = (content: string) => {
      navigator.clipboard.writeText(content);
    };

    const handleDeleteItem = (id: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          items: state.data.items.filter(item => item.id !== id)
        }
      });
    };

    const handleDeleteDuplicates = () => {
      // Keep only the latest instance of each unique content
      const seen = new Map<string, ClipboardItem>();
      state.data.items.forEach(item => {
        const existing = seen.get(item.content);
        if (!existing || existing.timestamp < item.timestamp) {
          seen.set(item.content, item);
        }
      });

      onChange({
        ...state,
        data: {
          ...state.data,
          items: Array.from(seen.values()).sort((a, b) => b.timestamp - a.timestamp)
        }
      });
    };

    const getTimeLeft = (expiresAt: number): string => {
      const minutes = Math.ceil((expiresAt - Date.now()) / (60 * 1000));
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    };

    return (
      <div className="h-full bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="flex-none p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Clipboard className="text-gray-400" size={24} />
              <h2 className="text-xl font-semibold text-gray-100">Clipboard Manager</h2>
            </div>
            <div className="flex items-center space-x-3">
              {hasDuplicates && (
                <button
                  onClick={handleDeleteDuplicates}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-md hover:bg-yellow-500/30 transition-colors"
                >
                  <RefreshCw size={16} />
                  <span>Remove Duplicates</span>
                </button>
              )}
              <button
                onClick={handlePaste}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors"
              >
                <ClipboardPaste size={16} />
                <span>Paste New Item</span>
              </button>
            </div>
          </div>

          {/* Edit Area */}
          <div className="flex space-x-3">
            <input
              type="text"
              value={state.data.editContent}
              onChange={(e) => onChange({
                ...state,
                data: { ...state.data, editContent: e.target.value }
              })}
              placeholder="Type or paste content here..."
              className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-md px-4 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <button
              onClick={handleCopyEdit}
              disabled={!state.data.editContent.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Copy size={16} />
              <span>Copy & Save</span>
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 hover:scrollbar-thumb-gray-500">
          {state.data.items.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <ClipboardPaste size={48} className="mx-auto mb-4 opacity-50" />
              <p>No items in clipboard history</p>
              <p className="text-sm mt-2">Click "Paste New Item" to add content</p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.data.items.map(item => (
                <div
                  key={item.id}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-gray-400">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-blue-400">
                        Expires in {getTimeLeft(item.expiresAt)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopyItem(item.content)}
                        className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors"
                        title="Delete item"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 max-h-24 overflow-auto whitespace-pre-wrap text-sm text-gray-200 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 hover:scrollbar-thumb-gray-500">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
};