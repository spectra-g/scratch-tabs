import React, { useState, useRef, useEffect } from 'react';
import { useRootStore } from '../../stores';
import { TabletSelector } from '../../tablets';
import { TabItem } from "./TabItem";
import { TabContextMenu } from "./TabContextMenu";
import { TabActions } from './TabActions';

interface TabBarProps {
  side?: 'left' | 'right';
  onOpenDiffModal: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ side = 'left', onOpenDiffModal }) => {
    const {
        tabs,
        splitView,
        removeTab,
        updateTabTitle,
        setActiveLeftTab,
        setActiveRightTab,
        addTab,
        canAddNewTab,
    } = useRootStore();

    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
    const [showTabletSelector, setShowTabletSelector] = useState(false);
    const [tabletSelectorPosition, setTabletSelectorPosition] = useState({x: 0, y: 0});

    const inputRef = useRef<HTMLInputElement>(null);
    const tabBarRef = useRef<HTMLDivElement>(null);
    const tabletButtonRef = useRef<HTMLButtonElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const tabletSelectorTabBarRef = useRef<HTMLDivElement>(null);

    const isRightSide = side === 'right';
    const tabIds = isRightSide ? splitView.rightTabs : splitView.leftTabs;

    const tabsKey = tabIds.join('-');

    const visibleTabs = tabIds.map(id => tabs.find(tab => tab.id === id)).filter(Boolean) as typeof tabs;
    const activeSideTabId = isRightSide ? splitView.activeRightTabId : splitView.activeLeftTabId;

    const getTabLineCount = (content: string): number => {
        return content.split('\n').length;
    };

    const tabLineCounts = tabs.filter(tab => tab.isTablet != true).map(tab => getTabLineCount(tab.content));
    const maxLineCount = Math.max(...tabLineCounts, 1);

    useEffect(() => {
        if (!showTabletSelector) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (tabletSelectorTabBarRef.current && !tabletSelectorTabBarRef.current.contains(event.target as Node)) {
                if (tabletButtonRef.current && !tabletButtonRef.current.contains(event.target as Node)) {
                    setShowTabletSelector(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTabletSelector]);

    useEffect(() => {
        const updateTabWidths = () => {
            if (!tabsContainerRef.current) return;

            const container = tabsContainerRef.current;
            const containerWidth = container.offsetWidth;
            const numTabs = visibleTabs.length;

            if (numTabs < 7) return;

            const actionButtonsWidth = 0;
            const availableWidth = containerWidth - actionButtonsWidth;

            const minTabWidth = 5;

            let tabWidth = availableWidth / numTabs;

            tabWidth = Math.max(tabWidth, minTabWidth);

            const tabs = container.getElementsByClassName('tab-item');
            Array.from(tabs).forEach((tab: Element) => {
                (tab as HTMLElement).style.width = `${tabWidth}px`;
                (tab as HTMLElement).style.minWidth = `${minTabWidth}px`;
                (tab as HTMLElement).style.maxWidth = `${tabWidth}px`;
            });
        };

        updateTabWidths();
        window.addEventListener('resize', updateTabWidths);

        return () => window.removeEventListener('resize', updateTabWidths);
    }, [visibleTabs.length]);

    useEffect(() => {
        if (editingTabId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingTabId]);

    const handleDoubleClick = (tab: { id: string; title: string }, e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'SPAN' && target.textContent === tab.title) {
            setEditingTabId(tab.id);
            setEditingTitle(tab.title);
        } else {
            handleCreateNewTab();
        }

        e.stopPropagation();
    };

    const handleCreateNewTab = () => {
        if (!canAddNewTab(isRightSide)) {
            return;
        }

        const newTabId = crypto.randomUUID();
        addTab({
            id: newTabId,
            title: `new ${tabs.length + 1}`,
            content: '',
            language: 'plaintext',
            languageLocked: false,
            cursorPosition: {
                lineNumber: 1,
                column: 1
            }
        }, isRightSide);
    };

    const handleInputBlur = () => {
        if (editingTabId && editingTitle.trim()) {
            updateTabTitle(editingTabId, editingTitle.trim());
        }
        setEditingTabId(null);
    };

    const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        setContextMenu({tabId, x: e.clientX, y: e.clientY});
    };

    const handleContextMenuClose = (action?: 'compare') => {
        if (action === 'compare' && contextMenu) {
            onOpenDiffModal();
        }
        setContextMenu(null);
    };

    const handleTabClick = (tabId: string) => {
        if (isRightSide) {
            setActiveRightTab(tabId);
        } else {
            setActiveLeftTab(tabId);
        }
    };

    const handleEmptyAreaDoubleClick = (e: React.MouseEvent) => {
        if (e.currentTarget === e.target) {
            handleCreateNewTab();
        }
    };

    const handleTabletSelect = (tablet: any) => {
        const state = tablet.createInitialState();
        const serializedState = tablet.serializeState(state);

        addTab({
            id: crypto.randomUUID(),
            title: tablet.label,
            content: '',
            language: 'plaintext',
            languageLocked: false,
            isTablet: true,
            tabletState: serializedState,
            cursorPosition: {
                lineNumber: 1,
                column: 1
            }
        }, side === 'right');

        setShowTabletSelector(false);
    };

    return (
        <>
            <div
                ref={tabBarRef}
                className="flex bg-gray-800 text-gray-300 w-full h-8 overflow-hidden"
                key={tabsKey}
            >
                <div
                    ref={tabsContainerRef}
                    className="flex-1 flex min-w-0 overflow-hidden"
                    onDoubleClick={handleEmptyAreaDoubleClick}
                >
                    {visibleTabs.map(tab => (
                        <TabItem
                            key={tab.id}
                            tab={tab}
                            isActive={activeSideTabId === tab.id}
                            isEditing={editingTabId === tab.id}
                            editingTitle={editingTitle}
                            maxLineCount={maxLineCount}
                            onClick={handleTabClick}
                            onClose={(tabId, e) => {
                                removeTab(tabId);
                            }}
                            onDoubleClick={handleDoubleClick}
                            onContextMenu={(tabId, e) => handleContextMenu(e, tabId)}
                            onEditChange={setEditingTitle}
                            onEditSubmit={handleInputBlur}
                            onEditCancel={() => setEditingTabId(null)}
                        />
                    ))}
                </div>

                <TabActions
                    side={side}
                    onShowTabletSelector={() => {
                        if (tabletButtonRef.current) {
                            if (showTabletSelector) {
                                setShowTabletSelector(false);
                            } else {
                                const rect = tabletButtonRef.current.getBoundingClientRect();
                                setTabletSelectorPosition({
                                    x: rect.left,
                                    y: rect.bottom + 4
                                });
                                setShowTabletSelector(true);
                            }
                        }
                    }}
                    tabletButtonRef={tabletButtonRef}
                />
            </div>

            {showTabletSelector && (
                <div
                    ref={tabletSelectorTabBarRef}
                    style={{
                        position: 'fixed',
                        left: tabletSelectorPosition.x - 255,
                        top: tabletSelectorPosition.y,
                        zIndex: 50
                    }}
                >
                    <TabletSelector
                        searchQuery=""
                        onSelect={handleTabletSelect}
                        onClose={() => setShowTabletSelector(false)}
                        showSearch={true}
                    />
                </div>
            )}

            {contextMenu && (
                <TabContextMenu
                    tabId={contextMenu.tabId}
                    position={{x: contextMenu.x, y: contextMenu.y}}
                    onClose={handleContextMenuClose}
                    isRightSide={isRightSide}
                />
            )}
        </>
    );
};