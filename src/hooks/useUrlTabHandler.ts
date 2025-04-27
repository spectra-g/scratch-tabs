import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRootStore } from '../stores';
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
    let identifier = tab.title
        .toLowerCase()
        .replace(/[\s_.,; T#%/[\]{}()]+/g, '-')
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

    // Select relevant state and actions from the Zustand store.
    // Assumes splitView state includes an `activeSide` property and the store
    // provides an `setActiveSide` action.
    const {
        tabs,
        activeLeftTabId,
        activeRightTabId,
        isSplit,
        activeSide,
        setActiveLeftTab,
        setActiveRightTab,
        setActiveSide,
        addTab,
    } = useRootStore(state => ({
        tabs: state.tabs,
        activeLeftTabId: state.splitView.activeLeftTabId,
        activeRightTabId: state.splitView.activeRightTabId,
        isSplit: state.splitView.isSplit,
        activeSide: state.splitView.activeSide,
        setActiveLeftTab: state.setActiveLeftTab,
        setActiveRightTab: state.setActiveRightTab,
        setActiveSide: state.setActiveSide,
        addTab: state.addTab,
    }));

    const initialRender = useRef(true);
    const prevUrlIdentifierParamRef = useRef<string | undefined>(urlIdentifierParam);
    // Flag to prevent state->URL updates immediately after a URL->state update cycle
    // to avoid potential infinite loops.
    const didUrlSyncCauseStateChangeRef = useRef(false);

    useEffect(() => {
        // Skip synchronization logic on the initial render.
        if (initialRender.current) {
            initialRender.current = false;
            prevUrlIdentifierParamRef.current = urlIdentifierParam;
            return;
        }

        const currentPath = location.pathname;
        const prevUrlIdentifierParam = prevUrlIdentifierParamRef.current;

        let stateChangedByUrlSync = false;

        // --- Phase 1: Synchronize URL changes TO Application State ---
        if (urlIdentifierParam !== prevUrlIdentifierParam) {
            let candidateTab: Tab | undefined = undefined;
            if (urlIdentifierParam) {
                 const normalizedParam = urlIdentifierParam.toLowerCase();
                 // Find tab matching the URL identifier (prioritize generated ID)
                 candidateTab = tabs.find(tab => generateUrlIdentifier(tab) === urlIdentifierParam);
                 if (!candidateTab) {
                    candidateTab = tabs.find(tab =>
                        tab.id === urlIdentifierParam ||
                        tab.title.toLowerCase() === normalizedParam ||
                        tab.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedParam.replace(/[^a-z0-9]/g, '')
                        // Consider adding other specific matching logic if needed
                    );
                 }
            }

            if (candidateTab) {
                const isActiveLeft = candidateTab.id === activeLeftTabId;
                const isActiveRight = isSplit && candidateTab.id === activeRightTabId;
                // Determine which side the tab is *likely* focused on based on current state.
                // This assumes if it's active right, the focus should be right.
                const likelySide = (isActiveRight) ? 'right' : 'left';

                // Update state only if necessary to match the URL's intent
                if (likelySide === 'left') {
                    if (!isActiveLeft) {
                        setActiveLeftTab(candidateTab.id);
                        stateChangedByUrlSync = true;
                    }
                    if (activeSide !== 'left') {
                        setActiveSide('left');
                        // Changing activeSide usually reflects focus derived from URL,
                        // might not need to block the next State->URL sync unless activation also happened.
                    }
                } else { // likelySide === 'right'
                    if (isSplit && !isActiveRight) {
                        setActiveRightTab(candidateTab.id);
                        stateChangedByUrlSync = true;
                    }
                    if (activeSide !== 'right') {
                         setActiveSide('right');
                    }
                }
            } else if (urlIdentifierParam) {
                 // No existing tab matches the URL. Create one:
                 const newTab = createNewTab(urlIdentifierParam);
                 addTab(newTab, false);
                 setActiveLeftTab(newTab.id);
                 stateChangedByUrlSync = true;
            } else {
                 // Navigated to root '/'. Ensure focus is on the left side.
                 if (activeSide !== 'left') {
                     setActiveSide('left');
                 }
            }
        }
        // Update ref for the next comparison AFTER checking changes
        prevUrlIdentifierParamRef.current = urlIdentifierParam;

        // --- Anti-Loop Check ---
        // Prevent running State->URL logic immediately after URL->State logic modified state
        if (stateChangedByUrlSync) {
            didUrlSyncCauseStateChangeRef.current = true;
            return;
        }
        if (didUrlSyncCauseStateChangeRef.current) {
            didUrlSyncCauseStateChangeRef.current = false;
            return;
        }

        // --- Phase 2: Synchronize Application State changes TO URL ---
        // Determine the target tab based on the explicitly tracked active side
        let targetTabId: string | null = null;
        if (activeSide === 'left') {
            targetTabId = activeLeftTabId;
        } else if (activeSide === 'right' && isSplit) {
            targetTabId = activeRightTabId;
        } else if (activeSide === 'right' && !isSplit) {
            // If focus was right but split view turned off, URL should reflect left tab
            targetTabId = activeLeftTabId;
        } else {
            // Default to left tab if activeSide is somehow invalid
            targetTabId = activeLeftTabId;
        }

        // Generate the URL path for the target tab
        const targetTab = targetTabId ? tabs.find(t => t.id === targetTabId) : undefined;
        const targetUrlIdentifier = generateUrlIdentifier(targetTab);
        const targetPath = targetUrlIdentifier ? `/${targetUrlIdentifier}` : '/'; // Default to root

        // Update the browser URL if it doesn't match the target path
        if (targetPath !== currentPath) {
            navigate(targetPath, { replace: true });
        }

    }, [
        // State dependencies from store
        tabs,
        activeLeftTabId,
        activeRightTabId,
        isSplit,
        activeSide,
        // Router dependencies
        urlIdentifierParam,
        location.pathname,
        // Actions/Functions used
        navigate,
        setActiveLeftTab,
        setActiveRightTab,
        setActiveSide,
        addTab,
    ]);

     // Helper function to create a new tab object (potentially used in Phase 1)
     const createNewTab = (identifier: string): Tab => {
        if (!identifier) identifier = 'untitled'; // Ensure a fallback identifier

        // Check registries for specific tab types
        if (languageRegistry.getById(identifier)) {
            return {
                id: crypto.randomUUID(), title: `New ${identifier} Tab`, content: '',
                language: identifier, languageLocked: true, lastModified: Date.now(), dateCreated: Date.now(),
                cursorPosition: { lineNumber: 1, column: 1 }, isTablet: false
            };
        }
        if (tabletRegistry.getById(identifier)) {
            const tablet = tabletRegistry.getById(identifier)!;
            const state = tablet.createInitialState();
            return {
                id: crypto.randomUUID(), title: tablet.label, content: '',
                language: 'plaintext', languageLocked: true, isTablet: true,
                tabletState: tablet.serializeState(state), lastModified: Date.now(), dateCreated: Date.now(),
                cursorPosition: { lineNumber: 1, column: 1 }
            };
        }

        // Default plain text tab
        let title = identifier.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (!title || title.length > 50) title = 'Untitled Tab'; // Sanitize title
        return {
            id: crypto.randomUUID(), title: title, content: '',
            language: 'plaintext', languageLocked: false, lastModified: Date.now(), dateCreated: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 }, isTablet: false
        };
    };

    // This hook performs side effects and doesn't need to return values.
};