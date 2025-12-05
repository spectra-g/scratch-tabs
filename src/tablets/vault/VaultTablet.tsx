import { useState, useEffect, useCallback, useMemo } from "react";
import { Tablet, TabletState } from "../types";
import { useTabletBridge } from "../bridge";
import { BottomSearchBar } from "./components/BottomSearchBar";
import { VaultCanvas } from "./components/VaultCanvas";
import { VaultScratchpad } from "./components/VaultScratchpad";
import { VaultSidebarCanvas } from "./components/VaultSidebarCanvas";
import { VaultImportModal } from "./components/VaultImportModal";
import { VaultItem, VaultTabletState } from "./types";

export const VaultTablet: Tablet = {
  id: "vault",
  label: "Command Vault",
  keywords: [
    "vault",
    "snippets",
    "knowledge base",
    "code",
    "notes",
    "commands",
    "cheat sheet",
  ],

  createInitialState(): VaultTabletState {
    return {
      type: "vault",
      data: {
        items: [],
        viewMode: "canvas",
        categories: ["General"], // Default category to eliminate friction
        scratchpadContent: "",
        isScratchpadOpen: false,
        isSpotlightOpen: false,
        selectedCategory: "General", // Auto-select so users can add immediately
        scratchpadSourceItemId: null,
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === "vault" && parsed.data) {
        // Ensure all items have the expected properties
        if (Array.isArray(parsed.data.items)) {
          parsed.data.items = parsed.data.items.map((item: any, index: number) => ({
            id: item.id || crypto.randomUUID(),
            title: item.title || "Untitled",
            content: item.content || "",
            contentType: item.contentType || "plaintext",
            labels: Array.isArray(item.labels) ? item.labels : [],
            createdTimestamp: item.createdTimestamp || Date.now(),
            modifiedTimestamp: item.modifiedTimestamp || Date.now(),
            isPinned: !!item.isPinned,
            usageCount: item.usageCount || 0,
            lastUsedTimestamp:
              item.lastUsedTimestamp || item.createdTimestamp || Date.now(),
            order: item.order !== undefined ? item.order : index, // Migrate: use index if order doesn't exist
          }));
        }

        // MIGRATION LOGIC: Check if this is old state format
        const isOldFormat =
          parsed.data.viewMode === "card" ||
          parsed.data.viewMode === "list" ||
          !parsed.data.hasOwnProperty("scratchpadContent");

        if (isOldFormat) {
          // Migrate from old format to new canvas format
          const firstLabel = parsed.data.activeFilters?.labels?.[0] || null;

          parsed.data.viewMode = "canvas";
          parsed.data.categories = [];
          parsed.data.scratchpadContent = "";
          parsed.data.isScratchpadOpen = false;
          parsed.data.isSpotlightOpen = false;
          parsed.data.selectedCategory = firstLabel;
          parsed.data.scratchpadSourceItemId = null;
        } else {
          // New format - ensure all fields exist
          parsed.data.categories = parsed.data.categories || [];
          parsed.data.scratchpadContent = parsed.data.scratchpadContent || "";
          parsed.data.isScratchpadOpen = !!parsed.data.isScratchpadOpen;
          parsed.data.isSpotlightOpen = false; // Always reset on load
          parsed.data.selectedCategory = parsed.data.selectedCategory || null;
          parsed.data.scratchpadSourceItemId = parsed.data.scratchpadSourceItemId || null;
          parsed.data.viewMode = "canvas"; // Force canvas mode
        }

        // ENSURE DEFAULT CATEGORY: Always have "General" available
        if (!parsed.data.categories.includes("General")) {
          parsed.data.categories.unshift("General");
        }

        // AUTO-SELECT: If no category selected, select first available (should be "General")
        const allCategories = Array.from(
          new Set([
            ...parsed.data.categories,
            ...parsed.data.items.flatMap((item: any) => item.labels || []),
          ])
        ).sort();

        if (!parsed.data.selectedCategory && allCategories.length > 0) {
          parsed.data.selectedCategory = allCategories[0]; // Auto-select first (General)
        }

        return parsed;
      }
    } catch (e) {
      console.error("Failed to deserialize vault state:", e);
    }

    // Return default state if parsing fails
    return this.createInitialState();
  },

  render(state: VaultTabletState, onChange) {
    const bridge = useTabletBridge();

    // Local state
    const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
    const [scratchpadCopied, setScratchpadCopied] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Get unique categories from manual list and items
    const categories = useMemo(() => {
      const labelSet = new Set<string>(state.data.categories || []);
      state.data.items.forEach((item) => {
        item.labels.forEach((label) => labelSet.add(label));
      });
      return Array.from(labelSet).sort();
    }, [state.data.items, state.data.categories]);

    // Calculate item counts per category
    const itemCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      state.data.items.forEach((item) => {
        item.labels.forEach((label) => {
          counts[label] = (counts[label] || 0) + 1;
        });
      });
      return counts;
    }, [state.data.items]);

    // Keyboard shortcut for search bar (Ctrl+R)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "r") {
          e.preventDefault();
          onChange({
            ...state,
            data: {
              ...state.data,
              isSpotlightOpen: !state.data.isSpotlightOpen,
            },
          });
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [state, onChange]);

    // Handlers
    const handleSelectCategory = useCallback(
      (category: string) => {
        onChange({
          ...state,
          data: {
            ...state.data,
            selectedCategory: category,
          },
        });
      },
      [state, onChange]
    );

    const handleAddCategory = useCallback(
      (name: string) => {
        // Add to categories array and select it
        const updatedCategories = [...(state.data.categories || [])];
        if (!updatedCategories.includes(name)) {
          updatedCategories.push(name);
        }

        onChange({
          ...state,
          data: {
            ...state.data,
            categories: updatedCategories,
            selectedCategory: name,
          },
        });
      },
      [state, onChange]
    );

    const handleDeleteCategory = useCallback(
      (name: string) => {
        // Remove the label from all items and delete items with no other labels
        const updatedItems = state.data.items
          .map((item) => ({
            ...item,
            labels: item.labels.filter((label) => label !== name),
          }))
          .filter((item) => item.labels.length > 0);

        // Remove from categories array
        const updatedCategories = (state.data.categories || []).filter(
          (cat) => cat !== name
        );

        // If deleted category was selected, clear selection
        const newSelectedCategory =
          state.data.selectedCategory === name ? null : state.data.selectedCategory;

        onChange({
          ...state,
          data: {
            ...state.data,
            items: updatedItems,
            categories: updatedCategories,
            selectedCategory: newSelectedCategory,
          },
        });
      },
      [state, onChange]
    );

    const handleAddItem = useCallback(
      (content: string, category: string | null, insertAfterId?: string | null) => {
        const now = Date.now();

        // Fallback: If no category provided, use first available (should be "General")
        if (!category) {
          const allCategories = Array.from(
            new Set([
              ...state.data.categories,
              ...state.data.items.flatMap((item) => item.labels),
            ])
          ).sort();
          category = allCategories[0] || "General";

          // Ensure the fallback category exists
          if (!state.data.categories.includes(category)) {
            state.data.categories.push(category);
          }
        }

        // Calculate order for new item
        let order = 0;
        if (insertAfterId === null || insertAfterId === undefined) {
          // Insert at top - find lowest order in category
          const categoryItems = state.data.items.filter((item) =>
            item.labels.includes(category)
          );
          const minOrder = categoryItems.length > 0
            ? Math.min(...categoryItems.map((item) => item.order || 0))
            : 0;
          order = minOrder - 1;
        } else {
          // Insert after specific item
          const afterItem = state.data.items.find((item) => item.id === insertAfterId);
          if (afterItem) {
            const categoryItems = state.data.items
              .filter((item) => item.labels.includes(category))
              .sort((a, b) => (a.order || 0) - (b.order || 0));

            const afterIndex = categoryItems.findIndex((item) => item.id === insertAfterId);
            const nextItem = categoryItems[afterIndex + 1];

            if (nextItem) {
              // Insert between afterItem and nextItem
              order = ((afterItem.order || 0) + (nextItem.order || 0)) / 2;
            } else {
              // Insert at end
              order = (afterItem.order || 0) + 1;
            }
          }
        }

        const newItem: VaultItem = {
          id: crypto.randomUUID(),
          title: content.substring(0, 50),
          content,
          contentType: "plaintext",
          labels: [category],
          createdTimestamp: now,
          modifiedTimestamp: now,
          isPinned: false,
          usageCount: 0,
          lastUsedTimestamp: now,
          order,
        };

        onChange({
          ...state,
          data: {
            ...state.data,
            items: [newItem, ...state.data.items],
          },
        });
      },
      [state, onChange]
    );

    const handleReorder = useCallback(
      (itemIds: string[]) => {
        // Update order field based on new position
        const updatedItems = state.data.items.map((item) => {
          const newIndex = itemIds.indexOf(item.id);
          if (newIndex !== -1) {
            return { ...item, order: newIndex };
          }
          return item;
        });

        onChange({
          ...state,
          data: {
            ...state.data,
            items: updatedItems,
          },
        });
      },
      [state, onChange]
    );

    const handleCopyItem = useCallback(
      (id: string) => {
        const item = state.data.items.find((i) => i.id === id);
        if (!item) return;

        navigator.clipboard.writeText(item.content);
        setCopiedItemId(id);

        // Update usage count and timestamp
        const now = Date.now();
        const updatedItems = state.data.items.map((i) =>
          i.id === id
            ? {
                ...i,
                usageCount: i.usageCount + 1,
                lastUsedTimestamp: now,
              }
            : i
        );

        onChange({
          ...state,
          data: {
            ...state.data,
            items: updatedItems,
          },
        });

        setTimeout(() => setCopiedItemId(null), 1500);
      },
      [state, onChange]
    );

    const handleOpenInScratchpad = useCallback(
      (id: string) => {
        const item = state.data.items.find((i) => i.id === id);
        if (!item) return;

        onChange({
          ...state,
          data: {
            ...state.data,
            scratchpadContent: item.content,
            isScratchpadOpen: true,
            scratchpadSourceItemId: id,
          },
        });
      },
      [state, onChange]
    );

    const handleUpdateItem = useCallback(
      (id: string, content: string, title: string) => {
        const now = Date.now();
        const updatedItems = state.data.items.map((i) =>
          i.id === id
            ? {
                ...i,
                content,
                title,
                modifiedTimestamp: now,
              }
            : i
        );

        onChange({
          ...state,
          data: {
            ...state.data,
            items: updatedItems,
          },
        });
      },
      [state, onChange]
    );

    const handleDeleteItem = useCallback(
      (id: string) => {
        onChange({
          ...state,
          data: {
            ...state.data,
            items: state.data.items.filter((i) => i.id !== id),
          },
        });
      },
      [state, onChange]
    );

    const handleScratchpadChange = useCallback(
      (content: string) => {
        onChange({
          ...state,
          data: {
            ...state.data,
            scratchpadContent: content,
          },
        });
      },
      [state, onChange]
    );

    const handleCloseScratchpad = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...state.data,
          isScratchpadOpen: false,
        },
      });
    }, [state, onChange]);

    const handleCopyScratchpad = useCallback(() => {
      navigator.clipboard.writeText(state.data.scratchpadContent);
      setScratchpadCopied(true);
      setTimeout(() => setScratchpadCopied(false), 1500);
    }, [state.data.scratchpadContent]);

    const handleSaveAsNew = useCallback(() => {
      if (!state.data.scratchpadContent.trim()) return;

      // Fallback to "General" if no category selected (shouldn't happen, but safety)
      const targetCategory = state.data.selectedCategory || "General";

      const now = Date.now();
      const newItem: VaultItem = {
        id: crypto.randomUUID(),
        title: state.data.scratchpadContent.substring(0, 50),
        content: state.data.scratchpadContent,
        contentType: "plaintext",
        labels: [targetCategory],
        createdTimestamp: now,
        modifiedTimestamp: now,
        isPinned: false,
        usageCount: 0,
        lastUsedTimestamp: now,
        order: 0, // Will be calculated properly if needed
      };

      onChange({
        ...state,
        data: {
          ...state.data,
          items: [newItem, ...state.data.items],
          scratchpadContent: "",
          isScratchpadOpen: false,
          scratchpadSourceItemId: null,
        },
      });
    }, [state, onChange]);

    const handleSaveScratchpad = useCallback(() => {
      if (!state.data.scratchpadSourceItemId || !state.data.scratchpadContent.trim())
        return;

      const now = Date.now();
      const updatedItems = state.data.items.map((item) =>
        item.id === state.data.scratchpadSourceItemId
          ? {
              ...item,
              content: state.data.scratchpadContent,
              title: state.data.scratchpadContent.substring(0, 50),
              modifiedTimestamp: now,
            }
          : item
      );

      onChange({
        ...state,
        data: {
          ...state.data,
          items: updatedItems,
          isScratchpadOpen: false,
          scratchpadContent: "",
          scratchpadSourceItemId: null,
        },
      });
    }, [state, onChange]);

    const handleSearchBarClose = useCallback(() => {
      onChange({
        ...state,
        data: {
          ...state.data,
          isSpotlightOpen: false,
        },
      });
    }, [state, onChange]);

    const handleSearchBarSelect = useCallback(
      (item: VaultItem) => {
        // Copy to clipboard
        navigator.clipboard.writeText(item.content);

        // Update usage count
        const now = Date.now();
        const updatedItems = state.data.items.map((i) =>
          i.id === item.id
            ? {
                ...i,
                usageCount: i.usageCount + 1,
                lastUsedTimestamp: now,
              }
            : i
        );

        // Navigate to the category that contains the item
        const firstCategory = item.labels[0] || null;

        onChange({
          ...state,
          data: {
            ...state.data,
            items: updatedItems,
            selectedCategory: firstCategory,
            isSpotlightOpen: false,
          },
        });

        // Show copy feedback
        setCopiedItemId(item.id);
        setTimeout(() => setCopiedItemId(null), 1500);
      },
      [state, onChange]
    );

    const handleOpenImportModal = useCallback(() => {
      setIsImportModalOpen(true);
    }, []);

    const handleCloseImportModal = useCallback(() => {
      setIsImportModalOpen(false);
    }, []);

    const handleImportItems = useCallback(
      (importedItems: VaultItem[]) => {
        // Find the highest order value for proper sequencing
        const maxOrder = state.data.items.length > 0
          ? Math.max(...state.data.items.map((item) => item.order || 0))
          : 0;

        // Add order field to imported items
        const itemsWithOrder = importedItems.map((item, index) => ({
          ...item,
          order: maxOrder + index + 1, // Append to end
        }));

        onChange({
          ...state,
          data: {
            ...state.data,
            items: [...state.data.items, ...itemsWithOrder],
          },
        });

        setIsImportModalOpen(false);
      },
      [state, onChange]
    );

    return (
      <div className="h-full flex flex-col bg-canvas overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <VaultSidebarCanvas
            categories={categories}
            selectedCategory={state.data.selectedCategory}
            onSelectCategory={handleSelectCategory}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            itemCounts={itemCounts}
          />

          {/* Canvas */}
          <VaultCanvas
            items={state.data.items}
            selectedCategory={state.data.selectedCategory}
            onAddItem={handleAddItem}
            onCopyItem={handleCopyItem}
            onOpenInScratchpad={handleOpenInScratchpad}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onReorder={handleReorder}
            onImport={handleOpenImportModal}
            copiedItemId={copiedItemId}
          />

          {/* Scratchpad */}
          <VaultScratchpad
            content={state.data.scratchpadContent}
            isOpen={state.data.isScratchpadOpen}
            onContentChange={handleScratchpadChange}
            onClose={handleCloseScratchpad}
            onCopy={handleCopyScratchpad}
            onSave={handleSaveScratchpad}
            onSaveAsNew={handleSaveAsNew}
            isCopied={scratchpadCopied}
            hasSourceItem={!!state.data.scratchpadSourceItemId}
          />
        </div>

        {/* Bottom Search Bar */}
        <BottomSearchBar
          items={state.data.items}
          isOpen={state.data.isSpotlightOpen}
          onClose={handleSearchBarClose}
          onSelect={handleSearchBarSelect}
        />

        {/* Import Modal */}
        {isImportModalOpen && (
          <VaultImportModal
            onImport={handleImportItems}
            onClose={handleCloseImportModal}
            existingItems={state.data.items}
          />
        )}
      </div>
    );
  },
};
