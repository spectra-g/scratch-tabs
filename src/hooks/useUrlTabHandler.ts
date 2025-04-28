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
    const identifier = tab.title
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
    const isProcessingUrlChange = useRef(false);
    const lastManualUrlChange = useRef<string | undefined>(urlIdentifierParam);
    const stateUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Helper function to handle tab activation based on URL changes
    const handleTabActivation = (candidateTab: Tab): boolean => {
        // First check if the tab is already active on either side
        if (candidateTab.id === activeRightTabId) {
            setActiveSide('right');
            return true;
        }
        if (candidateTab.id === activeLeftTabId) {
            setActiveSide('left');
            return true;
        }

        // Check where the tab exists
        const tabExistsOnRight = isSplit && tabs.some(t => t.id === candidateTab.id && t.id === activeRightTabId);
        const tabExistsOnLeft = tabs.some(t => t.id === candidateTab.id && t.id === activeLeftTabId);
        const tabExistsAnywhere = tabs.some(t => t.id === candidateTab.id);

        // Activate tab on the side where it exists
        if (tabExistsOnRight) {
            setActiveRightTab(candidateTab.id);
            setActiveSide('right');
            return true;
        }

        if (tabExistsOnLeft) {
            setActiveLeftTab(candidateTab.id);
            setActiveSide('left');
            return true;
        }

        // If tab exists but isn't active on either side, activate it on the right if that's where we're adding it
        if (tabExistsAnywhere && activeSide === 'right') {
            setActiveRightTab(candidateTab.id);
            setActiveSide('right');
            return true;
        }

        // If tab doesn't exist on either side, create it on the left
        addTab(candidateTab, false);
        setActiveLeftTab(candidateTab.id);
        setActiveSide('left');
        return true;
    };

    // Helper function to determine the target tab ID based on active side
    const getTargetTabId = (): string | null => {
        if (activeSide === 'left') {
            return activeLeftTabId;
        } else if (activeSide === 'right' && isSplit) {
            return activeRightTabId;
        } else if (activeSide === 'right' && !isSplit) {
            // If focus was right but split view turned off, URL should reflect left tab
            return activeLeftTabId;
        }
        // Default to left tab if activeSide is somehow invalid
        return activeLeftTabId;
    };

    // Helper function to generate the target URL path
    const getTargetPath = (): string => {
        // Always use the active tab based on the current side
        const targetTabId = getTargetTabId();
        const targetTab = targetTabId ? tabs.find(t => t.id === targetTabId) : undefined;
        const targetUrlIdentifier = generateUrlIdentifier(targetTab);
        return targetUrlIdentifier ? `/${targetUrlIdentifier}` : '/';
    };

    // Helper function to find a tab by URL identifier
    const findTabByUrlIdentifier = (urlIdentifier: string | undefined): Tab | undefined => {
        if (!urlIdentifier) return undefined;

        const normalizedParam = urlIdentifier.toLowerCase();
        
        // First check if it's a tablet identifier
        // Try exact match first
        let tablet = tabletRegistry.getById(normalizedParam);
        if (!tablet) {
            // Try matching against tablet labels and keywords
            const allTablets = tabletRegistry.getAll();
            tablet = allTablets.find(t => {
                // Check if URL matches tablet ID
                if (t.id === normalizedParam) return true;
                
                // Check if URL matches tablet label
                const dummyTab: Tab = {
                    id: t.id,
                    title: t.label,
                    content: '',
                    language: 'plaintext',
                    languageLocked: false,
                    cursorPosition: { lineNumber: 0, column: 0 },
                    isTablet: true,
                    dateCreated: Date.now(),
                    lastModified: Date.now()
                };
                if (generateUrlIdentifier(dummyTab) === normalizedParam) return true;
                
                // Check if URL matches any of the tablet's keywords
                return t.keywords.some(keyword => {
                    const keywordTab: Tab = {
                        id: t.id,
                        title: keyword,
                        content: '',
                        language: 'plaintext',
                        languageLocked: false,
                        cursorPosition: { lineNumber: 0, column: 0 },
                        isTablet: true,
                        dateCreated: Date.now(),
                        lastModified: Date.now()
                    };
                    return generateUrlIdentifier(keywordTab) === normalizedParam;
                });
            });
        }
        
        if (tablet) {
            // Check if we already have a tab for this tablet
            const existingTabletTab = tabs.find(tab => 
                tab.isTablet && 
                tab.title.toLowerCase() === tablet!.label.toLowerCase()
            );
            if (existingTabletTab) {
                return existingTabletTab;
            }
            // Return undefined to trigger new tablet creation
            return undefined;
        }
        
        // Then try to match by exact title (case-insensitive)
        const tabByTitle = tabs.find(tab => {
            const matches = tab.title.toLowerCase() === normalizedParam;
            return matches;
        });
        if (tabByTitle) {
            return tabByTitle;
        }

        // Then try to match by generated URL identifier
        const tabByGeneratedId = tabs.find(tab => {
            const generatedId = generateUrlIdentifier(tab);
            const matches = generatedId === urlIdentifier;
            return matches;
        });
        if (tabByGeneratedId) {
            return tabByGeneratedId;
        }

        // Finally try to match by ID or sanitized title
        const tabByOther = tabs.find(tab => {
            const matchesId = tab.id === urlIdentifier;
            const sanitizedTitle = tab.title.toLowerCase().replace(/[^a-z0-9]/g, '');
            const sanitizedParam = normalizedParam.replace(/[^a-z0-9]/g, '');
            const matchesTitle = sanitizedTitle === sanitizedParam;
            return matchesId || matchesTitle;
        });
        if (tabByOther) {
            return tabByOther;
        }

        return undefined;
    };

    // Helper function to create a new tab based on URL identifier
    const createNewTabFromUrl = (urlIdentifier: string): Tab => {
        // Check if it's a language identifier
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
                isTablet: false
            };
        }

        // Check if it's a tablet identifier
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
                cursorPosition: { lineNumber: 1, column: 1 }
            };
        }

        // Try matching against tablet labels and keywords
        const allTablets = tabletRegistry.getAll();
        const tabletByLabelOrKeyword = allTablets.find(t => {
            // Check if URL matches tablet ID
            if (t.id === urlIdentifier) return true;
            
            // Check if URL matches tablet label
            const dummyTab: Tab = {
                id: t.id,
                title: t.label,
                content: '',
                language: 'plaintext',
                languageLocked: false,
                cursorPosition: { lineNumber: 0, column: 0 },
                isTablet: true,
                dateCreated: Date.now(),
                lastModified: Date.now()
            };
            if (generateUrlIdentifier(dummyTab) === urlIdentifier) return true;
            
            // Check if URL matches any of the tablet's keywords
            return t.keywords.some(keyword => {
                const keywordTab: Tab = {
                    id: t.id,
                    title: keyword,
                    content: '',
                    language: 'plaintext',
                    languageLocked: false,
                    cursorPosition: { lineNumber: 0, column: 0 },
                    isTablet: true,
                    dateCreated: Date.now(),
                    lastModified: Date.now()
                };
                return generateUrlIdentifier(keywordTab) === urlIdentifier;
            });
        });

        if (tabletByLabelOrKeyword) {
            const state = tabletByLabelOrKeyword.createInitialState();
            return {
                id: crypto.randomUUID(),
                title: tabletByLabelOrKeyword.label,
                content: '',
                language: 'plaintext',
                languageLocked: true,
                isTablet: true,
                tabletState: tabletByLabelOrKeyword.serializeState(state),
                lastModified: Date.now(),
                dateCreated: Date.now(),
                cursorPosition: { lineNumber: 1, column: 1 }
            };
        }

        // Default plain text tab with title from URL
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
            isTablet: false
        };
    };

    // Handle URL changes (manual navigation)
    useEffect(() => {
        if (initialRender.current) {
            initialRender.current = false;
            prevUrlIdentifierParamRef.current = urlIdentifierParam;
            lastManualUrlChange.current = urlIdentifierParam;

            if (urlIdentifierParam) {
                const candidateTab = findTabByUrlIdentifier(urlIdentifierParam);
                if (!candidateTab) {
                    const newTab = createNewTabFromUrl(urlIdentifierParam);
                    addTab(newTab, false);
                    setActiveLeftTab(newTab.id);
                    setActiveSide('left');
                } else {
                    handleTabActivation(candidateTab);
                }
            }
            return;
        }

        if (isProcessingUrlChange.current) {
            return;
        }

        if (urlIdentifierParam !== prevUrlIdentifierParamRef.current) {
            isProcessingUrlChange.current = true;
            lastManualUrlChange.current = urlIdentifierParam;
            
            if (stateUpdateTimeout.current) {
                clearTimeout(stateUpdateTimeout.current);
                stateUpdateTimeout.current = null;
            }
            
            try {
                const candidateTab = findTabByUrlIdentifier(urlIdentifierParam);

                if (candidateTab) {
                    handleTabActivation(candidateTab);
                } else if (urlIdentifierParam) {
                    const newTab = createNewTabFromUrl(urlIdentifierParam);
                    addTab(newTab, false);
                    setActiveLeftTab(newTab.id);
                    setActiveSide('left');
                } else {
                    if (activeSide !== 'left') {
                        setActiveSide('left');
                    }
                }

                prevUrlIdentifierParamRef.current = urlIdentifierParam;
            } finally {
                setTimeout(() => {
                    isProcessingUrlChange.current = false;
                }, 100);
            }
        }
    }, [urlIdentifierParam, tabs, activeLeftTabId, activeRightTabId, isSplit, activeSide]);

    // Handle state changes (updating URL based on active tab)
    useEffect(() => {
        if (isProcessingUrlChange.current) {
            return;
        }

        if (stateUpdateTimeout.current) {
            clearTimeout(stateUpdateTimeout.current);
        }

        stateUpdateTimeout.current = setTimeout(() => {
            const currentPath = location.pathname;
            const targetPath = getTargetPath();

            if (targetPath !== currentPath) {
                navigate(targetPath, { replace: true });
            }
        }, 100);
    }, [activeLeftTabId, activeRightTabId, isSplit, activeSide, tabs]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stateUpdateTimeout.current) {
                clearTimeout(stateUpdateTimeout.current);
            }
        };
    }, []);
};