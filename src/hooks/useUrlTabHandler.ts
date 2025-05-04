import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRootStore } from '../stores';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { languageRegistry } from '../languages';
import { tabletRegistry } from '../tablets';
import { Tab } from '../types';

/**
 * Generates a URL-friendly identifier from a tab title or uses the tab ID as a fallback.
 * Converts to lowercase, replaces problematic characters with hyphens, collapses multiple hyphens,
 * and trims leading/trailing hyphens.
 */
const generateUrlIdentifier = (tab: Tab | undefined): string => {
    if (!tab) return '';
    const identifier = tab.title
        .toLowerCase()
        .replace(/[\s_.,; T#%/\[\]{}()]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    return identifier || tab.id;
};

/**
 * Custom hook to synchronize application tab state (active tabs, focused side)
 * with the browser URL using React Router. It listens to URL changes to update
 * the state and listens to state changes to update the URL.
 * It relies on an `activeSide: 'left' | 'right'` property in the global state
 * to determine which tab should primarily dictate the URL.
 */
export const useUrlTabHandler = () => {
    const { identifier: urlIdentifierParam } = useParams<{ identifier?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Zustand stores
    const {
        tabs,
        splitView,
        setActiveLeftTab,
        setActiveRightTab,
        setActiveSide,
        addTab,
    } = useRootStore(state => ({
        tabs: state.tabs,
        splitView: state.splitView,
        setActiveLeftTab: state.setActiveLeftTab,
        setActiveRightTab: state.setActiveRightTab,
        setActiveSide: state.setActiveSide,
        addTab: state.addTab,
    }));
    const { activeWorkspaceId } = useWorkspaceStore();

    // Split view helpers
    const isSplit = splitView?.isSplit;
    const leftTabs = splitView?.leftTabs || [];
    const rightTabs = splitView?.rightTabs || [];
    const activeLeftTabId = splitView?.activeLeftTabId;
    const activeRightTabId = splitView?.activeRightTabId;
    const activeSide = splitView?.activeSide;

    // Refs for effect control
    const initialRender = useRef(true);
    const prevUrlIdentifierParamRef = useRef<string | undefined>(urlIdentifierParam);
    const isProcessingUrlChange = useRef(false);
    const isUserNavigation = useRef(true); // True if user-initiated
    const stateUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Modularized helpers ---

    // 1. Find tab by URL identifier, prioritizing left, then right, only left if not split
    function findTabByUrlIdentifier(urlIdentifier: string | undefined): { tab: Tab | undefined, side: 'left' | 'right' | null } {
        if (!urlIdentifier) return { tab: undefined, side: null };
        const normalizedParam = urlIdentifier.toLowerCase();
        // Check left tabs first
        const leftTab = tabs.find(tab => leftTabs.includes(tab.id) && (
            tab.title.toLowerCase() === normalizedParam ||
            generateUrlIdentifier(tab) === urlIdentifier ||
            tab.id === urlIdentifier
        ));
        if (leftTab) return { tab: leftTab, side: 'left' };
        // If split, check right tabs
        if (isSplit) {
            const rightTab = tabs.find(tab => rightTabs.includes(tab.id) && (
                tab.title.toLowerCase() === normalizedParam ||
                generateUrlIdentifier(tab) === urlIdentifier ||
                tab.id === urlIdentifier
            ));
            if (rightTab) return { tab: rightTab, side: 'right' };
        }
        // Not found
        return { tab: undefined, side: null };
    }

    // 2. Find tablet by id/label/keyword
    function findTabletByUrlIdentifier(urlIdentifier: string): any | undefined {
        const normalizedParam = urlIdentifier.toLowerCase();
        let tablet = tabletRegistry.getById(normalizedParam);
        if (!tablet) {
            const allTablets = tabletRegistry.getAll();
            tablet = allTablets.find(t => {
                if (t.id === normalizedParam) return true;
                if (generateUrlIdentifier({
                    id: t.id, title: t.label, content: '', language: 'plaintext', languageLocked: false, cursorPosition: { lineNumber: 0, column: 0 }, isTablet: true, dateCreated: Date.now(), lastModified: Date.now(), workspaceId: activeWorkspaceId || ''
                }) === normalizedParam) return true;
                return t.keywords.some(keyword => generateUrlIdentifier({
                    id: t.id, title: keyword, content: '', language: 'plaintext', languageLocked: false, cursorPosition: { lineNumber: 0, column: 0 }, isTablet: true, dateCreated: Date.now(), lastModified: Date.now(), workspaceId: activeWorkspaceId || ''
                }) === normalizedParam);
            });
        }
        return tablet;
    }

    // 3. Create new tab (language, tablet, or plaintext)
    function createNewTabFromUrl(urlIdentifier: string): Tab {
        // Language
        const language = languageRegistry.getById(urlIdentifier);
        if (language) {
            return {
                id: crypto.randomUUID(),
                title: `New ${urlIdentifier} Tab`,
                content: language.sampleContent ? language.sampleContent() : '',
                language: urlIdentifier,
                languageLocked: true,
                lastModified: Date.now(),
                dateCreated: Date.now(),
                cursorPosition: { lineNumber: 1, column: 1 },
                isTablet: false,
                workspaceId: activeWorkspaceId || ''
            };
        }
        // Tablet
        const tablet = findTabletByUrlIdentifier(urlIdentifier);
        if (tablet) {
            const state = tablet.createInitialState();
            return {
                id: crypto.randomUUID(),
                title: tablet.label,
                content: '',
                language: 'plaintext',
                languageLocked: true,
                isTablet: true,
                tabletState: tablet.serializeState(state),
                lastModified: Date.now(),
                dateCreated: Date.now(),
                cursorPosition: { lineNumber: 1, column: 1 },
                workspaceId: activeWorkspaceId || ''
            };
        }
        // Plaintext fallback
        let title = urlIdentifier.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (!title || title.length > 50) title = 'Untitled Tab';
        return {
            id: crypto.randomUUID(),
            title: title,
            content: '',
            language: 'plaintext',
            languageLocked: false,
            lastModified: Date.now(),
            dateCreated: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
            isTablet: false,
            workspaceId: activeWorkspaceId || ''
        };
    }

    // 4. Activate tab on correct side
    function activateTab(tab: Tab, side: 'left' | 'right' | null) {
        if (side === 'left') {
            setActiveLeftTab(tab.id);
            setActiveSide('left');
        } else if (side === 'right') {
            setActiveRightTab(tab.id);
            setActiveSide('right');
        } else {
            // Default to left
            setActiveLeftTab(tab.id);
            setActiveSide('left');
        }
    }

    // 5. Get target tab for URL update
    function getTargetTabId(): string | null {
        if (activeSide === 'left') return activeLeftTabId;
        if (activeSide === 'right' && isSplit) return activeRightTabId;
        if (activeSide === 'right' && !isSplit) return activeLeftTabId;
        return activeLeftTabId;
    }

    // 6. Get target path for URL update
    function getTargetPath(): string {
        const targetTabId = getTargetTabId();
        const targetTab = targetTabId ? tabs.find(t => t.id === targetTabId) : undefined;
        const targetUrlIdentifier = generateUrlIdentifier(targetTab);
        return targetUrlIdentifier ? `/${targetUrlIdentifier}` : '/';
    }

    // --- Effects ---

    // Effect 1: Handles STATE changes, updates URL
    useEffect(() => {
        if (isProcessingUrlChange.current) {
            return; // Don't run if the other effect is actively processing a URL change
        }

        // Debounce state updates slightly to avoid rapid changes
        if (stateUpdateTimeout.current) clearTimeout(stateUpdateTimeout.current);

        stateUpdateTimeout.current = setTimeout(() => {
            const currentPath = location.pathname;
            const targetPath = getTargetPath(); // Calculates path based on current state (active tab or '/')

            if (targetPath !== currentPath) {
                isUserNavigation.current = false; // Mark as app navigation BEFORE navigating
                navigate(targetPath, { replace: true });
                // No need for a timeout to reset isUserNavigation here, the URL effect handles it
            }
            stateUpdateTimeout.current = null; // Clear timeout reference
        }, 150); // Slightly increased debounce

    }, [activeLeftTabId, activeRightTabId, isSplit, activeSide, tabs, leftTabs, rightTabs, activeWorkspaceId, navigate, location.pathname, getTargetPath]); // Added navigate, location.pathname, getTargetPath


    // Effect 2: Handles URL changes, updates STATE
    useEffect(() => {
        // If it's the initial render, just set the prev ref
        if (initialRender.current) {
            initialRender.current = false;
            prevUrlIdentifierParamRef.current = urlIdentifierParam;
             // Let state effect handle initial sync if needed
            return;
        }

        // If the URL param hasn't actually changed, do nothing
        if (urlIdentifierParam === prevUrlIdentifierParamRef.current) {
             return;
        }

        // --- This is the crucial part ---
        // If isUserNavigation is false, it means the state effect just caused the navigation.
        // We should only update the prev ref and reset the flag.
        if (!isUserNavigation.current) {
            prevUrlIdentifierParamRef.current = urlIdentifierParam;
            isUserNavigation.current = true; // Reset for next potential user navigation
            return; // DO NOT proceed to find/create tab
        }

        // --- If we reach here, it's a USER navigation to a NEW URL ---
        isProcessingUrlChange.current = true; // Prevent state effect from interfering
        if (stateUpdateTimeout.current) {
             clearTimeout(stateUpdateTimeout.current); // Cancel pending state updates
             stateUpdateTimeout.current = null;
        }

        // 1. Try to find existing tab matching the new URL
        const { tab, side } = findTabByUrlIdentifier(urlIdentifierParam);

        if (tab) {
            activateTab(tab, side);
        } else if (urlIdentifierParam) {
            // Prevent creation if no tabs exist (e.g., after closing last tab and URL is '/')
            if (tabs.length === 0 && !urlIdentifierParam) {
//                  console.log('[URL Effect] No tabs exist and URL is root, doing nothing.');
            } else {
                // 2. Try to create a new tab (Tablet, Language, or Plaintext)
                const newTab = createNewTabFromUrl(urlIdentifierParam);
                // Determine which side to add to (default to left or based on current focus?)
                const targetSide = isSplit && activeSide === 'right' ? 'right' : 'left';
                addTab(newTab, targetSide === 'right');
                activateTab(newTab, targetSide); // Activate the newly created tab
            }
        } else {
             // This handles navigation to '/'
        }

        prevUrlIdentifierParamRef.current = urlIdentifierParam; // Update prev ref
        // Use a shorter timeout here just to release the lock
        setTimeout(() => {
             isProcessingUrlChange.current = false;
         }, 50);

    }, [urlIdentifierParam]); // Rerun only when the urlIdentifierParam changes


    // Cleanup
    useEffect(() => {
        return () => {
            if (stateUpdateTimeout.current) {
                clearTimeout(stateUpdateTimeout.current);
            }
        };
    }, []);
};