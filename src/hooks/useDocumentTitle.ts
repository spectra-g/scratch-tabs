import { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';

export const useDocumentTitle = () => {
  const { getActiveWorkspace } = useWorkspaceStore();
  
  useEffect(() => {
    const updateTitle = () => {
      const activeWorkspace = getActiveWorkspace();
      const baseTitle = 'Scratch Tabs';
      
      if (activeWorkspace && activeWorkspace.name !== 'Default Workspace') {
        document.title = `${baseTitle} - ${activeWorkspace.name}`;
      } else {
        document.title = baseTitle;
      }
    };

    // Update title immediately
    updateTitle();

    // Set up an interval to check for workspace changes
    const interval = setInterval(updateTitle, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [getActiveWorkspace]);
}; 