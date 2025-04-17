import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRootStore } from '../stores';
import { languageRegistry } from '../languages';
import { tabletRegistry } from '../tablets';
import { Tab } from '../types';

// Keep this helper function within the hook or move to a shared utility
const generateUrlIdentifier = (tab: Tab): string => {
    if (!tab) return '';
    // Prioritize ID if available and simple? Or always title? Let's stick to title for now.
    // You could add logic here: if tab.language is 'plaintext' and title seems like a UUID, use ID?
    let identifier = tab.title
        .toLowerCase()
        // Replace common separators and invalid URL chars with a hyphen
        .replace(/[\s_.,; T#%/[\]{}()]+/g, '-')
        // Remove any resulting leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
         // Optional: handle potential empty strings after replacements
        || tab.id; // Fallback to ID if title becomes empty

     // Ensure it's URL-safe; encode if necessary, though hyphens are usually okay
     // For simplicity, assuming the above replacements are sufficient for now.
     return identifier;
};


export const useUrlTabHandler = () => {
  const { identifier: urlIdentifierParam } = useParams<{ identifier?: string }>(); // Rename for clarity
  const navigate = useNavigate();
  const {
    tabs,
    addTab,
    setActiveLeftTab,
    setActiveRightTab,
    splitView,
  } = useRootStore(state => ({ // Select only what's needed
    tabs: state.tabs,
    addTab: state.addTab,
    setActiveLeftTab: state.setActiveLeftTab,
    setActiveRightTab: state.setActiveRightTab,
    splitView: state.splitView,
  }));


  // Function to update URL without causing a navigation loop if already correct
  // Note: `updateUrlForTab` is now internal to this hook's logic flow
  const updateUrlForTab = (tab: Tab | undefined) => {
      if (!tab) return;
      const newUrlIdentifier = generateUrlIdentifier(tab);
      // Check if the URL *already* matches to prevent unnecessary history entries
      if (newUrlIdentifier && newUrlIdentifier !== urlIdentifierParam) {
          navigate(`/${newUrlIdentifier}`, { replace: true });
      }
  };


  // Function to find the best matching tab (keep as is or refine)
  const findBestMatchingTab = (identifier: string): Tab | undefined => {
     // ... (your existing find logic - looks reasonable) ...
     // 1. Try exact UUID match
      const idMatch = tabs.find(tab => tab.id === identifier); // Use selector if available
      if (idMatch) return idMatch;

      // 2. Try case-insensitive title match (keep your logic)
      const normalizedIdentifier = identifier.toLowerCase();
      const titleMatch = tabs.find(tab =>
          tab.title.toLowerCase() === normalizedIdentifier ||
          tab.title.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedIdentifier.replace(/[^a-z0-9]/g, '')
      );
      if (titleMatch) return titleMatch;

      // 3. Language Match (keep your logic)
       if (languageRegistry.getById(identifier)) {
          const languageMatches = tabs
              .filter(tab => tab.language === identifier)
              .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
          if (languageMatches.length > 0) return languageMatches[0];
      }


      // 4. Tablet Match (keep your logic - ensure parsing is safe)
       if (tabletRegistry.getById(identifier)) {
           const tabletMatches = tabs
              .filter(tab => {
                  if (!tab.isTablet || !tab.tabletState) return false;
                  try {
                      // Safely parse tabletState
                      const state = JSON.parse(tab.tabletState);
                      // Ensure 'type' property exists before comparing
                      return state && typeof state === 'object' && state.type === identifier;
                  } catch (e) {
                      console.error("Failed to parse tabletState for tab:", tab.id, e);
                      return false;
                  }
              })
              .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
           if (tabletMatches.length > 0) return tabletMatches[0];
       }

      return undefined;
  };

  // Function to create a new tab based on identifier (keep as is or refine)
  const createNewTab = (identifier: string): Tab => {
    // ... (your existing creation logic - looks reasonable) ...
     // Check if identifier is a valid language
      if (languageRegistry.getById(identifier)) {
          return {
              id: crypto.randomUUID(),
              title: `New ${identifier} Tab`,
              content: '',
              language: identifier,
              languageLocked: true,
              lastAccessed: Date.now(),
              cursorPosition: { lineNumber: 1, column: 1 },
               isTablet: false, // Ensure defaults are set
               // other required fields...
          };
      }

      // Check if identifier is a valid tablet type
      if (tabletRegistry.getById(identifier)) {
          const tablet = tabletRegistry.getById(identifier)!;
          const state = tablet.createInitialState();
          return {
              id: crypto.randomUUID(),
              title: tablet.label,
              content: '', // Tablets usually manage their own content/state view
              language: 'plaintext', // Or a specific language for the tablet if applicable
              languageLocked: true,
              isTablet: true,
              tabletState: tablet.serializeState(state), // Ensure serializeState exists
              lastAccessed: Date.now(),
              cursorPosition: { lineNumber: 1, column: 1 },
              // other required fields...
          };
      }


      // Default to plaintext with identifier as title
      return {
          id: crypto.randomUUID(),
          title: identifier,
          content: '',
          language: 'plaintext',
          languageLocked: false,
          lastAccessed: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
           isTablet: false,
           // other required fields...
      };
  };


  // Effect to handle URL changes
  useEffect(() => {
    // Only run if urlIdentifierParam actually exists from the URL
    if (urlIdentifierParam === undefined) {
      // Handle root path '/' - maybe load last active or default,
      // and potentially update URL to reflect that default tab?
      // Example: find last active tab, if found, updateUrlForTab(lastActiveTab)
      // For now, we just return if no identifier is explicitly in the URL
      return;
    }

    // Try to find matching tab based on the identifier from the URL
    const matchingTab = findBestMatchingTab(urlIdentifierParam);
    let tabToUpdateUrlWith: Tab | undefined = undefined;

    if (matchingTab) {
      tabToUpdateUrlWith = matchingTab; // This is the tab we'll use for the URL
      // Activate the matched tab
      if (splitView.isSplit) {
        // Determine if the matched tab is currently assigned to the right pane list
        const isMatchOnRight = splitView.rightTabs.includes(matchingTab.id);
        // Activate the pane where the tab resides, or left by default if not explicitly on right
         if (isMatchOnRight) {
             // Only activate if it's not already active on the right
              if (splitView.activeRightTabId !== matchingTab.id) {
                 setActiveRightTab(matchingTab.id);
              }
         } else {
              // Only activate if it's not already active on the left
              if (splitView.activeLeftTabId !== matchingTab.id) {
                  setActiveLeftTab(matchingTab.id);
              }
         }
      } else {
          // Not in split view, activate on the left if not already active
          if (splitView.activeLeftTabId !== matchingTab.id) {
              setActiveLeftTab(matchingTab.id);
          }
      }
    } else {
      // No matching tab found, create a new one
      const newTab = createNewTab(urlIdentifierParam);
      tabToUpdateUrlWith = newTab; // This new tab determines the URL
      addTab(newTab, false); // Add to left side by default
      setActiveLeftTab(newTab.id); // Activate the new tab on the left
    }

    // **Crucially, update the URL based on the tab we just activated or created**
    // This ensures the URL reflects the state derived from the initial identifier
    updateUrlForTab(tabToUpdateUrlWith);

    // Dependencies: We want this to run when the URL identifier changes,
    // or potentially if the set of tabs changes (e.g., a tab matching the identifier is added/removed later).
    // Be careful with `tabs` dependency to avoid loops if tab finding/creation logic isn't stable.
    // `addTab`, `setActive*` are actions, usually stable refs.
    // `splitView.isSplit`, `splitView.rightTabs` might be needed if activation logic depends on them.
  }, [
      urlIdentifierParam,
      tabs, // Re-run if tabs change, maybe find a match now
      addTab,
      setActiveLeftTab,
      setActiveRightTab,
      splitView.isSplit,
      splitView.rightTabs, // Needed for isMatchOnRight check
      splitView.activeLeftTabId, // Needed for checking if already active
      splitView.activeRightTabId, // Needed for checking if already active
      navigate // navigate is a dependency of updateUrlForTab
      // getTabById selector might need store state as dependency if not memoized
   ]);


   // This hook now ONLY exposes the function needed for MANUAL updates (clicks)
   const updateUrlOnManualActivation = (tab: Tab | undefined) => {
       if (!tab) return;
       const newUrlIdentifier = generateUrlIdentifier(tab);
       // Prevent update if URL already matches
       if (newUrlIdentifier && newUrlIdentifier !== urlIdentifierParam) {
           navigate(`/${newUrlIdentifier}`, { replace: true });
       }
   };


  return { updateUrlOnManualActivation }; // Expose only this manual update function
};