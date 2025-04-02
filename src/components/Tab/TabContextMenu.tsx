import React, {useRef, useState} from 'react';
import {useClickOutside} from '../../hooks/useClickOutside';
import {useRootStore} from "../../stores";
import {
    ChevronLeft,
    ChevronLeftSquare,
    ChevronRight,
    ChevronRightSquare, Copy, FileCode, GitCompare,
    Layers,
    Maximize, Split,
    XCircle
} from "lucide-react";
import {LanguageSelector} from "./LanguageSelector.tsx";
import {languageRegistry} from "../../languages";

// Define types for menu items
type MenuItem = {
    id: string;
    label: string;
    icon: React.ElementType;
    action: () => void;
    condition?: boolean; // Optional condition to show the item
    isSeparator?: boolean; // To render a separator
    submenu?: React.ReactNode; // For nested menus like languages
    showSubmenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    hideSubmenu?: () => void;
    submenuPosition?: {
        x: number,
        y: number
    },
    shouldShowSubmenu?: boolean
};

// Hook or function to generate menu configuration
// Ideally, conditions like canMoveRight would come directly from store selectors
const useContextMenuConfig = (tabId: string, isRightSide: boolean, onClose: (action?: 'compare') => void): MenuItem[] => {
    const store = useRootStore(); // Get necessary state and actions
    const [showLanguages, setShowLanguages] = useState(false);
    const [languagesPosition, setLanguagesPosition] = useState({x: 0, y: 0});

    // Calculate conditions (better if these are selectors in the store)
    const currentTabList = isRightSide ? store.splitView.rightTabs : store.splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);
    const canSplit = !store.splitView.isSplit && store.tabs.length >= 2;
    const canDuplicateAndSplit = !store.splitView.isSplit && store.tabs.length === 1;
    const canMoveRight = store.splitView.isSplit && !isRightSide && store.splitView.leftTabs.length > 1;
    const canMoveLeft = store.splitView.isSplit && isRightSide && store.splitView.rightTabs.length > 1;
    const canUnsplit = store.splitView.isSplit &&
        ((isRightSide && store.splitView.rightTabs.length === 1) ||
            (!isRightSide && store.splitView.leftTabs.length === 1));
    const currentTab = store.tabs.find(t => t.id === tabId);
    const canShowFromSample = currentTab && !currentTab.isTablet;
    // Determine if we can close tabs to the left or right
    const canCloseToLeft = tabIndex > 0;
    const canCloseToRight = tabIndex < currentTabList.length - 1;

    // Can close all except this tab if there are other tabs
    const canCloseAllExcept = currentTabList.length > 1;

    // Check if we can group tabs by type
    const canGroupTypes = (() => {
        // Need at least 3 tabs to make grouping meaningful
        if (currentTabList.length < 3) return false;

        // Get the languages of all tabs in the current list
        const tabLanguages = currentTabList.map(id => {
            const tab = store.tabs.find(t => t.id === id);
            return tab ? tab.language : '';
        });

        // Check if there are at least two different languages
        const uniqueLanguages = new Set(tabLanguages);
        if (uniqueLanguages.size < 2) return false;

        // Check if the tabs are already grouped by type
        let currentLanguage = tabLanguages[0];
        let languageChangePoints = 0;

        for (let i = 1; i < tabLanguages.length; i++) {
            if (tabLanguages[i] !== currentLanguage) {
                languageChangePoints++;
                currentLanguage = tabLanguages[i];
            }
        }

        // If we have more language changes than unique languages, they're not grouped
        return languageChangePoints > uniqueLanguages.size - 1;
    })();

    // Determine if we can compare with the other side
    const canCompare = (() => {
        if (!store.splitView.isSplit) return false;

        // Get the current tab and the active tab from the other side
        const currentTab = store.tabs.find(t => t.id === tabId);
        const otherSideTabId = isRightSide ? store.splitView.activeLeftTabId : store.splitView.activeRightTabId;
        const otherSideTab = store.tabs.find(t => t.id === otherSideTabId);

        // Can only compare if both tabs exist and neither is a tablet
        return currentTab && otherSideTab && !currentTab.isTablet && !otherSideTab.isTablet;
    })();

    const handleSimpleAction = (actionFn: (...args: any[]) => void, ...args: any[]) => {
        actionFn(...args);
        onClose();
    };

    const handleFromSample = (event: React.MouseEvent<HTMLButtonElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setLanguagesPosition({
            x: rect.right,
            y: rect.top
        });
        setShowLanguages(true);
    };

    const handleLanguageSelect = (languageId: string) => {
        const language = languageRegistry.getById(languageId);
        if (language && language.sampleContent) {
            const tab = store.tabs.find(t => t.id === tabId);
            if (tab && !tab.isTablet) {
                store.updateTabContent(tabId, language.sampleContent());
                store.updateTabLanguage(tabId, languageId, true);
            }
        }
        setShowLanguages(false);
        onClose();
    };

    const menuItems: MenuItem[] = [
        {
            id: 'fromSample', label: 'From sample', icon: FileCode, action: () => {
            },
            condition: canShowFromSample, submenu: <LanguageSelector onSelect={handleLanguageSelect}/>,
            showSubmenu: handleFromSample, hideSubmenu: () => {
                setShowLanguages(false)
            }, submenuPosition: languagesPosition, shouldShowSubmenu: showLanguages
        },
        {
            id: 'duplicate', label: 'Duplicate tab', icon: Copy,
            action: () => handleSimpleAction(store.duplicateTab, tabId, isRightSide),
        },
        {
            id: 'duplicateAndSplit', label: 'Duplicate and split', icon: Split,
            action: () => handleSimpleAction(store.duplicateAndSplitTab, tabId),
            condition: canDuplicateAndSplit
        },
        {
            id: 'compare', label: 'Compare with other side', icon: GitCompare,
            action: () => onClose('compare'),
            condition: canCompare
        },
        {
            id: 'groupTypes', label: 'Group tabs by type', icon: Layers,
            action: () => handleSimpleAction(store.groupTabsByType, isRightSide),
            condition: canGroupTypes
        },
        {id: 'sep1', isSeparator: true, condition: canSplit || canMoveRight || canMoveLeft || canUnsplit},
        {
            id: 'split', label: 'Split', icon: ChevronRight,
            action: () => handleSimpleAction(store.splitScreen, tabId),
            condition: canSplit,
        },
        {
            id: 'moveRight', label: 'Move right', icon: ChevronRight,
            action: () => handleSimpleAction(store.moveTabToRight, tabId),
            condition: canMoveRight,
        },
        {
            id: 'moveLeft', label: 'Move left', icon: ChevronLeft,
            action: () => handleSimpleAction(store.moveTabToLeft, tabId),
            condition: canMoveLeft,
        },
        {
            id: 'unsplit', label: 'Unsplit', icon: Maximize,
            action: () => handleSimpleAction(store.unsplitScreen, isRightSide),
            condition: canUnsplit,
        },
        {id: 'sep2', isSeparator: true, condition: canCloseToLeft || canCloseToRight || canCloseAllExcept},
        {
            id: 'closeAllExcept', label: 'Close all except this', icon: XCircle,
            action: () => handleSimpleAction(store.closeAllExcept, tabId, isRightSide),
            condition: canCloseAllExcept,
        },
        {
            id: 'closeAllLeft', label: 'Close tabs to the left', icon: ChevronLeftSquare,
            action: () => handleSimpleAction(store.closeTabsToLeft, tabId, isRightSide),
            condition: canCloseToLeft,
        },
        {
            id: 'closeAllRight', label: 'Close tabs to the right', icon: ChevronRightSquare,
            action: () => handleSimpleAction(store.closeTabsToRight, tabId, isRightSide),
            condition: canCloseToRight,
        },
    ];

    // Filter out items where condition is false, handle separators based on adjacent items
    const visibleItems: MenuItem[] = [];
    menuItems.forEach((item, index) => {
        if (item.condition === false) return; // Skip hidden items

        if (item.isSeparator) {
            // Only add separator if previous and next visible items exist and aren't separators
            const prevVisible = visibleItems[visibleItems.length - 1];
            const nextItem = menuItems.slice(index + 1).find(i => i.condition !== false && !i.isSeparator);
            if (prevVisible && !prevVisible.isSeparator && nextItem) {
                visibleItems.push(item);
            }
        } else {
            visibleItems.push(item);
        }
    });

    return visibleItems;
};

