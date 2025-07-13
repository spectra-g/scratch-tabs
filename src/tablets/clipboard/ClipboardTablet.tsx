import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Tablet, TabletState } from "../types";
import { motion } from "framer-motion";
import {
  Clipboard,
  Copy,
  ClipboardPaste,
  XCircle,
  RefreshCw,
  ExternalLink,
  Pin,
  PinOff,
  Pencil,
  Check,
  Search,
  Image as ImageIcon,
  Link2,
  Palette,
  FileText,
  X,
  Filter,
  List,
  Trash2,
  Merge,
  Star,
  Keyboard,
  View,
  Grid,
  Clock,
} from "lucide-react";
import { detectLanguage } from "../../languages";
import { useRootStore } from "../../stores";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { formatRelativeTime } from "../vault/utils/dateUtils"; // CORRECTED IMPORT PATH

// --- Types & Constants ---
type ContentType = "text" | "image" | "link" | "color";
type ViewMode = "list" | "card";

interface ClipboardItem {
  id: string;
  content: string;
  type: ContentType;
  timestamp: number;
  expiresAt: number;
  isPinned: boolean;
  isFavorite: boolean;
  title: string;
  sourceApp?: string; // Future use
}

interface ClipboardTabletState extends TabletState {
  type: "clipboard";
  data: {
    items: ClipboardItem[];
    searchQuery: string;
    filterType: ContentType | null;
    showFavorites: boolean;
    viewMode: ViewMode;
  };
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const EXPIRY_CHECK_INTERVAL_MS = 1000;

// --- Helper Functions ---
const detectContentType = (content: string): ContentType => {
  if (content.startsWith("data:image/")) return "image";
  if (content.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) return "color";
  try {
    new URL(content);
    if (content.includes("://")) return "link";
  } catch (_) {}
  return "text";
};

const generateTitle = (content: string, type: ContentType): string => {
  switch (type) {
    case "image":
      return `Image - ${new Date().toLocaleString()}`;
    case "link":
      try {
        const url = new URL(content);
        return url.hostname;
      } catch {
        return "Link";
      }
    case "color":
      return `Color - ${content}`;
    case "text":
      return content.split("\n")[0].substring(0, 50).trim() || "Text Snippet";
    default:
      return "Clipboard Item";
  }
};

const formatDuration = (ms: number): string => {
  if (ms < 0) return "Expired";
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// --- UI Components ---

const ItemPreview: React.FC<{ item: ClipboardItem; viewMode: ViewMode }> =
  React.memo(({ item, viewMode }) => {
    const className =
      viewMode === "card"
        ? "max-h-24 w-auto object-contain rounded-md mx-auto"
        : "max-h-48 w-auto object-contain rounded-md";
    switch (item.type) {
      case "image":
        return <img src={item.content} alt={item.title} className={className} />;
      case "color":
        return (
          <div
            className="w-full h-full rounded-md"
            style={{ backgroundColor: item.content }}
          />
        );
      case "link":
        return (
          <div className="flex items-center space-x-2 p-2">
            <Link2 size={16} className="text-blue-400 flex-shrink-0" />
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline truncate"
            >
              {item.content}
            </a>
          </div>
        );
      case "text":
      default:
        return (
          <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all p-2">
            {item.content}
          </pre>
        );
    }
  });

const ContentTypeIcon: React.FC<{ type: ContentType }> = React.memo(
  ({ type }) => {
    switch (type) {
      case "image":
        return <ImageIcon size={14} className="text-purple-400" />;
      case "link":
        return <Link2 size={14} className="text-blue-400" />;
      case "color":
        return <Palette size={14} className="text-pink-400" />;
      case "text":
      default:
        return <FileText size={14} className="text-gray-400" />;
    }
  },
);

const ExpiryCountdown: React.FC<{ expiry: number }> = ({ expiry }) => {
  const [remaining, setRemaining] = useState(expiry - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const newRemaining = expiry - Date.now();
      if (newRemaining > 0) {
        setRemaining(newRemaining);
      } else {
        setRemaining(0);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiry]);

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-500">
      <Clock size={12} />
      <span>{formatDuration(remaining)}</span>
    </div>
  );
};

// --- Main Tablet Component ---
export const ClipboardTablet: Tablet = {
  id: "clipboard",
  label: "Clipboard Manager",
  keywords: ["clipboard", "copy", "paste", "history", "manager"],

  createInitialState(): ClipboardTabletState {
    return {
      type: "clipboard",
      data: {
        items: [],
        searchQuery: "",
        filterType: null,
        showFavorites: false,
        viewMode: "list",
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
      if (parsed.type === "clipboard" && parsed.data) {
        const items = Array.isArray(parsed.data.items)
          ? parsed.data.items.map((item: any) => ({
              id: item.id || crypto.randomUUID(),
              content: item.content || "",
              type: item.type || detectContentType(item.content || ""),
              title:
                item.title ||
                generateTitle(
                  item.content || "",
                  item.type || detectContentType(item.content || ""),
                ),
              isFavorite: !!item.isFavorite,
              isPinned: !!item.isPinned,
              timestamp: item.timestamp || Date.now(),
              expiresAt: item.expiresAt || Date.now() + TWENTY_FOUR_HOURS_MS,
            }))
          : [];

        return {
          ...defaultState,
          data: {
            ...defaultState.data,
            ...parsed.data,
            items,
            viewMode: parsed.data.viewMode || "list",
          },
        };
      }
    } catch (e) {
      console.error("Failed to deserialize clipboard state:", e);
    }
    return defaultState;
  },

  render(state: ClipboardTabletState, onChange) {
    const { data } = state;
    const { items, searchQuery, filterType, showFavorites, viewMode } = data;
    const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);
    const latestStateRef = useRef(state);
    latestStateRef.current = state;

    const updateData = useCallback(
      (updates: Partial<ClipboardTabletState["data"]>) => {
        onChange({ ...state, data: { ...state.data, ...updates } });
      },
      [state, onChange],
    );

    // Auto-expire items
    useEffect(() => {
      const interval = setInterval(() => {
        const now = Date.now();
        const currentState = latestStateRef.current;
        const unexpiredItems = currentState.data.items.filter(
          (item) => item.isPinned || item.expiresAt > now,
        );
        if (unexpiredItems.length < currentState.data.items.length) {
          updateData({ items: unexpiredItems });
        }
      }, EXPIRY_CHECK_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [updateData]);

    // Filter and sort items
    const filteredItems = useMemo(() => {
      return items
        .filter((item) => {
          if (showFavorites && !item.isFavorite) return false;
          if (filterType && item.type !== filterType) return false;
          if (
            searchQuery &&
            !item.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !item.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
            return false;
          return true;
        })
        .sort((a, b) => b.timestamp - a.timestamp);
    }, [items, showFavorites, filterType, searchQuery]);

    // Handle clipboard changes
    const handlePaste = useCallback(async () => {
      try {
        const clipboardItems = await navigator.clipboard.read();

        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const reader = new FileReader();

              reader.onload = () => {
                const imageDataUrl = reader.result as string;
                if (
                  !latestStateRef.current.data.items.some(
                    (i) => i.content === imageDataUrl,
                  )
                ) {
                  const newItem: ClipboardItem = {
                    id: crypto.randomUUID(),
                    content: imageDataUrl,
                    type: "image",
                    timestamp: Date.now(),
                    expiresAt: Date.now() + TWENTY_FOUR_HOURS_MS,
                    isPinned: false,
                    isFavorite: false,
                    title: generateTitle(imageDataUrl, "image"),
                  };
                  updateData({
                    items: [newItem, ...latestStateRef.current.data.items],
                  });
                }
              };

              reader.readAsDataURL(blob);
              return;
            }
          }

          if (item.types.includes("text/plain")) {
            const text = await item.getType("text/plain");
            const textContent = await text.text();
            const trimmedText = textContent.trim();

            if (
              !trimmedText ||
              latestStateRef.current.data.items.some(
                (i) => i.content === trimmedText,
              )
            )
              return;

            const type = detectContentType(trimmedText);
            const newItem: ClipboardItem = {
              id: crypto.randomUUID(),
              content: trimmedText,
              type,
              timestamp: Date.now(),
              expiresAt: Date.now() + TWENTY_FOUR_HOURS_MS,
              isPinned: false,
              isFavorite: false,
              title: generateTitle(trimmedText, type),
            };
            updateData({
              items: [newItem, ...latestStateRef.current.data.items],
            });
            return;
          }
        }
      } catch (error) {
        console.error("Failed to read clipboard:", error);
        try {
          const text = await navigator.clipboard.readText();
          const trimmedText = text.trim();
          if (
            !trimmedText ||
            latestStateRef.current.data.items.some(
              (i) => i.content === trimmedText,
            )
          )
            return;

          const type = detectContentType(trimmedText);
          const newItem: ClipboardItem = {
            id: crypto.randomUUID(),
            content: trimmedText,
            type,
            timestamp: Date.now(),
            expiresAt: Date.now() + TWENTY_FOUR_HOURS_MS,
            isPinned: false,
            isFavorite: false,
            title: generateTitle(trimmedText, type),
          };
          updateData({
            items: [newItem, ...latestStateRef.current.data.items],
          });
        } catch (textError) {
          console.error("Failed to read clipboard text:", textError);
        }
      }
    }, [updateData]);

    const handleCopy = useCallback(
      async (id: string, content: string, type: ContentType) => {
        try {
          if (type === "image" && content.startsWith("data:image/")) {
            const response = await fetch(content);
            const blob = await response.blob();
            const clipboardItem = new ClipboardItem({
              [blob.type]: blob,
            } as any);
            await navigator.clipboard.write([clipboardItem]);
          } else {
            await navigator.clipboard.writeText(content);
          }

          const now = Date.now();
          updateData({
            items: items.map((item) =>
              item.id === id
                ? { ...item, timestamp: now, expiresAt: now + TWENTY_FOUR_HOURS_MS }
                : item,
            ),
          });

          setCopiedItemId(id);
          setTimeout(() => setCopiedItemId(null), 1500);
        } catch (error) {
          console.error("Failed to copy to clipboard:", error);
        }
      },
      [items, updateData],
    );

    const handleDelete = (id: string) => {
      updateData({ items: items.filter((item) => item.id !== id) });
    };
    const handleTogglePin = (id: string) => {
      updateData({
        items: items.map((item) =>
          item.id === id ? { ...item, isPinned: !item.isPinned } : item,
        ),
      });
    };
    const handleToggleFavorite = (id: string) => {
      updateData({
        items: items.map((item) =>
          item.id === id ? { ...item, isFavorite: !item.isFavorite } : item,
        ),
      });
    };

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((prev) =>
            Math.min(prev + 1, filteredItems.length - 1),
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
        } else if (
          e.key === "Enter" &&
          activeIndex >= 0 &&
          filteredItems[activeIndex]
        ) {
          e.preventDefault();
          handleCopy(
            filteredItems[activeIndex].id,
            filteredItems[activeIndex].content,
            filteredItems[activeIndex].type,
          );
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeIndex, filteredItems, handleCopy]);

    useEffect(() => {
      const handlePasteEvent = () => {
        handlePaste();
      };
      window.addEventListener("paste", handlePasteEvent);
      return () => window.removeEventListener("paste", handlePasteEvent);
    }, [handlePaste]);

    useEffect(() => {
      if (activeIndex === -1 || !listRef.current) return;
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      activeElement?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }, [activeIndex]);

    return (
      <div className="h-full bg-gray-900 flex">
        <div className="w-64 border-r border-gray-700/50 flex flex-col p-4 space-y-6">
          <div className="flex items-center space-x-3">
            <Clipboard className="text-gray-400" size={20} />
            <h2 className="text-lg font-semibold text-gray-100">Clipboard</h2>
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateData({ searchQuery: e.target.value })}
              placeholder="Search clipboard..."
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md pl-10 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500"
            />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Filters
            </h3>
            <div className="space-y-1">
              <button
                onClick={() =>
                  updateData({ filterType: null, showFavorites: false })
                }
                className={`w-full flex items-center p-2 rounded-md text-sm ${!filterType && !showFavorites ? "bg-blue-500/20 text-blue-300" : "text-gray-300 hover:bg-gray-800"}`}
              >
                <List size={16} className="mr-2" />
                All Items
              </button>
              <button
                onClick={() =>
                  updateData({
                    showFavorites: !showFavorites,
                    filterType: null,
                  })
                }
                className={`w-full flex items-center p-2 rounded-md text-sm ${showFavorites ? "bg-blue-500/20 text-blue-300" : "text-gray-300 hover:bg-gray-800"}`}
              >
                <Star size={16} className="mr-2" />
                Favorites
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Content Types
            </h3>
            <div className="space-y-1">
              {["text", "image", "link", "color"].map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    updateData({ filterType: type as ContentType })
                  }
                  className={`w-full flex items-center p-2 rounded-md text-sm ${filterType === type ? "bg-blue-500/20 text-blue-300" : "text-gray-300 hover:bg-gray-800"}`}
                >
                  <ContentTypeIcon type={type as ContentType} />
                  <span className="ml-2 capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto space-y-2">
            <button
              onClick={handlePaste}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors text-sm"
            >
              <ClipboardPaste size={16} />
              <span>Paste from Clipboard</span>
            </button>
            <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
              <Keyboard size={14} />
              <span>Up/Down to navigate, Enter to copy.</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-none p-4 border-b border-gray-700/50 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {filteredItems.length} of {items.length} items showing
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-gray-800/50 border border-gray-700/50 rounded-md">
                <button
                  onClick={() => updateData({ viewMode: "list" })}
                  className={`p-1.5 rounded-l-md ${viewMode === "list" ? "bg-blue-500/20 text-blue-300" : "text-gray-400 hover:bg-gray-700/50"}`}
                  title="List View"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => updateData({ viewMode: "card" })}
                  className={`p-1.5 rounded-r-md ${viewMode === "card" ? "bg-blue-500/20 text-blue-300" : "text-gray-400 hover:bg-gray-700/50"}`}
                  title="Card View"
                >
                  <Grid size={16} />
                </button>
              </div>
            </div>
          </div>
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-4 custom-scrollbar"
            onClick={() => setActiveIndex(-1)}
          >
            {filteredItems.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <Filter size={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-base">No items match your filters</p>
                <p className="text-sm mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <div
                      className={`bg-gray-800/50 border rounded-lg overflow-hidden transition-all duration-200 group ${activeIndex === index ? "ring-2 ring-blue-400" : "border-gray-700/50 hover:border-gray-600/50"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveIndex(index);
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <ContentTypeIcon type={item.type} />
                            <p className="text-sm font-medium text-gray-200 truncate">
                              {item.title}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleToggleFavorite(item.id)}
                              className={`p-1.5 rounded transition-colors ${item.isFavorite ? "text-yellow-400 hover:bg-yellow-500/20" : "text-gray-500 hover:text-gray-200 hover:bg-gray-700/50"}`}
                            >
                              <Star
                                size={14}
                                className={
                                  item.isFavorite ? "fill-current" : ""
                                }
                              />
                            </button>
                            <button
                              onClick={() => handleTogglePin(item.id)}
                              className={`p-1.5 rounded transition-colors ${item.isPinned ? "text-yellow-400 hover:bg-yellow-500/20" : "text-gray-500 hover:text-gray-200 hover:bg-gray-700/50"}`}
                            >
                              <Pin
                                size={14}
                                className={item.isPinned ? "fill-current" : ""}
                              />
                            </button>
                          </div>
                        </div>
                        <div className="h-28 flex items-center justify-center p-2 bg-black/20 rounded-md overflow-hidden">
                          <ItemPreview item={item} viewMode="card" />
                        </div>
                      </div>
                      <div className="px-3 py-2 border-t border-gray-700/50 flex justify-between items-center">
                        <ExpiryCountdown expiry={item.expiresAt} />
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              handleCopy(item.id, item.content, item.type)
                            }
                            className="p-1 rounded hover:bg-gray-700/50"
                            title="Copy"
                          >
                            {copiedItemId === item.id ? (
                              <Check size={14} className="text-green-400" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 rounded hover:bg-gray-700/50"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <div
                      className={`bg-gray-800/50 border rounded-lg transition-all duration-200 group flex items-start p-3 space-x-4 ${activeIndex === index ? "ring-2 ring-blue-400" : "border-gray-700/50 hover:border-gray-600/50"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveIndex(index);
                      }}
                    >
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <ContentTypeIcon type={item.type} />
                            <p className="text-sm font-medium text-gray-200 truncate">
                              {item.title}
                            </p>
                          </div>
                          <ExpiryCountdown expiry={item.expiresAt} />
                        </div>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-md bg-black/20 p-2">
                          <ItemPreview item={item} viewMode="list" />
                        </div>
                      </div>
                      <div className="flex flex-col items-center space-y-2">
                        <button
                          onClick={() =>
                            handleCopy(item.id, item.content, item.type)
                          }
                          className="p-1.5 rounded hover:bg-gray-700/50"
                          title="Copy"
                        >
                          {copiedItemId === item.id ? (
                            <Check size={16} className="text-green-400" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleFavorite(item.id)}
                          className={`p-1.5 rounded transition-colors ${item.isFavorite ? "text-yellow-400 hover:bg-yellow-500/20" : "text-gray-500 hover:text-gray-200 hover:bg-gray-700/50"}`}
                        >
                          <Star
                            size={16}
                            className={item.isFavorite ? "fill-current" : ""}
                          />
                        </button>
                        <button
                          onClick={() => handleTogglePin(item.id)}
                          className={`p-1.5 rounded transition-colors ${item.isPinned ? "text-yellow-400 hover:bg-yellow-500/20" : "text-gray-500 hover:text-gray-200 hover:bg-gray-700/50"}`}
                        >
                          <Pin
                            size={16}
                            className={item.isPinned ? "fill-current" : ""}
                          />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded hover:bg-gray-700/50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
};