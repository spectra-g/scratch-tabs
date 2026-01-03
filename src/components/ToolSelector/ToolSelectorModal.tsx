import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search } from '../Icons';
import { toolService, ToolItem } from '../../services/toolService';
import { ToolCard } from './ToolCard';

interface ToolSelectorModalProps {
    onSelect: (item: ToolItem) => void;
    onClose: () => void;
    initialSearch?: string;
}

export const ToolSelectorModal: React.FC<ToolSelectorModalProps> = ({
    onSelect,
    onClose,
    initialSearch = '',
}) => {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [results, setResults] = useState<{
        tablets: ToolItem[];
        smartViews: ToolItem[];
        formats: ToolItem[];
    }>({ tablets: [], smartViews: [], formats: [] });
    const [recentItems, setRecentItems] = useState<ToolItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            const recent = await toolService.getRecentItems();
            setRecentItems(recent);

            const searchResults = await toolService.search(searchQuery);
            setResults(searchResults);

            // Auto-select first item when searching or on mount
            setSelectedIndex(0);
        };
        loadData();
    }, [searchQuery]);

    // Focus search on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Flatten all items for keyboard navigation
    const allFlattenedItems = useMemo(() => {
        if (searchQuery === '') {
            return [
                ...recentItems,
                ...results.tablets,
                ...results.smartViews,
                ...results.formats,
            ];
        }
        return [
            ...results.tablets,
            ...results.smartViews,
            ...results.formats,
        ];
    }, [searchQuery, recentItems, results]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (allFlattenedItems.length || 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + (allFlattenedItems.length || 1)) % (allFlattenedItems.length || 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = allFlattenedItems[selectedIndex];
            if (selected) onSelect(selected);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const renderSection = (title: string, items: ToolItem[], layout: 'grid' | 'list') => {
        if (items.length === 0) return null;

        // Calculate global starting index for this section to handle selection across groups
        let sectionStartIndex = 0;
        if (title === 'Tablets') sectionStartIndex = recentItems.length;
        else if (title === 'Smart Views') sectionStartIndex = recentItems.length + results.tablets.length;
        else if (title === 'Formats') sectionStartIndex = recentItems.length + results.tablets.length + results.smartViews.length;

        return (
            <div className="mb-8">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold mb-3 px-1">
                    {title}
                </h2>
                <div className={layout === 'grid' ? "grid grid-cols-5 gap-3" : "flex flex-col gap-1"}>
                    {items.map((item, index) => (
                        <ToolCard
                            key={item.id}
                            item={item}
                            variant={layout}
                            isFocused={selectedIndex === sectionStartIndex + index}
                            onClick={() => onSelect(item)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] pb-10">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                className="relative w-full max-w-4xl mx-4 bg-surface border border-base rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-label="Tool Selector"
            >

                {/* Header/Search Area */}
                <div className="p-6 pb-4">
                    <div className="relative flex items-center">
                        <Search className="absolute left-5 text-muted" size={24} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="What do you want to do?"
                            className="w-full bg-surface-raised/50 border-0 border-b-2 border-transparent focus:border-focus rounded-2xl py-5 pl-14 pr-14 text-main text-2xl font-light transition-all outline-none placeholder:text-muted/50"
                        />
                        <button
                            onClick={onClose}
                            className="absolute right-4 p-2 text-muted hover:text-main hover:bg-element-hover rounded-xl transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
                    {searchQuery === '' ? (
                        <>
                            {renderSection('Recently Used', recentItems, 'grid')}
                            {renderSection('Tablets', results.tablets, 'list')}
                            {renderSection('Smart Views', results.smartViews, 'list')}
                            {renderSection('Formats', results.formats, 'list')}
                        </>
                    ) : (
                        <>
                            {renderSection('Tablets', results.tablets, 'list')}
                            {renderSection('Smart Views', results.smartViews, 'list')}
                            {renderSection('Formats', results.formats, 'list')}

                            {results.tablets.length === 0 && results.smartViews.length === 0 && results.formats.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-surface-secondary rounded-full flex items-center justify-center mb-6">
                                        <Search size={40} className="text-muted" />
                                    </div>
                                    <h3 className="text-main font-semibold text-xl">No tools match your search</h3>
                                    <p className="text-secondary mt-2">Try searching for keywords like "json", "jwt", or "uuid".</p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-base bg-surface-secondary/20 flex items-center justify-between text-[11px] text-muted font-medium">
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-surface border border-base rounded shadow-sm text-[10px]">↑↓</kbd>
                            <span>Navigate</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-surface border border-base rounded shadow-sm text-[10px]">↵</kbd>
                            <span>Select</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-surface border border-base rounded shadow-sm text-[10px]">esc</kbd>
                            <span>Close</span>
                        </span>
                    </div>
                    <div className="opacity-50">
                        Quick Actions Area
                    </div>
                </div>
            </div>
        </div>
    );
};