interface TabContextMenuProps {
    tabId: string;
    position: { x: number; y: number };
    onClose: (action?: 'compare') => void;
    isRightSide: boolean;
}

// Refactored TabContextMenu Component
export const TabContextMenu: React.FC<TabContextMenuProps> = ({tabId, position, onClose, isRightSide}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useClickOutside(menuRef, () => onClose()); // Use custom hook
    const menuConfig = useContextMenuConfig(tabId, isRightSide, onClose); // Get menu items

    return (
        <div
            ref={menuRef}
            className="absolute bg-gray-700 border border-gray-600 rounded shadow-lg z-50 py-1"
            style={{top: `${position.y}px`, left: `${position.x}px`, minWidth: "200px"}}
        >
            {menuConfig.map((item) => {
                if (item.isSeparator) {
                    return <div key={item.id} className="border-t border-gray-600 my-1"></div>;
                }

                return (
                    <>
                        <button
                            key={item.id}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs text-gray-200"
                            onClick={item.showSubmenu ? item.showSubmenu : item.action}
                            onMouseEnter={item.showSubmenu && ((e) => item.showSubmenu(e))}
                            onMouseLeave={item.hideSubmenu}
                        >
                            <item.icon size={14} className="mr-2 flex-shrink-0"/>
                            <span className="flex-1 truncate">{item.label}</span>
                        </button>
                        {item.shouldShowSubmenu && (
                            <div
                                className="absolute bg-gray-700 border border-gray-600 rounded shadow-lg py-1 left-full top-0 min-w-[150px]"
                                style={{
                                    left: item.submenuPosition.x - position.x,
                                    top: item.submenuPosition.y - position.y,
                                }}
                            >
                                item.submenu
                            </div>
                        )
                        }
                    </>
                );
            })}
        </div>
    );
};