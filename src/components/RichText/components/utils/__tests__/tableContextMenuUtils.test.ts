import { detectOS, getOSShortcutText, isInTableHeader, isOnlyTableRow } from '../tableContextMenuUtils';

// Mock navigator
Object.defineProperty(navigator, 'platform', {
  writable: true,
});

describe('tableContextMenuUtils', () => {
  describe('detectOS', () => {
    it('should detect Mac platform', () => {
      (navigator as any).platform = 'MacIntel';
      expect(detectOS()).toBe('mac');
    });

    it('should detect Windows platform', () => {
      (navigator as any).platform = 'Win32';
      expect(detectOS()).toBe('windows');
    });

    it('should default to windows for other platforms', () => {
      (navigator as any).platform = 'Linux x86_64';
      expect(detectOS()).toBe('windows');
    });
  });

  describe('getOSShortcutText', () => {
    it('should format shortcuts for Mac', () => {
      (navigator as any).platform = 'MacIntel';
      const result = getOSShortcutText('Ctrl+Option+↑');
      expect(result).toBe('⌃⌥↑');
    });

    it('should format shortcuts for Windows', () => {
      (navigator as any).platform = 'Win32';
      const result = getOSShortcutText('Ctrl+Option+↑');
      expect(result).toBe('Ctrl+Alt+↑');
    });
  });

  describe('isInTableHeader', () => {
    it('should return true when in table header', () => {
      const mockEditor = {
        isActive: jest.fn().mockReturnValue(true),
      } as any;

      const result = isInTableHeader(mockEditor);
      
      expect(result).toBe(true);
      expect(mockEditor.isActive).toHaveBeenCalledWith('tableHeader');
    });

    it('should return false when not in table header', () => {
      const mockEditor = {
        isActive: jest.fn().mockReturnValue(false),
      } as any;

      const result = isInTableHeader(mockEditor);
      
      expect(result).toBe(false);
      expect(mockEditor.isActive).toHaveBeenCalledWith('tableHeader');
    });
  });

  describe('isOnlyTableRow', () => {
    it('should return true when table has only one row', () => {
      const mockTableNode = {
        type: { name: 'table' },
        descendants: jest.fn((callback) => {
          // Simulate one row
          callback({ type: { name: 'tableRow' } });
        }),
      };

      const mockEditor = {
        state: {
          selection: {
            $from: {
              depth: 2,
              node: jest.fn().mockImplementation((depth) => {
                if (depth === 1) return mockTableNode;
                return { type: { name: 'other' } };
              }),
            },
          },
        },
      } as any;

      const result = isOnlyTableRow(mockEditor);
      expect(result).toBe(true);
    });

    it('should return false when table has multiple rows', () => {
      const mockTableNode = {
        type: { name: 'table' },
        descendants: jest.fn((callback) => {
          // Simulate two rows
          callback({ type: { name: 'tableRow' } });
          callback({ type: { name: 'tableRow' } });
        }),
      };

      const mockEditor = {
        state: {
          selection: {
            $from: {
              depth: 2,
              node: jest.fn().mockImplementation((depth) => {
                if (depth === 1) return mockTableNode;
                return { type: { name: 'other' } };
              }),
            },
          },
        },
      } as any;

      const result = isOnlyTableRow(mockEditor);
      expect(result).toBe(false);
    });

    it('should return false when not in a table', () => {
      const mockEditor = {
        state: {
          selection: {
            $from: {
              depth: 2,
              node: jest.fn().mockReturnValue({ type: { name: 'paragraph' } }),
            },
          },
        },
      } as any;

      const result = isOnlyTableRow(mockEditor);
      expect(result).toBe(false);
    });

    it('should return false when an error occurs', () => {
      const mockEditor = {
        state: {
          selection: {
            $from: {
              depth: 2,
              node: jest.fn().mockImplementation(() => {
                throw new Error('Test error');
              }),
            },
          },
        },
      } as any;

      const result = isOnlyTableRow(mockEditor);
      expect(result).toBe(false);
    });
  });
});