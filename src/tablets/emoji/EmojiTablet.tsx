import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Copy,
  ChevronDown,
  X,
  Star,
  Clock,
  Grid3X3,
  Palette,
  Code,
  Download,
  Heart,
  Trash2,
  Eye,
  Info,
} from "lucide-react";
import { Tablet, TabletState } from "../types";
import { emojiData, categories, skinTones, CompactEmoji } from "./emojiData";

// Types
interface FavoriteItem {
  id: string;
  sequence: string;
  label: string; // Display name for the sequence
  timestamp: number;
}

interface RecentItem {
  sequence: string;
  timestamp: number;
}

interface EmojiTabletState extends TabletState {
  type: "emoji";
  data: {
    searchQuery: string;
    sequence: string;
    selectedFormat: "char" | "shortcode" | "html" | "css" | "js" | "datauri";
    favorites: FavoriteItem[];
    recents: RecentItem[];
    selectedCategory: string;
    sequenceMode: boolean; // true = append mode, false = replace mode
  };
}

interface EmojiFormatResult {
  format: string;
  result: string;
}

// Storage keys
const STORAGE_KEYS = {
  favorites: "emoji-tablet-favorites",
  recents: "emoji-tablet-recents",
};

// Format conversion utilities
const formatEmoji = (
  sequence: string,
  format: EmojiTabletState["data"]["selectedFormat"],
): string => {
  if (!sequence) return "";

  switch (format) {
    case "char":
      return sequence;
    case "shortcode":
      return sequence
        .split("")
        .map((char) => {
          const emoji = emojiData.find((e) => e.c === char);
          return emoji ? `:${emoji.s}:` : char;
        })
        .join("");
    case "html":
      return sequence
        .split("")
        .map((char) => {
          const codePoint = char.codePointAt(0);
          return codePoint ? `&#${codePoint};` : char;
        })
        .join("");
    case "css":
      return sequence
        .split("")
        .map((char) => {
          const codePoint = char.codePointAt(0);
          return codePoint ? `\\${codePoint.toString(16).toUpperCase()}` : char;
        })
        .join("");
    case "js":
      return sequence
        .split("")
        .map((char) => {
          const codePoint = char.codePointAt(0);
          return codePoint ? `\\u{${codePoint.toString(16).toUpperCase()}}` : char;
        })
        .join("");
    case "datauri":
      return generateDataURI(sequence);
    default:
      return sequence;
  }
};

const generateDataURI = (sequence: string): string => {
  if (!sequence) return "";

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    canvas.width = 64;
    canvas.height = 64;

    ctx.font = "48px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sequence, 32, 32);

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to generate data URI:", error);
    return "";
  }
};

const getUnicodeInfo = (char: string) => {
  const codePoint = char.codePointAt(0);
  if (!codePoint) return null;

  const hex = codePoint.toString(16).toUpperCase().padStart(4, "0");
  const utf8Bytes = new TextEncoder()
    .encode(char)
    .reduce((acc, byte) => acc + byte.toString(16).toUpperCase().padStart(2, "0") + " ", "")
    .trim();

  return {
    codepoint: `U+${hex}`,
    utf8: utf8Bytes,
    jsEscape: `\\u{${hex}}`,
  };
};

