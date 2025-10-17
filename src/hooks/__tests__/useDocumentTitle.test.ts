import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '../useDocumentTitle';
import { useWorkspaceStore } from '../../stores/workspaceStore';

// Mock the workspace store
jest.mock('../../stores/workspaceStore');

describe('useDocumentTitle', () => {
  const mockGetActiveWorkspace = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    (useWorkspaceStore as unknown as jest.Mock).mockReturnValue({
      getActiveWorkspace: mockGetActiveWorkspace,
    });
    document.title = 'Scratch Tabs';
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('default title behavior', () => {
    it('should set default title for default workspace', () => {
      mockGetActiveWorkspace.mockReturnValue({
        id: 'default',
        name: 'Default Workspace',
      });

      renderHook(() => useDocumentTitle());

      expect(document.title).toBe('Scratch Tabs');
    });

    it('should set title with workspace name for non-default workspace', () => {
      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      renderHook(() => useDocumentTitle());

      expect(document.title).toBe('Scratch Tabs - My Project');
    });

    it('should update title when workspace changes', () => {
      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'Project 1',
      });

      const { rerender } = renderHook(() => useDocumentTitle());
      expect(document.title).toBe('Scratch Tabs - Project 1');

      // Change workspace
      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-2',
        name: 'Project 2',
      });

      rerender();

      // Fast forward the interval
      jest.advanceTimersByTime(1000);

      expect(document.title).toBe('Scratch Tabs - Project 2');
    });

    it('should handle null workspace', () => {
      mockGetActiveWorkspace.mockReturnValue(null);

      renderHook(() => useDocumentTitle());

      expect(document.title).toBe('Scratch Tabs');
    });
  });

  describe('Pomodoro timer integration', () => {
    it('should not override Pomodoro timer title when timer is running', () => {
      // Set a Pomodoro timer title
      document.title = '(25:00) focus';

      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      renderHook(() => useDocumentTitle());

      // Title should remain as Pomodoro timer
      expect(document.title).toBe('(25:00) focus');

      // Advance interval to verify it doesn't get overwritten
      jest.advanceTimersByTime(1000);

      expect(document.title).toBe('(25:00) focus');
    });

    it('should respect short break timer title', () => {
      document.title = '(05:00) shortBreak';

      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      renderHook(() => useDocumentTitle());

      expect(document.title).toBe('(05:00) shortBreak');

      jest.advanceTimersByTime(1000);

      expect(document.title).toBe('(05:00) shortBreak');
    });

    it('should respect long break timer title', () => {
      document.title = '(15:00) longBreak';

      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      renderHook(() => useDocumentTitle());

      expect(document.title).toBe('(15:00) longBreak');

      jest.advanceTimersByTime(1000);

      expect(document.title).toBe('(15:00) longBreak');
    });

    it('should update title when Pomodoro timer stops', () => {
      // Start with Pomodoro timer
      document.title = '(10:00) focus';

      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      renderHook(() => useDocumentTitle());

      // Timer is running, title not changed
      expect(document.title).toBe('(10:00) focus');

      // Simulate Pomodoro stopping by changing title
      document.title = 'Scratch Tabs';

      // Advance interval
      jest.advanceTimersByTime(1000);

      // Should now update with workspace name
      expect(document.title).toBe('Scratch Tabs - My Project');
    });

    it('should handle countdown timer updates', () => {
      // Simulate Pomodoro countdown
      document.title = '(24:59) focus';

      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      renderHook(() => useDocumentTitle());

      // Should not override
      expect(document.title).toBe('(24:59) focus');

      // Simulate timer countdown
      document.title = '(24:58) focus';

      jest.advanceTimersByTime(1000);

      // Should still not override
      expect(document.title).toBe('(24:58) focus');
    });

    it('should not match invalid Pomodoro title formats', () => {
      // Invalid formats should be overridden
      const invalidFormats = [
        '(25:00)',
        '25:00 focus',
        '(5:00) focus',
        '(25:00) invalid',
        'focus (25:00)',
      ];

      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      invalidFormats.forEach((invalidTitle) => {
        document.title = invalidTitle;

        renderHook(() => useDocumentTitle());

        // Invalid format should be overridden with workspace title
        expect(document.title).toBe('Scratch Tabs - My Project');
      });
    });
  });

  describe('cleanup', () => {
    it('should clear interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      const { unmount } = renderHook(() => useDocumentTitle());

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('should not leak intervals when re-rendering', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      mockGetActiveWorkspace.mockReturnValue({
        id: 'workspace-1',
        name: 'My Project',
      });

      const { rerender } = renderHook(() => useDocumentTitle());

      const initialCallCount = setIntervalSpy.mock.calls.length;

      // Re-render multiple times
      rerender();
      rerender();
      rerender();

      // Should only have one interval (from initial render)
      // Re-renders with same dependencies shouldn't create new intervals
      expect(setIntervalSpy).toHaveBeenCalledTimes(initialCallCount);

      setIntervalSpy.mockRestore();
    });
  });

  describe('interval behavior', () => {
    it('should update title on interval', () => {
      mockGetActiveWorkspace
        .mockReturnValueOnce({
          id: 'workspace-1',
          name: 'Project 1',
        })
        .mockReturnValue({
          id: 'workspace-2',
          name: 'Project 2',
        });

      renderHook(() => useDocumentTitle());

      expect(document.title).toBe('Scratch Tabs - Project 1');

      // Advance one interval tick
      jest.advanceTimersByTime(1000);

      // Title should update to new workspace
      expect(document.title).toBe('Scratch Tabs - Project 2');
    });

    it('should continue updating on subsequent intervals', () => {
      let callCount = 0;
      mockGetActiveWorkspace.mockImplementation(() => {
        callCount++;
        return {
          id: 'workspace-1',
          name: `Project ${callCount}`,
        };
      });

      renderHook(() => useDocumentTitle());

      expect(document.title).toBe('Scratch Tabs - Project 1');

      // Advance multiple intervals
      jest.advanceTimersByTime(1000);
      expect(document.title).toBe('Scratch Tabs - Project 2');

      jest.advanceTimersByTime(1000);
      expect(document.title).toBe('Scratch Tabs - Project 3');

      jest.advanceTimersByTime(1000);
      expect(document.title).toBe('Scratch Tabs - Project 4');
    });
  });
});
