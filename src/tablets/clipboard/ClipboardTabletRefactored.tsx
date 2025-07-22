import React from 'react';
import { Tablet, TabletState } from '../types';
import { ClipboardManager } from './components/ClipboardManager';
import { ClipboardTabletState } from './types';
import { detectContentType, generateTitle, TWENTY_FOUR_HOURS_MS } from './utils/contentUtils';

export const ClipboardTabletRefactored: Tablet = {
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
              sourceApp: item.sourceApp,
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
    return <ClipboardManager state={state} onChange={onChange} />;
  },
};