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
        documents: ToolItem[];
        tablets: ToolItem[];
        smartViews: ToolItem[];
        formats: ToolItem[];
    }>({ documents: [], tablets: [], smartViews: [], formats: [] });
    const [recentItems, setRecentItems] = useState<ToolItem[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const focusedItemRef = useRef<HTMLButtonElement>(null);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            const recent = await toolService.getRecentItems();
            setRecentItems(recent);

            const searchResults = await toolService.search(searchQuery);
            setResults({ documents: [], ...searchResults });

            // Auto-select first item when searching or on mount
            setSelectedIndex(0);
        };
        loadData();
    }, [searchQuery]);

    // Focus search on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Scroll focused item into view
    useEffect(() => {
        if (focusedItemRef.current && typeof focusedItemRef.current.scrollIntoView === 'function') {
            focusedItemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [selectedIndex]);

    // Flatten all items for keyboard navigation with metadata about their sections
    const { allFlattenedItems, sectionInfo } = useMemo(() => {
        const items: ToolItem[] = [];
        const sections: Array<{ startIndex: number; count: number; layout: 'grid' | 'list'; gridColumns?: number }> = [];

        if (searchQuery === '') {
            // Recently Used section (grid)
            if (recentItems.length > 0) {
                sections.push({ startIndex: items.length, count: recentItems.length, layout: 'grid', gridColumns: 5 });
                items.push(...recentItems);
            }
            if (results.documents.length > 0) {
                sections.push({ startIndex: items.length, count: results.documents.length, layout: 'list' });
                items.push(...results.documents);
            }
            // Tablets section (list)
            if (results.tablets.length > 0) {
                sections.push({ startIndex: items.length, count: results.tablets.length, layout: 'list' });
                items.push(...results.tablets);
            }
            // Smart Views section (list)
            if (results.smartViews.length > 0) {
                sections.push({ startIndex: items.length, count: results.smartViews.length, layout: 'list' });
                items.push(...results.smartViews);
            }
            // Formats section (list)
            if (results.formats.length > 0) {
                sections.push({ startIndex: items.length, count: results.formats.length, layout: 'list' });
                items.push(...results.formats);
            }
        } else {
            // Search results (all list layout)
            if (results.documents.length > 0) {
                sections.push({ startIndex: items.length, count: results.documents.length, layout: 'list' });
                items.push(...results.documents);
            }
            if (results.tablets.length > 0) {
                sections.push({ startIndex: items.length, count: results.tablets.length, layout: 'list' });
                items.push(...results.tablets);
            }
            if (results.smartViews.length > 0) {
                sections.push({ startIndex: items.length, count: results.smartViews.length, layout: 'list' });
                items.push(...results.smartViews);
            }
            if (results.formats.length > 0) {
                sections.push({ startIndex: items.length, count: results.formats.length, layout: 'list' });
                items.push(...results.formats);
            }
        }

        return { allFlattenedItems: items, sectionInfo: sections };
    }, [searchQuery, recentItems, results]);

    // Helper to find which section an index belongs to
    const getSectionForIndex = (index: number) => {
        return sectionInfo.find(section =>
            index >= section.startIndex && index < section.startIndex + section.count
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (allFlattenedItems.length === 0) return;

        const currentSection = getSectionForIndex(selectedIndex);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!currentSection) {
                setSelectedIndex(0);
                return;
            }

            if (currentSection.layout === 'grid' && currentSection.gridColumns) {
                // For grid: move down by gridColumns
                const newIndex = selectedIndex + currentSection.gridColumns;
                const sectionEnd = currentSection.startIndex + currentSection.count;

                if (newIndex < sectionEnd) {
                    // Stay within current section
                    setSelectedIndex(newIndex);
                } else {
                    // Move to next section's first item
                    const nextSectionIndex = sectionInfo.indexOf(currentSection) + 1;
                    if (nextSectionIndex < sectionInfo.length) {
                        setSelectedIndex(sectionInfo[nextSectionIndex].startIndex);
                    } else {
                        // Wrap to beginning
                        setSelectedIndex(0);
                    }
                }
            } else {
                // For list: move to next item
                const newIndex = selectedIndex + 1;
                if (newIndex < allFlattenedItems.length) {
                    setSelectedIndex(newIndex);
                } else {
                    setSelectedIndex(0); // Wrap around
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!currentSection) {
                setSelectedIndex(0);
                return;
            }

            if (currentSection.layout === 'grid' && currentSection.gridColumns) {
                // For grid: move up by gridColumns
                const newIndex = selectedIndex - currentSection.gridColumns;

                if (newIndex >= currentSection.startIndex) {
                    // Stay within current section
                    setSelectedIndex(newIndex);
                } else {
                    // Move to previous section's last item
                    const prevSectionIndex = sectionInfo.indexOf(currentSection) - 1;
                    if (prevSectionIndex >= 0) {
                        const prevSection = sectionInfo[prevSectionIndex];
                        setSelectedIndex(prevSection.startIndex + prevSection.count - 1);
                    } else {
                        // Wrap to end
                        setSelectedIndex(allFlattenedItems.length - 1);
                    }
                }
            } else {
                // For list: move to previous item
                const newIndex = selectedIndex - 1;
                if (newIndex >= 0) {
                    setSelectedIndex(newIndex);
                } else {
                    setSelectedIndex(allFlattenedItems.length - 1); // Wrap around
                }
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (!currentSection || currentSection.layout !== 'grid') return;

            // For grid: move left
            const posInSection = selectedIndex - currentSection.startIndex;
            if (posInSection % (currentSection.gridColumns || 1) > 0) {
                setSelectedIndex(selectedIndex - 1);
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (!currentSection || currentSection.layout !== 'grid') return;

            // For grid: move right
            const posInSection = selectedIndex - currentSection.startIndex;
            const sectionEnd = currentSection.startIndex + currentSection.count;
            if ((posInSection + 1) % (currentSection.gridColumns || 1) !== 0 && selectedIndex + 1 < sectionEnd) {
                setSelectedIndex(selectedIndex + 1);
            }
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

        // Find the section start index by searching for the first item
        const firstItemIndex = allFlattenedItems.indexOf(items[0]);
        const sectionStartIndex = firstItemIndex >= 0 ? firstItemIndex : 0;

        return (
            <div className="mb-8">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-muted/70 font-bold mb-3 px-1 relative before:absolute before:left-0 before:bottom-[-4px] before:w-8 before:h-0.5 before:bg-primary/30 before:rounded-full">
                    {title}
                </h2>
                <div className={layout === 'grid' ? "grid grid-cols-5 gap-3" : "flex flex-col gap-1"}>
                    {items.map((item, index) => {
                        const isFocused = selectedIndex === sectionStartIndex + index;
                        return (
                            <ToolCard
                                key={item.id}
                                item={item}
                                variant={layout}
                                isFocused={isFocused}
                                onClick={() => onSelect(item)}
                                ref={isFocused ? focusedItemRef : null}
                            />
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-command flex items-start justify-center pt-[10vh] pb-10">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                className="relative w-full max-w-4xl mx-4 bg-surface border border-base rounded-3xl shadow-2xl backdrop-blur-xl ring-1 ring-white/5 flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
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
                            className="w-full bg-surface-raised/50 border-0 rounded-2xl py-5 pl-14 pr-14 text-main text-2xl font-light transition-all outline-none placeholder:text-muted/50 focus:bg-surface-raised focus:ring-2 focus:ring-primary/20 focus:shadow-lg"
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
                            {renderSection('Documents', results.documents, 'list')}
                            {renderSection('Tablets', results.tablets, 'list')}
                            {renderSection('Smart Views', results.smartViews, 'list')}
                            {renderSection('Formats', results.formats, 'list')}
                        </>
                    ) : (
                        <>
                            {renderSection('Documents', results.documents, 'list')}
                            {renderSection('Tablets', results.tablets, 'list')}
                            {renderSection('Smart Views', results.smartViews, 'list')}
                            {renderSection('Formats', results.formats, 'list')}

                            {results.documents.length === 0 && results.tablets.length === 0 && results.smartViews.length === 0 && results.formats.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-20 h-20 bg-gradient-to-br from-surface-secondary to-surface-raised rounded-full flex items-center justify-center mb-6 shadow-inner">
                                        <Search size={40} className="text-muted/50" />
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
                            <kbd className="px-1.5 py-0.5 bg-gradient-to-b from-surface to-surface-secondary/50 border border-base rounded shadow-sm text-[10px] font-mono">↑↓←→</kbd>
                            <span>Navigate</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-gradient-to-b from-surface to-surface-secondary/50 border border-base rounded shadow-sm text-[10px] font-mono">↵</kbd>
                            <span>Select</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-gradient-to-b from-surface to-surface-secondary/50 border border-base rounded shadow-sm text-[10px] font-mono">esc</kbd>
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
