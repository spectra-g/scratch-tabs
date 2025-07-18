import { renderHook, act } from '@testing-library/react';
import { useClipboardOperations } from '../hooks/useClipboardOperations';
import { ClipboardData } from '../types';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid'),
  },
});

// Mock navigator.clipboard
const mockClipboard = {
  read: jest.fn(),
  readText: jest.fn(),
  write: jest.fn(),
  writeText: jest.fn(),
};

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
});

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  onload: null as any,
  result: null as any,
};

Object.defineProperty(global, 'FileReader', {
  value: jest.fn(() => mockFileReader),
});

// Mock fetch
global.fetch = jest.fn();

describe('useClipboardOperations', () => {
  const mockData: ClipboardData = {
    items: [
      {
        id: '1',
        content: 'existing content',
        type: 'text',
        timestamp: 1000,
        expiresAt: 2000,
        isPinned: false,
        isFavorite: false,
        title: 'existing content',
      },
    ],
    searchQuery: '',
    filterType: null,
    showFavorites: false,
    viewMode: 'list',
  };

  const mockUpdateData = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('handlePaste', () => {
    it('should handle text paste', async () => {
      const mockClipboardItem = {
        types: ['text/plain'],
        getType: jest.fn().mockResolvedValue({
          text: () => Promise.resolve('new text content'),
        }),
      };

      mockClipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      await act(async () => {
        await result.current.handlePaste();
      });

      expect(mockUpdateData).toHaveBeenCalledWith({
        items: [
          expect.objectContaining({
            id: 'test-uuid',
            content: 'new text content',
            type: 'text',
            title: 'new text content',
          }),
          ...mockData.items,
        ],
      });
    });

    it('should handle image paste', async () => {
      const mockBlob = new Blob(['image data'], { type: 'image/png' });
      const mockClipboardItem = {
        types: ['image/png'],
        getType: jest.fn().mockResolvedValue(mockBlob),
      };

      mockClipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      await act(async () => {
        await result.current.handlePaste();
      });

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockBlob);

      // Simulate FileReader onload
      mockFileReader.result = 'data:image/png;base64,imagedata';
      act(() => {
        mockFileReader.onload();
      });

      expect(mockUpdateData).toHaveBeenCalledWith({
        items: [
          expect.objectContaining({
            id: 'test-uuid',
            content: 'data:image/png;base64,imagedata',
            type: 'image',
          }),
          ...mockData.items,
        ],
      });
    });

    it('should not add duplicate content', async () => {
      const mockClipboardItem = {
        types: ['text/plain'],
        getType: jest.fn().mockResolvedValue({
          text: () => Promise.resolve('existing content'),
        }),
      };

      mockClipboard.read.mockResolvedValue([mockClipboardItem]);

      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      await act(async () => {
        await result.current.handlePaste();
      });

      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    it('should fallback to readText on error', async () => {
      mockClipboard.read.mockRejectedValue(new Error('Read failed'));
      mockClipboard.readText.mockResolvedValue('fallback text');

      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      await act(async () => {
        await result.current.handlePaste();
      });

      expect(mockUpdateData).toHaveBeenCalledWith({
        items: [
          expect.objectContaining({
            content: 'fallback text',
            type: 'text',
          }),
          ...mockData.items,
        ],
      });
    });
  });

  describe('handleCopy', () => {
    it('should copy text to clipboard', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      await act(async () => {
        const success = await result.current.handleCopy('1', 'test content', 'text');
        expect(success).toBe(true);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('test content');
      expect(mockUpdateData).toHaveBeenCalledWith({
        items: [
          expect.objectContaining({
            id: '1',
            timestamp: 1700000000000,
            expiresAt: 1700000000000 + 24 * 60 * 60 * 1000,
          }),
        ],
      });
    });

    it('should copy image to clipboard', async () => {
      const mockBlob = new Blob(['image data'], { type: 'image/png' });
      const mockResponse = { blob: () => Promise.resolve(mockBlob) };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const mockClipboardItem = {};
      (global as any).ClipboardItem = jest.fn(() => mockClipboardItem);
      mockClipboard.write.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      await act(async () => {
        const success = await result.current.handleCopy('1', 'data:image/png;base64,abc', 'image');
        expect(success).toBe(true);
      });

      expect(fetch).toHaveBeenCalledWith('data:image/png;base64,abc');
      expect(mockClipboard.write).toHaveBeenCalledWith([mockClipboardItem]);
    });

    it('should handle copy errors', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Copy failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      await act(async () => {
        const success = await result.current.handleCopy('1', 'test content', 'text');
        expect(success).toBe(false);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy to clipboard:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('handleDelete', () => {
    it('should delete item by id', () => {
      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      act(() => {
        result.current.handleDelete('1');
      });

      expect(mockUpdateData).toHaveBeenCalledWith({
        items: [],
      });
    });
  });

  describe('handleTogglePin', () => {
    it('should toggle pin status', () => {
      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      act(() => {
        result.current.handleTogglePin('1');
      });

      expect(mockUpdateData).toHaveBeenCalledWith({
        items: [
          expect.objectContaining({
            id: '1',
            isPinned: true,
            expiresAt: 1700000000000 + 24 * 60 * 60 * 1000,
          }),
        ],
      });
    });
  });

  describe('handleToggleFavorite', () => {
    it('should toggle favorite status', () => {
      const { result } = renderHook(() => useClipboardOperations(mockData, mockUpdateData));

      act(() => {
        result.current.handleToggleFavorite('1');
      });

      expect(mockUpdateData).toHaveBeenCalledWith({
        items: [
          expect.objectContaining({
            id: '1',
            isFavorite: true,
          }),
        ],
      });
    });
  });
});