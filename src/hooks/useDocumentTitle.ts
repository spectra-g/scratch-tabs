import { useEffect } from 'react';
import { useWorkspaceStore } from '../stores/workspaceStore';

// Regex pattern to detect Pomodoro timer titles (format: "(MM:SS) sessionType")
const POMODORO_TITLE_PATTERN = /^\(\d{2}:\d{2}\)\s+(focus|shortBreak|longBreak)$/;
const BASE_TITLE = 'Scratch Tabs';
const TITLE_UPDATE_INTERVAL = 1000; // 1 second

/**
 * Hook to manage the browser document title based on the active workspace.
 * Automatically defers to the Pomodoro timer when it's running.
 */
export const useDocumentTitle = () => {
  const { getActiveWorkspace } = useWorkspaceStore();

  useEffect(() => {
    const updateTitle = () => {
      // Check if the Pomodoro timer is managing the title
      // If so, don't override it
      const currentTitle = document.title;
      const isPomodoroActive = POMODORO_TITLE_PATTERN.test(currentTitle);

      if (isPomodoroActive) {
        return;
      }

      // Update title with workspace name or default
      const activeWorkspace = getActiveWorkspace();

      if (activeWorkspace && activeWorkspace.name !== 'Default Workspace') {
        document.title = `${BASE_TITLE} - ${activeWorkspace.name}`;
      } else {
        document.title = BASE_TITLE;
      }
    };

    // Update title immediately
    updateTitle();

    // Set up an interval to check for workspace changes
    const interval = setInterval(updateTitle, TITLE_UPDATE_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [getActiveWorkspace]);
}; 