// Utility functions
const generateId = (): string => {
  // Fallback for browsers that don't support crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Simple fallback ID generator
  return 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const generateSequenceLabel = (sequence: string): string => {
  if (!sequence) return "Empty";
  
  // If single emoji, find its name
  if (sequence.length <= 2) { // Account for multi-byte emojis
    const emoji = emojiData.find(e => e.c === sequence);
    return emoji ? emoji.n : sequence;
  }
  
  // For sequences, create a descriptive label
  const firstEmoji = emojiData.find(e => e.c === sequence[0]);
  const emojiCount = [...sequence].length;
  
  if (emojiCount === 2) {
    const secondEmoji = emojiData.find(e => e.c === sequence[sequence.length - 1]);
    return `${firstEmoji?.n || sequence[0]} + ${secondEmoji?.n || sequence[sequence.length - 1]}`;
  }
  
  return `${firstEmoji?.n || sequence[0]} + ${emojiCount - 1} more`;
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};

// Component: Search Bar
const SearchBar: React.FC<{
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}> = ({ searchQuery, onSearchChange, selectedCategory, onCategoryChange }) => {
  return (
    <div className="flex flex-col space-y-3 mb-4">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search emojis by name, shortcode, or keywords..."
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md pl-10 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              selectedCategory === category
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/50"
                : "bg-gray-800/50 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 border border-transparent"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};


// Component: Sequence Builder
const SequenceBuilder: React.FC<{
  sequence: string;
  sequenceMode: boolean;
  selectedFormat: EmojiTabletState["data"]["selectedFormat"];
  favorites: FavoriteItem[];
  recents: RecentItem[];
  onCopy: () => void;
  onClear: () => void;
  onToggleSequenceMode: () => void;
  onFormatSelect: (format: EmojiTabletState["data"]["selectedFormat"]) => void;
  onAddToFavorites: () => void;
  onQuickSelect: (sequence: string) => void;
  showFormatPopover: boolean;
  onToggleFormatPopover: () => void;
}> = ({
  sequence,
  sequenceMode,
  selectedFormat,
  favorites,
  recents,
  onCopy,
  onClear,
  onToggleSequenceMode,
  onFormatSelect,
  onAddToFavorites,
  onQuickSelect,
  showFormatPopover,
  onToggleFormatPopover,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const formatOptions = [
    { key: "char" as const, label: "Literal", desc: "Raw emoji characters" },
    { key: "shortcode" as const, label: "Shortcode", desc: ":emoji_name:" },
    { key: "html" as const, label: "HTML Entity", desc: "&#128640;" },
    { key: "css" as const, label: "CSS Content", desc: "\\1F680" },
    { key: "js" as const, label: "JS Escape", desc: "\\u{1F680}" },
    { key: "datauri" as const, label: "Data URI (PNG)", desc: "data:image/png;base64..." },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onToggleFormatPopover();
      }
    };

    if (showFormatPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFormatPopover, onToggleFormatPopover]);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Sequence Builder</h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={sequenceMode}
              onChange={onToggleSequenceMode}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
            />
            <span>Sequence Mode</span>
          </label>
          <span className="text-xs text-gray-400">
            Format: {formatOptions.find((f) => f.key === selectedFormat)?.label}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-3">
        <div className="flex-1 bg-gray-900/50 border border-gray-600/50 rounded-md p-3 min-h-[2.5rem] font-mono text-sm text-gray-200 break-all">
          {sequence || (
            <span className="text-gray-500 italic">
              {sequenceMode ? "Click emojis to build a sequence..." : "Click an emoji to select it..."}
            </span>
          )}
        </div>
        <button
          onClick={onClear}
          disabled={!sequence}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700/50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear sequence"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative">
          <div className="flex">
            <button
              onClick={onCopy}
              disabled={!sequence}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-l-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Copy size={16} />
              <span>Copy</span>
            </button>
            <button
              onClick={onToggleFormatPopover}
              className="px-2 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-r-md border-l border-blue-500/30 transition-colors"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <AnimatePresence>
            {showFormatPopover && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[280px]"
            >
              <div className="p-2">
                {formatOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      onFormatSelect(option.key);
                      onToggleFormatPopover();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      selectedFormat === option.key
                        ? "bg-blue-500/20 text-blue-400"
                        : "text-gray-300 hover:bg-gray-700/50"
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-400">{option.desc}</div>
                  </button>
                ))}
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add to Favourites Button */}
        <button
          onClick={onAddToFavorites}
          disabled={!sequence}
          className="px-4 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          title="Add current sequence to favorites"
        >
          <Star size={16} />
          <span>Add to Favorites</span>
        </button>

        {/* Character count and Quick Access items */}
        <div className="flex items-center space-x-4 text-xs text-gray-400">
          {sequence && (
            <span>
              {sequence.length} character{sequence.length !== 1 ? "s" : ""}
            </span>
          )}
          
          {/* Recent Favorites inline */}
          {((favorites || []).slice(-5).reverse()).length > 0 && (
            <div className="flex items-center space-x-1">
              <Star size={10} className="text-yellow-400" />
              <span>Recent Favourites:</span>
              <div className="flex space-x-1">
                {(favorites || []).slice(-5).reverse().map((item) => (
                  <button
                    key={item.id}
                    onClick={async () => {
                      const formatted = formatEmoji(item.sequence, selectedFormat);
                      const success = await copyToClipboard(formatted);
                      if (success) {
                        onQuickSelect(item.sequence);
                      }
                    }}
                    className="hover:bg-yellow-500/20 rounded px-1 transition-colors"
                    title={`${item.label} - Click to copy and update sequence`}
                  >
                    <span>{item.sequence}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Items inline */}
          {((recents || []).slice(0, 5)).length > 0 && (
            <div className="flex items-center space-x-1">
              <Clock size={10} className="text-blue-400" />
              <span>Recent:</span>
              <div className="flex space-x-1">
                {(recents || []).slice(0, 5).map((item, index) => (
                  <button
                    key={`${item.sequence}-${item.timestamp}-${index}`}
                    onClick={async () => {
                      const formatted = formatEmoji(item.sequence, selectedFormat);
                      const success = await copyToClipboard(formatted);
                      if (success) {
                        onQuickSelect(item.sequence);
                      }
                    }}
                    className="hover:bg-blue-500/20 rounded px-1 transition-colors"
                    title={`${generateSequenceLabel(item.sequence)} - Click to copy and update sequence`}
                  >
                    <span>{item.sequence}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Component: Skin Tone Selector
const SkinToneSelector: React.FC<{
  baseEmoji: CompactEmoji;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}> = ({ baseEmoji, onSelect, onClose, position }) => {
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={selectorRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-30 p-2"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: Math.min(position.y, window.innerHeight - 100),
      }}
    >
      <div className="flex space-x-1">
        {skinTones.map((tone, index) => (
          <button
            key={index}
            onClick={() => {
              onSelect(baseEmoji.c + tone.modifier);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700/50 rounded transition-colors"
            title={tone.name}
          >
            <span className="text-lg">{baseEmoji.c + tone.modifier}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// Component: Inspector Panel
const InspectorPanel: React.FC<{
  hoveredEmoji: CompactEmoji | null;
  isSelected: boolean;
  onClearSelection: () => void;
  onShowCopyToast: () => void;
}> = ({ hoveredEmoji, isSelected, onClearSelection, onShowCopyToast }) => {
  if (!hoveredEmoji) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 min-h-[200px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-300">Inspector</h3>
        </div>
        <div className="flex items-center justify-center h-32 text-gray-500">
          <div className="text-center">
            <Eye size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click or hover over an emoji to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  const unicodeInfo = getUnicodeInfo(hoveredEmoji.c);

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 min-h-[200px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">
          Inspector {isSelected && <span className="text-xs text-blue-400">(Selected)</span>}
        </h3>
        {isSelected && (
          <button
            onClick={onClearSelection}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded transition-colors"
            title="Clear selection"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-3xl">{hoveredEmoji.c}</span>
        <div>
          <h3 className="text-sm font-medium text-gray-200">{hoveredEmoji.n}</h3>
          <p className="text-xs text-gray-400">:{hoveredEmoji.s}:</p>
        </div>
      </div>

      {unicodeInfo && (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Unicode:</span>
            <button
              onClick={async () => {
                const success = await copyToClipboard(unicodeInfo.codepoint);
                if (success) onShowCopyToast();
              }}
              className="font-mono text-gray-200 min-w-[80px] text-right hover:text-blue-400 hover:bg-gray-700/50 px-1 py-0.5 rounded transition-colors"
              title="Click to copy Unicode value"
            >
              {unicodeInfo.codepoint}
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">UTF-8:</span>
            <button
              onClick={async () => {
                const success = await copyToClipboard(unicodeInfo.utf8);
                if (success) onShowCopyToast();
              }}
              className="font-mono text-gray-200 min-w-[80px] text-right hover:text-blue-400 hover:bg-gray-700/50 px-1 py-0.5 rounded transition-colors"
              title="Click to copy UTF-8 value"
            >
              {unicodeInfo.utf8}
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">JS Escape:</span>
            <button
              onClick={async () => {
                const success = await copyToClipboard(unicodeInfo.jsEscape);
                if (success) onShowCopyToast();
              }}
              className="font-mono text-gray-200 min-w-[80px] text-right hover:text-blue-400 hover:bg-gray-700/50 px-1 py-0.5 rounded transition-colors"
              title="Click to copy JS Escape value"
            >
              {unicodeInfo.jsEscape}
            </button>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Category:</span>
            <span className="text-gray-200 min-w-[80px] text-right">{hoveredEmoji.cat}</span>
          </div>
          {hoveredEmoji.t && (
            <div className="flex justify-between">
              <span className="text-gray-400">Skin Tones:</span>
              <span className="text-green-400 min-w-[80px] text-right">Supported</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-700/50">
        <p className="text-xs text-gray-400 mb-1">Keywords:</p>
        <div className="flex flex-wrap gap-1">
          {hoveredEmoji.k.map((keyword, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded text-xs"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Component: Emoji Grid
const EmojiGrid: React.FC<{
  emojis: CompactEmoji[];
  onEmojiClick: (emoji: string) => void;
  onEmojiHover: (emoji: CompactEmoji | null) => void;
  onSkinToneRequest: (emoji: CompactEmoji, position: { x: number; y: number }) => void;
}> = ({ emojis, onEmojiClick, onEmojiHover, onSkinToneRequest }) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!gridRef.current?.contains(document.activeElement)) return;

      const cols = Math.floor(gridRef.current.offsetWidth / 48); // Approximate button width
      const rows = Math.ceil(emojis.length / cols);

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, emojis.length - 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + cols, emojis.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - cols, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && emojis[focusedIndex]) {
            onEmojiClick(emojis[focusedIndex].c);
          }
          break;
      }
    },
    [emojis, focusedIndex, onEmojiClick],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (emojis.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-8 text-center">
        <Search size={32} className="mx-auto mb-2 text-gray-600" />
        <p className="text-gray-400">No emojis found</p>
        <p className="text-sm text-gray-500 mt-1">Try adjusting your search or category filter</p>
      </div>
    );
  }

  return (
    <div
      ref={gridRef}
      className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 max-h-64 overflow-y-auto custom-scrollbar"
      tabIndex={0}
    >
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1">
        {emojis.map((emoji, index) => (
          <button
            key={`${emoji.c}-${index}`}
            onClick={(e) => {
              if (emoji.t && e.shiftKey) {
                const rect = e.currentTarget.getBoundingClientRect();
                onSkinToneRequest(emoji, {
                  x: rect.left,
                  y: rect.bottom + 5,
                });
              } else {
                onEmojiClick(emoji.c);
              }
            }}
            onMouseEnter={() => onEmojiHover(emoji)}
            onMouseLeave={() => onEmojiHover(null)}
            onFocus={() => setFocusedIndex(index)}
            className={`w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-700/50 rounded transition-colors ${
              focusedIndex === index ? "ring-2 ring-blue-500" : ""
            } ${emoji.t ? "relative" : ""}`}
            title={`${emoji.n} (${emoji.s})${emoji.t ? " - Shift+click for skin tones" : ""}`}
          >
            {emoji.c}
            {emoji.t && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full opacity-60" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Component: Favorites Panel
const FavoritesPanel: React.FC<{
  favorites: FavoriteItem[];
  onEmojiClick: (sequence: string) => void;
  onRemoveFavorite: (id: string) => void;
}> = ({ favorites = [], onEmojiClick, onRemoveFavorite }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 min-h-[120px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Star size={16} className="text-yellow-400" />
          <h3 className="text-sm font-medium text-gray-300">Favorites</h3>
          <span className="text-xs text-gray-500">({favorites?.length || 0})</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[2.5rem] max-h-[80px] overflow-y-auto custom-scrollbar">
        {!favorites || favorites.length === 0 ? (
          <div className="flex items-center justify-center w-full text-gray-500 text-sm min-h-[2.5rem]">
            No favorites yet
          </div>
        ) : (
          favorites.map((item) => (
            <div key={item.id} className="relative group">
              <button
                onClick={() => onEmojiClick(item.sequence)}
                className="flex flex-col items-center p-2 hover:bg-gray-700/50 rounded transition-colors min-w-[60px]"
                title={`${item.label} - Click to add to sequence`}
              >
                <span className="text-lg mb-1">{item.sequence}</span>
                <span className="text-xs text-gray-400 text-center leading-tight">
                  {item.label && item.label.length > 10 ? item.label.substring(0, 10) + "..." : item.label}
                </span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFavorite(item.id);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="Remove from favorites"
              >
                <X size={10} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Component: Recents Panel
const RecentsPanel: React.FC<{
  recents: RecentItem[];
  onEmojiClick: (sequence: string) => void;
  onClearRecents: () => void;
}> = ({ recents = [], onEmojiClick, onClearRecents }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 min-h-[120px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Clock size={16} className="text-blue-400" />
          <h3 className="text-sm font-medium text-gray-300">Recent</h3>
          <span className="text-xs text-gray-500">({recents?.length || 0})</span>
        </div>
        {recents && recents.length > 0 && (
          <button
            onClick={onClearRecents}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            title="Clear all recent items"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 min-h-[2.5rem] max-h-[80px] overflow-y-auto custom-scrollbar">
        {!recents || recents.length === 0 ? (
          <div className="flex items-center justify-center w-full text-gray-500 text-sm min-h-[2.5rem]">
            No recent emojis
          </div>
        ) : (
          recents.map((item, index) => (
            <div key={`${item.sequence}-${item.timestamp}-${index}`} className="group">
              <button
                onClick={() => onEmojiClick(item.sequence)}
                className="flex flex-col items-center p-2 hover:bg-gray-700/50 rounded transition-colors min-w-[50px]"
                title={`${generateSequenceLabel(item.sequence)} - Click to add to sequence`}
              >
                <span className="text-lg">{item.sequence}</span>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Main UI Component
const EmojiUI: React.FC<{
  state: EmojiTabletState;
  onChange: (state: EmojiTabletState) => void;
}> = ({ state, onChange }) => {
  const { data } = state;
  const [hoveredEmoji, setHoveredEmoji] = useState<CompactEmoji | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<CompactEmoji | null>(null);
  const [showFormatPopover, setShowFormatPopover] = useState(false);
  const [skinToneSelector, setSkinToneSelector] = useState<{
    emoji: CompactEmoji;
    position: { x: number; y: number };
  } | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  // Load favorites and recents from localStorage on mount with migration
  useEffect(() => {
    const savedFavorites = localStorage.getItem(STORAGE_KEYS.favorites);
    const savedRecents = localStorage.getItem(STORAGE_KEYS.recents);

    if (savedFavorites || savedRecents) {
      let migratedFavorites: FavoriteItem[] = [];
      let migratedRecents: RecentItem[] = [];

      try {
        // Migrate old string array favorites to new format
        if (savedFavorites) {
          const parsed = JSON.parse(savedFavorites);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (typeof parsed[0] === 'string') {
              // Old format - migrate
              migratedFavorites = parsed.map((emoji: string) => ({
                id: generateId(),
                sequence: emoji,
                label: generateSequenceLabel(emoji),
                timestamp: Date.now(),
              }));
            } else {
              // New format
              migratedFavorites = parsed;
            }
          }
        }

        // Migrate old string array recents to new format
        if (savedRecents) {
          const parsed = JSON.parse(savedRecents);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (typeof parsed[0] === 'string') {
              // Old format - migrate
              migratedRecents = parsed.map((emoji: string) => ({
                sequence: emoji,
                timestamp: Date.now(),
              }));
            } else {
              // New format
              migratedRecents = parsed;
            }
          }
        }
      } catch (error) {
        console.error('Error migrating localStorage data:', error);
      }

      onChange({
        ...state,
        data: {
          ...data,
          favorites: migratedFavorites,
          recents: migratedRecents,
        },
      });
    }
  }, []); // Only run on mount

  // Save to localStorage when favorites or recents change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(data.favorites));
  }, [data.favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.recents, JSON.stringify(data.recents));
  }, [data.recents]);

  // Filter emojis based on search and category
  const filteredEmojis = useMemo(() => {
    let filtered = emojiData;

    if (data.selectedCategory !== "All") {
      filtered = filtered.filter((emoji) => emoji.cat === data.selectedCategory);
    }

    if (data.searchQuery) {
      const query = data.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (emoji) =>
          emoji.n.toLowerCase().includes(query) ||
          emoji.s.toLowerCase().includes(query) ||
          emoji.k.some((keyword) => keyword.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [data.searchQuery, data.selectedCategory]);

  const updateData = useCallback(
    (updates: Partial<EmojiTabletState["data"]>) => {
      onChange({
        ...state,
        data: { ...data, ...updates },
      });
    },
    [state, data, onChange],
  );

  const addToSequence = useCallback(
    (emoji: string) => {
      // In sequence mode, append. In replace mode, replace.
      const newSequence = data.sequenceMode ? data.sequence + emoji : emoji;
      
      // Add to recents (avoid duplicates, limit to 20)
      const newRecentItem: RecentItem = {
        sequence: emoji,
        timestamp: Date.now(),
      };
      const recents = data.recents || [];
      const newRecents = [
        newRecentItem,
        ...recents.filter((r) => r.sequence !== emoji)
      ].slice(0, 20);
      
      // Find and set the selected emoji for the inspector panel
      const matchedEmoji = emojiData.find((e) => e.c === emoji);
      if (matchedEmoji) {
        setSelectedEmoji(matchedEmoji);
      }
      
      // Update both sequence and recents in a single call
      updateData({ 
        sequence: newSequence,
        recents: newRecents 
      });
    },
    [data.sequence, data.sequenceMode, data.recents, updateData]
  );

  const addToFavorites = useCallback(() => {
    if (!data.sequence) return;

    const favorites = data.favorites || [];
    const existingFavorite = favorites.find(f => f.sequence === data.sequence);
    if (existingFavorite) return; // Already in favorites

    const newFavorite: FavoriteItem = {
      id: generateId(),
      sequence: data.sequence,
      label: generateSequenceLabel(data.sequence),
      timestamp: Date.now(),
    };

    const newFavorites = [...favorites, newFavorite];
    updateData({ favorites: newFavorites });
  }, [data.sequence, data.favorites, updateData]);

  const removeFavorite = useCallback(
    (id: string) => {
      const favorites = data.favorites || [];
      const newFavorites = favorites.filter(f => f.id !== id);
      updateData({ favorites: newFavorites });
    },
    [data.favorites, updateData],
  );

  const clearRecents = useCallback(() => {
    updateData({ recents: [] });
  }, [updateData]);

  const handleQuickSelect = useCallback(
    (sequence: string) => {
      // Update sequence builder and show toast (copy handled in QuickAccessPanel)
      updateData({ sequence });
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1500);
    },
    [updateData],
  );

  const copySequence = useCallback(async () => {
    if (!data.sequence) return;

    try {
      const formatted = formatEmoji(data.sequence, data.selectedFormat);
      await navigator.clipboard.writeText(formatted);
      
      // Add current sequence to recents
      const newRecentItem: RecentItem = {
        sequence: data.sequence,
        timestamp: Date.now(),
      };
      const recents = data.recents || [];
      const newRecents = [
        newRecentItem,
        ...recents.filter((r) => r.sequence !== data.sequence)
      ].slice(0, 20);
      
      updateData({ recents: newRecents });
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1500);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [data.sequence, data.selectedFormat, data.recents, updateData]);

  const handleFormatSelect = useCallback(
    async (format: EmojiTabletState["data"]["selectedFormat"]) => {
      updateData({ selectedFormat: format });
      
      if (data.sequence) {
        try {
          const formatted = formatEmoji(data.sequence, format);
          await navigator.clipboard.writeText(formatted);
          setCopiedFeedback(true);
          setTimeout(() => setCopiedFeedback(false), 1500);
        } catch (error) {
          console.error("Failed to copy:", error);
        }
      }
    },
    [data.sequence, updateData],
  );

  // Determine which emoji to show in inspector (selected takes priority over hovered)
  const inspectorEmoji = selectedEmoji || hoveredEmoji;

  return (
    <div className="h-full bg-gray-900 text-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b border-gray-700/50 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <Palette className="text-yellow-400" size={24} />
          <div>
            <h2 className="text-xl font-semibold text-gray-100">Emoji as Data</h2>
            <p className="text-sm text-gray-400">
              Developer-focused emoji picker and formatter
            </p>
          </div>
        </div>

        <SearchBar
          searchQuery={data.searchQuery}
          onSearchChange={(query) => updateData({ searchQuery: query })}
          selectedCategory={data.selectedCategory}
          onCategoryChange={(category) => updateData({ selectedCategory: category })}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full" style={{ gridTemplateColumns: '1fr 1fr 400px' }}>
          {/* Left Column - Sequence Builder & Grid */}
          <div className="lg:col-span-2 space-y-4">
            <SequenceBuilder
              sequence={data.sequence}
              sequenceMode={data.sequenceMode}
              selectedFormat={data.selectedFormat}
              favorites={data.favorites}
              recents={data.recents}
              onCopy={copySequence}
              onClear={() => updateData({ sequence: "" })}
              onToggleSequenceMode={() => updateData({ sequenceMode: !data.sequenceMode })}
              onFormatSelect={handleFormatSelect}
              onAddToFavorites={addToFavorites}
              onQuickSelect={handleQuickSelect}
              showFormatPopover={showFormatPopover}
              onToggleFormatPopover={() => setShowFormatPopover(!showFormatPopover)}
            />

            <EmojiGrid
              emojis={filteredEmojis}
              onEmojiClick={addToSequence}
              onEmojiHover={setHoveredEmoji}
              onSkinToneRequest={(emoji, position) =>
                setSkinToneSelector({ emoji, position })
              }
            />
          </div>

          {/* Right Column - Inspector & Favorites */}
          <div className="space-y-4 w-full">
            <InspectorPanel 
              hoveredEmoji={inspectorEmoji} 
              isSelected={!!selectedEmoji}
              onClearSelection={() => setSelectedEmoji(null)}
              onShowCopyToast={() => {
                setCopiedFeedback(true);
                setTimeout(() => setCopiedFeedback(false), 1500);
              }}
            />

            <FavoritesPanel
              favorites={data.favorites}
              onEmojiClick={addToSequence}
              onRemoveFavorite={removeFavorite}
            />

            <RecentsPanel
              recents={data.recents}
              onEmojiClick={addToSequence}
              onClearRecents={clearRecents}
            />
          </div>
        </div>
      </div>

      {/* Skin Tone Selector */}
      <AnimatePresence>
        {skinToneSelector && (
          <SkinToneSelector
            baseEmoji={skinToneSelector.emoji}
            onSelect={addToSequence}
            onClose={() => setSkinToneSelector(null)}
            position={skinToneSelector.position}
          />
        )}
      </AnimatePresence>

      {/* Copy Feedback */}
      <AnimatePresence>
        {copiedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/50 z-50"
          >
            <div className="flex items-center space-x-2">
              <Copy size={16} />
              <span>Copied to clipboard!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main Tablet Export
export const EmojiTablet: Tablet = {
  id: "emoji",
  label: "Emoji as Data",
  keywords: ["emoji", "unicode", "symbols", "formatter", "picker"],

  createInitialState(): EmojiTabletState {
    return {
      type: "emoji",
      data: {
        searchQuery: "",
        sequence: "",
        selectedFormat: "char",
        favorites: [],
        recents: [],
        selectedCategory: "Smileys & Emotion",
        sequenceMode: false,
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    const defaultState = this.createInitialState();
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "emoji" && parsed.data) {
        return {
          ...defaultState,
          data: {
            ...defaultState.data,
            ...parsed.data,
            // Ensure arrays are valid
            favorites: Array.isArray(parsed.data.favorites) ? parsed.data.favorites : [],
            recents: Array.isArray(parsed.data.recents) ? parsed.data.recents : [],
            // Ensure format is valid
            selectedFormat: ["char", "shortcode", "html", "css", "js", "datauri"].includes(
              parsed.data.selectedFormat,
            )
              ? parsed.data.selectedFormat
              : "char",
            // Ensure category is valid
            selectedCategory: categories.includes(parsed.data.selectedCategory)
              ? parsed.data.selectedCategory
              : "Smileys & Emotion",
            // Ensure sequenceMode is valid
            sequenceMode: typeof parsed.data.sequenceMode === "boolean" 
              ? parsed.data.sequenceMode 
              : false,
          },
        };
      }
    } catch (e) {
      console.error("Failed to deserialize emoji tablet state:", e);
    }
    return defaultState;
  },

  render(state: EmojiTabletState, onChange) {
    return <EmojiUI state={state} onChange={onChange} />;
  },
};