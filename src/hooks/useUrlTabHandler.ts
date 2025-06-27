import { useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useRootStore } from '../stores/rootStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { Tab } from '../types';
import { languageRegistry } from '../languages/registry';
import { tabletRegistry } from '../tablets/registry';

/**
 * Generates a URL-friendly identifier from a tab title or uses the tab ID as a fallback.
 * Converts to lowercase, replaces problematic characters with hyphens, collapses multiple hyphens,
 * and trims leading/trailing hyphens.
 */
const generateUrlIdentifier = (tab: Tab | undefined): string => {
    if (!tab) return '';

    // For tablets, use the tablet ID
    if (tab.isTablet) {
        return tab.title.toLowerCase().replace(/\s+/g, '-');
    }

    // For language tabs, use the language name
    if (tab.language && tab.language !== 'plaintext') {
        return tab.language.toLowerCase();
    }

    // For other tabs, use a slugified version of the title
    return tab.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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

    const {
        tabs,
        activeLeftTabId,
        activeRightTabId,
        isSplit,
        activeSide,
        setActiveLeftTab,
        setActiveRightTab,
        setActiveSide,
        splitView,
        initialUrlProcessed,
    } = useRootStore(state => ({
        tabs: state.tabs,
        activeLeftTabId: state.splitView?.activeLeftTabId,
        activeRightTabId: state.splitView?.activeRightTabId,
        isSplit: state.splitView?.isSplit || false,
        activeSide: state.splitView?.activeSide || 'left',
        setActiveLeftTab: state.setActiveLeftTab,
        setActiveRightTab: state.setActiveRightTab,
        setActiveSide: state.setActiveSide,
        splitView: state.splitView,
        // Get the new flag from the store
        initialUrlProcessed: state.initialUrlProcessed,
    }));
    const { isLoading } = useWorkspaceStore();

    // Split view helpers
    const leftTabs = splitView?.leftTabs || [];
    const rightTabs = splitView?.rightTabs || [];

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
        const targetPath = targetUrlIdentifier ? `/${targetUrlIdentifier}` : '/';
        return targetPath;
    }

    // --- Effects ---

    // Effect 1: Handles STATE changes, updates URL
    useEffect(() => {
        // Completely disable URL handler when workspace is loading
        if (isLoading || !initialUrlProcessed) {
            return;
        }

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
            }
            stateUpdateTimeout.current = null; // Clear timeout reference
        }, 150);

    }, [activeLeftTabId, activeRightTabId, isSplit, activeSide, tabs, isLoading, initialUrlProcessed]); // Add the new flag to the dependency array.


    // Effect 2: Handles URL changes, updates STATE
    useEffect(() => {
        // Wait for workspace/tabs to finish loading before processing initial URL
        if (isLoading || !initialUrlProcessed) {
            return;
        }

        // If it's the initial render, just update the ref and return
        if (initialRender.current) {
            initialRender.current = false;
            prevUrlIdentifierParamRef.current = urlIdentifierParam;
            return;
        }

        // If the URL param hasn't actually changed, do nothing
        if (urlIdentifierParam === prevUrlIdentifierParamRef.current) {
            return;
        }

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
        }

        prevUrlIdentifierParamRef.current = urlIdentifierParam; // Update prev ref
        // Use a shorter timeout here just to release the lock
        setTimeout(() => {
            isProcessingUrlChange.current = false;
        }, 50);

    }, [urlIdentifierParam, isLoading, initialUrlProcessed]); // Add the new flag to the dependency array.

    // Cleanup
    useEffect(() => {
        return () => {
            if (stateUpdateTimeout.current) {
                clearTimeout(stateUpdateTimeout.current);
            }
        };
    }, []);
};

// Helper function to create a new tab from URL identifier
const createNewTabFromUrl = (urlIdentifier: string, workspaceId: string): Tab => {
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
            workspaceId: workspaceId || ''
        };
    }
    // Tablet
    const tablet = tabletRegistry.getById(urlIdentifier);
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
            workspaceId: workspaceId || ''
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
        workspaceId: workspaceId || ''
    };
};

export const handleInitialUrl = () => {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
        const urlIdentifier = pathSegments[0];

        const { tabs, setActiveLeftTab, addTab, setInitialUrlProcessed } = useRootStore.getState();
        const { activeWorkspaceId } = useWorkspaceStore.getState();

        const existingTab = tabs.find(tab => generateUrlIdentifier(tab) === urlIdentifier);

        if (existingTab) {
            setActiveLeftTab(existingTab.id);
        } else if (activeWorkspaceId) {
            const newTab = createNewTabFromUrl(urlIdentifier, activeWorkspaceId);
            addTab(newTab, false);
        }

        // Instead of a timeout, we now set a state flag.
        setInitialUrlProcessed(true);

    } else {
        // If there's no URL param, we can immediately say we're done.
        useRootStore.getState().setInitialUrlProcessed(true);
    }
};