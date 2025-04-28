import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tablet, TabletState } from '../types';
import { Clipboard, Copy, ClipboardPaste, XCircle, RefreshCw, ExternalLink, Pin, PinOff, Pencil } from 'lucide-react';
import { detectLanguage } from '../../languages';
import { useRootStore } from '../../stores';

// --- Constants ---
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const TOOLTIP_UPDATE_INTERVAL_MS = 5000; // Update tooltips every 5 seconds
const EXPIRY_CHECK_INTERVAL_MS = 10000; // Check for expired items every 10 seconds
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

// --- Interfaces ---
interface ClipboardItem {
  id: string;
  content: string;
  timestamp: number;
  expiresAt: number;
  isPinned: boolean;
  title: string;
}

interface ClipboardTabletState extends TabletState {
  type: 'clipboard';
  data: {
    items: ClipboardItem[];
    editContent: string;
  };
}

// --- Helper Components ---

/**
 * Displays a countdown timer (HH:MM:SS) or "Pinned"/"Expired" status.
 * Optimized to only use interval when necessary and not pinned/expired.
 */
const CountdownDisplay: React.FC<{ expiresAt: number; isPinned: boolean }> = React.memo(({ expiresAt, isPinned }) => {
  const [displayTime, setDisplayTime] = useState('');
  const intervalIdRef = useRef<NodeJS.Timeout | undefined>();

  useEffect(() => {
    // Clear previous interval on prop change or unmount
    const clearTimer = () => {
        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = undefined;
        }
    }
    clearTimer(); // Clear any existing timer first

    if (isPinned) {
      setDisplayTime('Pinned');
      return; // Stop here if pinned
    }

    let isExpired = false;

    const calculateDisplayTime = () => {
        if (isExpired) {
            // Ensure cleanup if somehow interval still runs after expiration logic
            clearTimer();
            return;
        }

        const now = Date.now();
        const remaining = expiresAt - now;

        if (remaining <= 0) {
            setDisplayTime('Expired');
            isExpired = true;
            clearTimer(); // Stop the timer when expired
        } else {
            const seconds = Math.floor((remaining / 1000) % 60);
            const minutes = Math.floor((remaining / (1000 * 60)) % 60);
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            setDisplayTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
    };

    calculateDisplayTime(); // Initial calculation

    // Only set interval if not already expired
    if (!isExpired) {
        intervalIdRef.current = setInterval(calculateDisplayTime, 1000);
    }

    // Cleanup function for the effect
    return clearTimer;

  }, [expiresAt, isPinned]); // Rerun only if expiry or pinned status changes

  return <span className="text-xs text-blue-400">{displayTime}</span>;
});


/**
 * Component for subtle inline title editing.
 */
const EditableTitle: React.FC<{
  id: string;
  initialTitle: string;
  onSave: (id: string, newTitle: string) => void;
}> = React.memo(({ id, initialTitle, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure internal title syncs if initialTitle prop changes externally
  useEffect(() => {
      setTitle(initialTitle);
  }, [initialTitle]);

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    // Only save if the title actually changed after trimming
    if (trimmedTitle !== initialTitle.trim()) {
      onSave(id, trimmedTitle);
    }
    setIsEditing(false);
  }, [id, title, initialTitle, onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setTitle(initialTitle); // Revert changes
      setIsEditing(false);
    }
  }, [handleSave, initialTitle]);

  const handleBlur = useCallback(() => {
    // Use a small timeout to allow click events on potential save/cancel buttons if they existed
    setTimeout(handleSave, 150); // Slightly longer timeout might be safer
  }, [handleSave]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="bg-gray-700/60 text-sm text-gray-100 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition w-full min-h-[24px]"
        placeholder="Enter title..."
        onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up
      />
    );
  }

  return (
    <div
      className="flex items-center group cursor-pointer min-h-[24px]"
      onClick={(e) => {
          e.stopPropagation(); // Prevent click bubbling if needed elsewhere
          setIsEditing(true);
      }}
      title="Click to edit title"
    >
      <span className={`text-sm text-gray-200 truncate ${!initialTitle ? 'italic text-gray-500' : ''}`}>
        {initialTitle || 'Untitled Item'}
      </span>
      {/* Show pencil on hover */}
      <Pencil size={12} className="ml-2 text-gray-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
    </div>
  );
});


