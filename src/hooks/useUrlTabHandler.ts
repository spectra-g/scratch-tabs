import { useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRootStore } from '../stores';
import { languageRegistry } from '../languages';
import { tabletRegistry } from '../tablets';
import { Tab } from '../types';

const generateUrlIdentifier = (tab: Tab | undefined): string => {
    if (!tab) return '';
    let identifier = tab.title
        .toLowerCase()
        .replace(/[\s_.,; T#%/[\]{}()]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    return identifier || tab.id;
};

export const useUrlTabHandler = () => {
    const { identifier: urlIdentifierParam } = useParams<{ identifier?: string }>();
    const navigate = useNavigate();
    const isInitialLoadRef = useRef(true);

    const {
        tabs,
        addTab,
        setActiveLeftTab,
        setActiveRightTab,
        splitView,
    } = useRootStore(state => ({
        tabs: state.tabs,
        addTab: state.addTab,
        setActiveLeftTab: state.setActiveLeftTab,
        setActiveRightTab: state.setActiveRightTab,
        splitView: state.splitView,
    }));

    useEffect(() => {
        const isInitial = isInitialLoadRef.current;
        if (isInitial) {
            isInitialLoadRef.current = false; // Mark initial load as done after first run
        }

        // A. Handle No Identifier Case (Root Path '/')
        if (urlIdentifierParam === undefined) {
            // Optional: Handle what happens when navigating back to '/'
            // Could load last active based on history, or a default tab.
            // For now, we primarily focus on when an identifier *is* present.
            console.log("URL Sync: No identifier.");
            return;
        }

        // B. Check if Current State Already Matches URL
        const currentLeftTab = tabs.find(tab => tab.id === splitView.activeLeftTabId);
        const currentRightTab = tabs.find(tab => tab.id === splitView.activeRightTabId);

        const isLeftSynced = currentLeftTab && generateUrlIdentifier(currentLeftTab) === urlIdentifierParam;
        const isRightSynced = splitView.isSplit && currentRightTab && generateUrlIdentifier(currentRightTab) === urlIdentifierParam;

        // If *either* side is already synced, the URL change was likely handled
        // by manual activation, OR the state is already correct. Do nothing more.
        // Exception: On initial load, we *always* try to sync.
        if (!isInitial && (isLeftSynced || isRightSynced)) {
            return; // State is consistent enough, likely due to manual nav
        }

        // C. State Needs Syncing (Initial Load OR Neither side matches URL)
        // Find ALL candidate tabs matching the identifier
        const normalizedIdentifier = urlIdentifierParam.toLowerCase();
        const candidateTabs = tabs.filter(tab => {
            // Check ID
            if (tab.id === urlIdentifierParam) return true;
            // Check Title
            const normalizedTitle = tab.title.toLowerCase();
            if (normalizedTitle === normalizedIdentifier || normalizedTitle.replace(/[^a-z0-9]/g, '') === normalizedIdentifier.replace(/[^a-z0-9]/g, '')) return true;
            // Check Language
            if (!tab.isTablet && tab.language === urlIdentifierParam && languageRegistry.getById(urlIdentifierParam)) return true;
            // Check Tablet Type
            if (tab.isTablet && tab.tabletState) { try { const state = JSON.parse(tab.tabletState); if (state && typeof state === 'object' && state.type === urlIdentifierParam && tabletRegistry.getById(urlIdentifierParam)) return true; } catch (e) { /* ignore */ } }
            // Check generated identifier
            if (generateUrlIdentifier(tab) === urlIdentifierParam) return true;
            return false;
        }).sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));


        if (candidateTabs.length > 0) {
            // --- Activate based on candidates ---

            // Determine best candidate for the left side
            const leftCandidate = candidateTabs.find(ct => !splitView.isSplit || splitView.leftTabs.includes(ct.id)) || candidateTabs[0];
            if (leftCandidate && leftCandidate.id !== splitView.activeLeftTabId) {
                setActiveLeftTab(leftCandidate.id);
            }

            // Determine best candidate for the right side (if split)
            if (splitView.isSplit) {
                const rightCandidate = candidateTabs.find(ct => splitView.rightTabs.includes(ct.id));
                // Use the ID of the candidate selected for the left side for comparison
                const effectiveLeftId = leftCandidate?.id;

                // Activate right if found, different from current right, AND different from the left candidate
                if (rightCandidate && rightCandidate.id !== splitView.activeRightTabId && rightCandidate.id !== effectiveLeftId) {
                    setActiveRightTab(rightCandidate.id);
                }
                 // Fallback: If no specific right candidate, use overall best if different from current right & left candidate
                 else if (!rightCandidate && candidateTabs[0] && candidateTabs[0].id !== splitView.activeRightTabId && candidateTabs[0].id !== effectiveLeftId) {
                     setActiveRightTab(candidateTabs[0].id);
                 }
            }
        } else {
             // No existing tab matches -> Create a new one (Maybe only on initial load?)
             // Let's restrict creation to initial load for now to prevent accidental creations
             if (isInitial) {
                 const newTab = createNewTab(urlIdentifierParam);
                 addTab(newTab, false); // Add to left side
                 setActiveLeftTab(newTab.id);
             } else {
                 // Maybe navigate away or show a 'not found' state?
             }
        }

    }, [
        urlIdentifierParam,
        tabs, // Need tabs list to find candidates and current tabs
        addTab,
        setActiveLeftTab,
        setActiveRightTab,
        splitView.isSplit,
        splitView.leftTabs, // Needed for finding candidates
        splitView.rightTabs, // Needed for finding candidates
        splitView.activeLeftTabId, // Needed for comparison
        splitView.activeRightTabId, // Needed for comparison
    ]);


    // --- Function to update URL on manual activation ---
    const updateUrlOnManualActivation = useCallback((tab: Tab | undefined, side: 'left' | 'right') => {
        if (!tab) return;
        const newUrlIdentifier = generateUrlIdentifier(tab);
        // Get current identifier directly from window.location to avoid stale closures
        const currentPath = window.location.pathname;
        const currentUrlIdentifier = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;

        if (newUrlIdentifier && newUrlIdentifier !== currentUrlIdentifier) {
            navigate(`/${newUrlIdentifier}`, { replace: true });
        }
    }, [navigate]);

     const createNewTab = (identifier: string): Tab => {
        if (languageRegistry.getById(identifier)) {
            return { id: crypto.randomUUID(), title: `New ${identifier} Tab`, content: '', language: identifier, languageLocked: true, lastAccessed: Date.now(), cursorPosition: { lineNumber: 1, column: 1 }, isTablet: false };
        }
        if (tabletRegistry.getById(identifier)) {
            const tablet = tabletRegistry.getById(identifier)!;
            const state = tablet.createInitialState();
            return { id: crypto.randomUUID(), title: tablet.label, content: '', language: 'plaintext', languageLocked: true, isTablet: true, tabletState: tablet.serializeState(state), lastAccessed: Date.now(), cursorPosition: { lineNumber: 1, column: 1 } };
        }
        return { id: crypto.randomUUID(), title: identifier, content: '', language: 'plaintext', languageLocked: false, lastAccessed: Date.now(), cursorPosition: { lineNumber: 1, column: 1 }, isTablet: false };
    };
    return { updateUrlOnManualActivation };
};
