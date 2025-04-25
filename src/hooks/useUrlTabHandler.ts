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
            isInitialLoadRef.current = false;
        }

        if (urlIdentifierParam === undefined) {
            return;
        }

        // B. Check if *both* sides already match (more strict check for this logic)
        const currentLeftTab = tabs.find(tab => tab.id === splitView.activeLeftTabId);
        const currentRightTab = tabs.find(tab => tab.id === splitView.activeRightTabId);
        const isLeftSynced = currentLeftTab && generateUrlIdentifier(currentLeftTab) === urlIdentifierParam;
        // Only consider right synced if split view is active
        const isRightSynced = splitView.isSplit && currentRightTab && generateUrlIdentifier(currentRightTab) === urlIdentifierParam;

        // If not initial load AND (left matches OR (split AND right matches)), assume state is okay
        // This prevents loops from manual activation updating the URL
        if (!isInitial && (isLeftSynced || isRightSynced)) {
             return;
        }

        // C. State Needs Syncing
        const normalizedIdentifier = urlIdentifierParam.toLowerCase();
        const candidateTabs = tabs.filter(tab => {
            if (tab.id === urlIdentifierParam) return true;
            const normalizedTitle = tab.title.toLowerCase();
            if (normalizedTitle === normalizedIdentifier || normalizedTitle.replace(/[^a-z0-9]/g, '') === normalizedIdentifier.replace(/[^a-z0-9]/g, '')) return true;
            if (!tab.isTablet && tab.language === urlIdentifierParam && languageRegistry.getById(urlIdentifierParam)) return true;
            if (tab.isTablet && tab.tabletState) { try { const state = JSON.parse(tab.tabletState); if (state && typeof state === 'object' && state.type === urlIdentifierParam && tabletRegistry.getById(urlIdentifierParam)) return true; } catch (e) { /* ignore */ } }
            if (generateUrlIdentifier(tab) === urlIdentifierParam) return true;
            return false;
        }).sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

        if (candidateTabs.length > 0) {
            // --- Independent Activation Logic ---
            let activatedLeftId: string | null = null;
            let activatedRightId: string | null = null;

            // 1. Attempt to activate on Left Side
            // Find best candidate specifically listed in leftTabs
            const leftSpecificCandidate = candidateTabs.find(ct => splitView.leftTabs.includes(ct.id));
            // Fallback: Use the overall best candidate if none specific to left found
            const leftCandidate = leftSpecificCandidate || candidateTabs[0];

            if (leftCandidate && leftCandidate.id !== splitView.activeLeftTabId) {
                setActiveLeftTab(leftCandidate.id);
                activatedLeftId = leftCandidate.id; // Track which ID was activated
            } else if (leftCandidate) {
                activatedLeftId = leftCandidate.id; // Track even if already active
            }

            // 2. Attempt to activate on Right Side (if split view is enabled)
            if (splitView.isSplit) {
                // Find best candidate specifically listed in rightTabs
                const rightSpecificCandidate = candidateTabs.find(ct => splitView.rightTabs.includes(ct.id));
                // Fallback: Use the overall best candidate *IF* it's different from the one activated on the left
                const rightCandidate = rightSpecificCandidate || (candidateTabs[0] && candidateTabs[0].id !== activatedLeftId ? candidateTabs[0] : null);

                if (rightCandidate && rightCandidate.id !== splitView.activeRightTabId) {
                    setActiveRightTab(rightCandidate.id);
                    activatedRightId = rightCandidate.id;
                } else if (rightCandidate) {
                    activatedRightId = rightCandidate.id;
                }
            }

            // Optional: If NO tab was activated on either side (e.g., candidates exist but are already active)
            // you might still want to ensure the URL reflects one of them if the URL param was different.
            // This is less critical now that updateUrlOnManualActivation handles it.

        } else {
            // D. No Existing Tab Matches
            if (isInitial) {
                const newTab = createNewTab(urlIdentifierParam);
                addTab(newTab, false); // Add to left side by default
                setActiveLeftTab(newTab.id);
            }
        }
    }, [
        urlIdentifierParam,
        tabs,
        addTab,
        setActiveLeftTab,
        setActiveRightTab,
        splitView.isSplit,
        splitView.leftTabs,
        splitView.rightTabs,
        splitView.activeLeftTabId,
        splitView.activeRightTabId,
    ]);

    // --- Function to update URL on manual activation ---
    const updateUrlOnManualActivation = useCallback((tab: Tab | undefined, side: 'left' | 'right') => {
        if (!tab) return;
        const newUrlIdentifier = generateUrlIdentifier(tab);
        const currentPath = window.location.pathname;
        const currentUrlIdentifier = currentPath === '/' ? '' : currentPath.substring(1);

        // Only navigate if the identifier is different and valid
        if (newUrlIdentifier && newUrlIdentifier !== currentUrlIdentifier) {
            console.log(`URL Sync: Manual activation of tab ${tab.id} (${newUrlIdentifier}), updating URL.`);
            navigate(`/${newUrlIdentifier}`, { replace: true });
        } else {
             console.log(`URL Sync: Manual activation of tab ${tab.id}, URL already matches or identifier is empty.`);
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