// --- Main Tablet Component ---
export const ClipboardTablet: Tablet = {
  id: 'clipboard',
  label: 'Clipboard Manager',
  keywords: ['clipboard', 'copy', 'paste', 'history'],

  createInitialState(): ClipboardTabletState {
    return { type: 'clipboard', data: { items: [], editContent: '' } };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
        const parsedState = JSON.parse(json) as ClipboardTabletState;
        // Validate basic structure
        if (!parsedState || typeof parsedState !== 'object' || parsedState.type !== 'clipboard' || !parsedState.data || !Array.isArray(parsedState.data.items)) {
            throw new Error("Invalid clipboard state structure");
        }

        parsedState.data.items = parsedState.data.items.map((item: any) => ({ // Use 'any' temporarily for robust parsing
            id: typeof item?.id === 'string' ? item.id : crypto.randomUUID(), // Ensure ID exists
            content: typeof item?.content === 'string' ? item.content : '',
            timestamp: typeof item?.timestamp === 'number' ? item.timestamp : Date.now(),
            expiresAt: typeof item?.expiresAt === 'number' && !isNaN(item.expiresAt) ? item.expiresAt : Date.now() + TWENTY_FOUR_HOURS_MS,
            isPinned: typeof item?.isPinned === 'boolean' ? item.isPinned : false,
            title: typeof item?.title === 'string' ? item.title : '',
        }));
        parsedState.data.editContent = typeof parsedState.data.editContent === 'string' ? parsedState.data.editContent : '';
        return parsedState;
    } catch (error) {
        console.error("Failed to deserialize clipboard state, returning default:", error);
        // Return a default valid state if parsing fails
        return ClipboardTablet.createInitialState();
    }
  },

  render(state: ClipboardTabletState, onChange) {
    const [hasDuplicates, setHasDuplicates] = useState(false);
    const [countdownTooltips, setCountdownTooltips] = useState<Record<string, string>>({});

    const { addTab, splitView } = useRootStore();
    const { activeLeftTabId, activeRightTabId, activeSide, isSplit } = useRootStore(s => s.splitView);
    const activeTabId = activeSide === 'left' ? activeLeftTabId : (isSplit ? activeRightTabId : activeLeftTabId);

    const latestStateRef = useRef(state);
    useEffect(() => { latestStateRef.current = state; }, [state]);

    // --- Effect to check for Duplicates ---
    useEffect(() => {
      const contentSet = new Set();
      setHasDuplicates(state.data.items.some(item => {
        const trimmedContent = item.content.trim();
        if (trimmedContent && contentSet.has(trimmedContent)) return true; // Don't consider empty strings duplicates
        if (trimmedContent) contentSet.add(trimmedContent);
        return false;
      }));
    }, [state.data.items]);

    // --- Effect to clean up EXPIRED items ---
    useEffect(() => {
      const interval = setInterval(() => {
        const currentState = latestStateRef.current;
        const now = Date.now();
        const expiredItemIds = currentState.data.items
            .filter(item => !item.isPinned && item.expiresAt <= now)
            .map(item => item.id);

        if (expiredItemIds.length > 0) {
            const updatedItems = currentState.data.items.filter(item => !expiredItemIds.includes(item.id));
            onChange({ ...currentState, data: { ...currentState.data, items: updatedItems } });
        }
      }, EXPIRY_CHECK_INTERVAL_MS);

      return () => clearInterval(interval);
    }, [onChange]); // Stable dependency

    // --- Effect to update TOOLTIPS periodically ---
    useEffect(() => {
      let isMounted = true;

      const updateTooltips = () => {
          if (!isMounted) return;

          const now = Date.now();
          const newTooltips: Record<string, string> = {};
          latestStateRef.current.data.items.forEach(item => {
              if (item.isPinned) {
                  newTooltips[item.id] = 'Pinned (won\'t expire)'; // More descriptive pinned tooltip
              } else {
                  const remaining = item.expiresAt - now;
                  if (remaining <= 0) {
                      newTooltips[item.id] = 'Expired';
                  } else {
                      // Generate static tooltip text - NO live timer here
                      // newTooltips[item.id] = 'Expires soon'; // Keep it simple
                      // // --- OR --- provide slightly more detail (optional):
                      const hoursLeft = Math.ceil(remaining / ONE_HOUR_MS);
                      if (hoursLeft <= 1) {
                          newTooltips[item.id] = 'Expires in less than an hour';
                      } else if (hoursLeft <= 6) {
                          newTooltips[item.id] = `Expires in approx ${hoursLeft} hours`;
                      } else {
                          newTooltips[item.id] = 'Expires later today';
                      }
                  }
              }
          });

          // Update state only if needed
          setCountdownTooltips(prevTooltips => {
              const keysChanged = Object.keys(newTooltips).length !== Object.keys(prevTooltips).length ||
                                  Object.keys(newTooltips).some(key => newTooltips[key] !== prevTooltips[key]);
              return keysChanged ? newTooltips : prevTooltips;
          });
      }

      updateTooltips();
      const interval = setInterval(updateTooltips, TOOLTIP_UPDATE_INTERVAL_MS);

      return () => { isMounted = false; clearInterval(interval); }
    }, []); // Run once

    // --- Handlers ---
    const updateItems = useCallback((newItems: ClipboardItem[]) => {
      onChange({ ...state, data: { ...state.data, items: newItems } });
    }, [onChange, state]); // Include dependencies for useCallback

    const handlePaste = useCallback(async () => {
      try {
        const text = await navigator.clipboard.readText();
        const trimmedText = text.trim();
        if (!trimmedText) return;
        const newItem: ClipboardItem = {
          id: crypto.randomUUID(), content: trimmedText, timestamp: Date.now(),
          expiresAt: Date.now() + TWENTY_FOUR_HOURS_MS, isPinned: false, title: ''
        };
        updateItems([newItem, ...state.data.items]);
      } catch (error) { console.error('Failed to read clipboard:', error); }
    }, [state.data.items, updateItems]); // Dependencies for useCallback

    const handleCopyEdit = useCallback(() => {
      const content = state.data.editContent.trim();
      if (!content) return;
      navigator.clipboard.writeText(content);
      const newItem: ClipboardItem = {
        id: crypto.randomUUID(), content: content, timestamp: Date.now(),
        expiresAt: Date.now() + TWENTY_FOUR_HOURS_MS, isPinned: false, title: ''
      };
      onChange({ ...state, data: { ...state.data, items: [newItem, ...state.data.items], editContent: '' } });
    }, [state, onChange]); // Dependencies for useCallback

    const handleCopyItem = useCallback((content: string) => {
      navigator.clipboard.writeText(content);
    }, []);

    const handleDeleteItem = useCallback((id: string) => {
      updateItems(state.data.items.filter(item => item.id !== id));
    }, [state.data.items, updateItems]);

    const handleTogglePin = useCallback((id: string) => {
      const now = Date.now();
      updateItems(state.data.items.map(item =>
        item.id === id
          ? { ...item, isPinned: !item.isPinned, expiresAt: item.isPinned ? now + TWENTY_FOUR_HOURS_MS : item.expiresAt }
          : item
      ));
    }, [state.data.items, updateItems]);

    const handleSaveTitle = useCallback((id: string, newTitle: string) => {
         updateItems(state.data.items.map(item =>
             item.id === id ? { ...item, title: newTitle } : item
         ));
     }, [state.data.items, updateItems]);

    const handleDeleteDuplicates = useCallback(() => {
      const seen = new Map<string, ClipboardItem>();
      for (let i = state.data.items.length - 1; i >= 0; i--) {
        const item = state.data.items[i];
        const trimmedContent = item.content.trim();
        // Consider empty strings as non-duplicates or handle as needed
        if (trimmedContent && !seen.has(trimmedContent)) {
          seen.set(trimmedContent, item);
        } else if (!trimmedContent && !seen.has('')) { // Handle potential single empty string entry
          seen.set('', item);
        }
      }
      updateItems(Array.from(seen.values()).sort((a, b) => b.timestamp - a.timestamp));
    }, [state.data.items, updateItems]);

    const handleOpenInNewTab = useCallback((content: string, timestamp: number) => {
        const newTabId = crypto.randomUUID();
        const language = detectLanguage(content);
        const isRightSide = activeSide === 'right' && splitView.isSplit;
        // Use the determined activeTabId for positioning if desired by addTab
        addTab({
            id: newTabId,
            title: `Clipboard ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            content, language, languageLocked: language !== 'plaintext',
            dateCreated: Date.now(), lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 }, isTablet: false
        }, isRightSide); // Pass the active tab ID to potentially insert after
    }, [addTab, activeSide, splitView.isSplit, activeTabId]);


    // --- Render ---
    return (
      <div className="h-full bg-gray-900 flex flex-col text-sm"> {/* Base font size */}
        {/* Header */}
        <div className="flex-none p-4 md:p-6 border-b border-gray-700/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
                {/* Header Title */}
                <div className="flex items-center space-x-3 flex-shrink-0">
                <Clipboard className="text-gray-400" size={20} />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-100">Clipboard</h2>
                </div>
                {/* Header Actions */}
                <div className="flex items-center space-x-2 sm:space-x-3 self-stretch sm:self-auto">
                {hasDuplicates && (
                    <button
                    onClick={handleDeleteDuplicates}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-red-500/15 text-red-400 rounded-md hover:bg-red-500/25 transition-colors text-xs sm:text-sm whitespace-nowrap"
                    title="Remove duplicate entries"
                    >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Remove Duplicates</span>
                    </button>
                )}
                <button
                    onClick={handlePaste}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors text-xs sm:text-sm whitespace-nowrap"
                >
                    <ClipboardPaste size={14} />
                    <span>Paste</span>
                </button>
                </div>
            </div>

            {/* Edit Area */}
            <div className="flex space-x-2 sm:space-x-3">
                <input
                type="text"
                value={state.data.editContent}
                onChange={(e) => onChange({ ...state, data: { ...state.data, editContent: e.target.value } })}
                placeholder="Type or paste content here..."
                className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
                />
                <button
                onClick={handleCopyEdit}
                disabled={!state.data.editContent.trim()}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-md hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm whitespace-nowrap"
                >
                <Copy size={14} />
                <span>Save</span>
                </button>
            </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {state.data.items.length === 0 ? (
             <div className="text-center text-gray-400 mt-8">
               <ClipboardPaste size={40} className="mx-auto mb-3 opacity-50" />
               <p className="text-base">Clipboard history is empty</p>
               <p className="text-sm mt-1">Click "Paste" to add content</p>
             </div>
          ) : (
            <div className="space-y-3">
              {state.data.items.map(item => (
                    <div key={item.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden transition-shadow hover:shadow-md hover:border-gray-600/50">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700/50 min-h-[52px]"> {/* Min height for consistency */}
                        {/* Left Side */}
                        <div className="flex-1 flex flex-col min-w-0 pr-2 justify-center">
                          <EditableTitle
                              id={item.id}
                              initialTitle={item.title}
                              onSave={handleSaveTitle}
                          />
                          {/* Timestamp and Countdown */}
                          <div
                               className="flex items-center space-x-2 mt-0.5"
                               title={countdownTooltips[item.id] || (item.isPinned ? 'Pinned' : 'Calculating...')}
                           >
                            <span className="text-xs text-gray-400">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <CountdownDisplay
                               expiresAt={item.expiresAt}
                               isPinned={item.isPinned}
                             />
                          </div>
                        </div>
                        {/* Right Side: Actions */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                           <button
                                onClick={() => handleTogglePin(item.id)}
                                className={`p-1 rounded transition-colors ${item.isPinned ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'}`}
                                title={item.isPinned ? "Unpin item (will expire)" : "Pin item (keep forever)"}
                            >
                                {item.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                            </button>
                           <button
                                onClick={() => handleOpenInNewTab(item.content, item.timestamp)}
                                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
                                title="Open in new tab"
                           >
                                <ExternalLink size={16} />
                           </button>
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
                      {/* Content Preview */}
                      <div className="p-3 max-h-24 overflow-auto whitespace-pre-wrap text-sm text-gray-200 custom-scrollbar">
                        {item.content}
                      </div>
                    </div>
                  )
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
};