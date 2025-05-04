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

    // Handle URL changes (user navigation)
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            prevUrlIdentifierParamRef.current = urlIdentifierParam;
            isUserNavigation.current = true;
        }
        if (!isUserNavigation.current) return;
        if (urlIdentifierParam !== prevUrlIdentifierParamRef.current) {
            isProcessingUrlChange.current = true;
            if (stateUpdateTimeout.current) clearTimeout(stateUpdateTimeout.current);
            // 1. Try to find tab (left, then right, only left if not split)
            const { tab, side } = findTabByUrlIdentifier(urlIdentifierParam);
            if (tab) {
                activateTab(tab, side);
            } else if (urlIdentifierParam) {
                // 2. Try to find tablet
                const tablet = findTabletByUrlIdentifier(urlIdentifierParam);
                if (tablet) {
                    const newTab = createNewTabFromUrl(urlIdentifierParam);
                    addTab(newTab, false);
                    activateTab(newTab, 'left');
                } else {
                    // 3. Try to find language
                    const language = languageRegistry.getById(urlIdentifierParam);
                    if (language) {
                        const newTab = createNewTabFromUrl(urlIdentifierParam);
                        addTab(newTab, false);
                        activateTab(newTab, 'left');
                    } else {
                        // 4. Fallback: create plaintext tab
                        const newTab = createNewTabFromUrl(urlIdentifierParam);
                        addTab(newTab, false);
                        activateTab(newTab, 'left');
                    }
                }
            }
            prevUrlIdentifierParamRef.current = urlIdentifierParam;
            setTimeout(() => { isProcessingUrlChange.current = false; }, 100);
        }
    }, [urlIdentifierParam, tabs, leftTabs, rightTabs, isSplit, activeLeftTabId, activeRightTabId, activeSide, activeWorkspaceId]);

    // Handle state changes (app navigation)
    useEffect(() => {
        if (isProcessingUrlChange.current) return;
        if (stateUpdateTimeout.current) clearTimeout(stateUpdateTimeout.current);
        stateUpdateTimeout.current = setTimeout(() => {
            isUserNavigation.current = false;
            const currentPath = location.pathname;
            const targetPath = getTargetPath();
            if (targetPath !== currentPath) {
                navigate(targetPath, { replace: true });
            }
            setTimeout(() => { isUserNavigation.current = true; }, 100);
        }, 100);
    }, [activeLeftTabId, activeRightTabId, isSplit, activeSide, tabs, leftTabs, rightTabs, activeWorkspaceId]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (stateUpdateTimeout.current) {
                clearTimeout(stateUpdateTimeout.current);
            }
        };
    }, []);
};