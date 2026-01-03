import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from '../Icons';
import { toolSelectorService, ToolItem } from '../../services/toolSelectorService';
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
            const recent = await toolSelectorService.getRecentItems();
            setRecentItems(recent);

            const searchResults = await toolSelectorService.search(searchQuery);
            setResults(searchResults);
        };
        loadData();
    }, [searchQuery]);

    // Focus search on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Keyboard navigation
    const allFlattenedItems = [
        ...(searchQuery ? [] : recentItems),
        ...results.tablets,
        ...results.smartViews,
        ...results.formats,
    ];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % allFlattenedItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + allFlattenedItems.length) % allFlattenedItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = allFlattenedItems[selectedIndex];
            if (selected) handleSelect(selected);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const handleSelect = (item: ToolItem) => {
        toolSelectorService.recordUsage(item);
        onSelect(item);
    };

    const renderSection = (title: string, items: ToolItem[]) => {
        if (items.length === 0) return null;

        return (
            <div className="mb-8">
                <h2 className="text-secondary text-xs font-bold uppercase tracking-widest mb-4 px-1">
                    {title}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => {
                        const itemIndex = allFlattenedItems.indexOf(item);
                        return (
                            <ToolCard
                                key={`${item.type}:${item.id}`}
                                item={item}
                                onClick={() => handleSelect(item)}
                                isFocused={itemIndex === selectedIndex}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] pb-10"
            onKeyDown={handleKeyDown}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-canvas/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-4xl mx-4 bg-surface border border-base rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header/Search Area */}
                <div className="p-6 border-b border-base bg-surface-raised/50">
                    <div className="relative flex items-center">
                        <Search className="absolute left-4 text-muted" size={20} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSelectedIndex(0);
                            }}
                            placeholder="Search tools, tablets, and formats..."
                            className="w-full bg-surface border border-base rounded-xl py-4 pl-12 pr-12 text-main text-lg focus:ring-2 focus:ring-focus focus:border-focus transition-all outline-none shadow-sm placeholder:text-muted"
                        />
                        <button
                            onClick={onClose}
                            className="absolute right-4 p-2 text-secondary hover:text-main hover:bg-element-hover rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-themed">
                    {searchQuery === '' && renderSection('Recently Used', recentItems)}
                    {renderSection('Tablets', results.tablets)}
                    {renderSection('Smart Views', results.smartViews)}
                    {renderSection('Formats', results.formats)}

                    {allFlattenedItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mb-4">
                                <Search size={32} className="text-muted" />
                            </div>
                            <h3 className="text-main font-semibold text-lg">No tools found</h3>
                            <p className="text-secondary mt-1">Try searching for something else, or browse available tools above.</p>
                        </div>
                    )}
                </div>

                {/* Footer/Help */}
                <div className="px-6 py-3 border-t border-base bg-surface-secondary/30 flex items-center justify-between text-xs text-muted">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-element border border-base rounded flex items-center shadow-sm">↓</kbd>
                            <kbd className="px-1.5 py-0.5 bg-element border border-base rounded flex items-center shadow-sm">↑</kbd>
                            <span>to navigate</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-element border border-base rounded flex items-center shadow-sm">↵</kbd>
                            <span>to select</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-element border border-base rounded flex items-center shadow-sm">esc</kbd>
                            <span>to close</span>
                        </span>
                    </div>
                    <div>
                        Powered by Scratch Tabs Tools
                    </div>
                </div>
            </div>
        </div>
    );
};
