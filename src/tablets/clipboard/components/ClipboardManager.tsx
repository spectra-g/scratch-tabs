import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from 'lucide-react';
import { ClipboardTabletState, ClipboardData, ViewMode, ContentType } from '../types';
import { ClipboardSidebar } from './ClipboardSidebar';
import { ClipboardHeader } from './ClipboardHeader';
import { ClipboardList } from './ClipboardList';
import { useClipboardOperations } from '../hooks/useClipboardOperations';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useAutoExpiry } from '../hooks/useAutoExpiry';
import { filterItems } from '../utils/clipboardUtils';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface ClipboardManagerProps {
  state: ClipboardTabletState;
  onChange: (newState: ClipboardTabletState) => void;
}

export const ClipboardManager: React.FC<ClipboardManagerProps> = ({ state, onChange }) => {
  const { data } = state;
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const updateData = useCallback(
    (updates: Partial<ClipboardData>) => {
      onChange({ ...state, data: { ...state.data, ...updates } });
    },
    [state, onChange]
  );

  // Auto-close sidebar on mobile
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Setup clipboard operations
  const { 
    handlePaste, 
    handleCopy: handleCopyOperation, 
    handleDelete, 
    handleTogglePin, 
    handleToggleFavorite 
  } = useClipboardOperations(data, updateData);

  // Setup auto-expiry
  useAutoExpiry(data, updateData);

  // Filter items
  const filteredItems = useMemo(() => {
    return filterItems(data.items, data.searchQuery, data.filterType, data.showFavorites);
  }, [data.items, data.searchQuery, data.filterType, data.showFavorites]);

  // Handle copy with UI feedback
  const handleCopy = useCallback(
    async (id: string, content: string, type: ContentType): Promise<boolean> => {
      const success = await handleCopyOperation(id, content, type);
      if (success) {
        setCopiedItemId(id);
        setTimeout(() => setCopiedItemId(null), 1500);
      }
      return success;
    },
    [handleCopyOperation]
  );

  // Setup keyboard navigation
  const { 
    activeIndex, 
    setActiveIndex, 
    listRef, 
    resetActiveIndex 
  } = useKeyboardNavigation(filteredItems, handleCopy);

  // Handle paste events
  useEffect(() => {
    const handlePasteEvent = () => handlePaste();
    window.addEventListener("paste", handlePasteEvent);
    return () => window.removeEventListener("paste", handlePasteEvent);
  }, [handlePaste]);

  // Handle filter updates
  const handleFilterUpdate = useCallback((updates: Partial<typeof data>) => {
    updateData(updates);
  }, [updateData]);

  // Handle view mode change
  const handleViewModeChange = useCallback((viewMode: ViewMode) => {
    updateData({ viewMode });
  }, [updateData]);

  // Handle item click
  const handleItemClick = useCallback((index: number) => {
    setActiveIndex(index);
  }, [setActiveIndex]);

  const SidebarContent = () => (
    <ClipboardSidebar
      filters={{
        searchQuery: data.searchQuery,
        filterType: data.filterType,
        showFavorites: data.showFavorites,
      }}
      onUpdateFilters={handleFilterUpdate}
      onPaste={handlePaste}
      onClose={isMobile ? () => setSidebarOpen(false) : undefined}
      isMobile={isMobile}
    />
  );

  return (
    <div className="h-full bg-gray-900 flex relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="z-20 absolute top-0 left-0 h-full bg-gray-900/95 backdrop-blur-sm border-r border-gray-700/50 w-64"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-64 flex-shrink-0 border-r border-gray-700/50">
          <SidebarContent />
        </div>
      )}

      {/* Mobile Menu Button */}
      {!isSidebarOpen && isMobile && (
        <div className="absolute top-0 left-0 z-30 p-2">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="p-2 text-gray-400 hover:text-white bg-gray-800/50 rounded-md"
            title="Open sidebar"
          >
            <Menu size={20} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ClipboardHeader
          itemCount={filteredItems.length}
          totalCount={data.items.length}
          viewMode={data.viewMode}
          onViewModeChange={handleViewModeChange}
        />

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-4 custom-scrollbar"
          onClick={resetActiveIndex}
        >
          <ClipboardList
            items={filteredItems}
            viewMode={data.viewMode}
            activeIndex={activeIndex}
            copiedItemId={copiedItemId}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
            onToggleFavorite={handleToggleFavorite}
            onItemClick={handleItemClick}
            onBackgroundClick={resetActiveIndex}
            listRef={listRef}
          />
        </div>
      </div>
    </div>
  );
};