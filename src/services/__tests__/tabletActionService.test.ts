import { tabletActionService, TabletActionMessage } from '../tabletActionService';
import { dynamicTabletRegistry } from '../../tablets/dynamicRegistry';
import { useRootStore } from '../../stores/rootStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Tablet, TabletState } from '../../tablets/types';

// Mock the dependencies
jest.mock('../../tablets/dynamicRegistry');
jest.mock('../../stores/rootStore');
jest.mock('../../stores/workspaceStore');

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

const mockDynamicTabletRegistry = dynamicTabletRegistry as jest.Mocked<typeof dynamicTabletRegistry>;
const mockUseRootStore = useRootStore as jest.MockedFunction<typeof useRootStore>;
const mockUseWorkspaceStore = useWorkspaceStore as jest.MockedFunction<typeof useWorkspaceStore>;

describe('TabletActionService', () => {
  let mockHandleNewPopulatedTab: jest.Mock;
  let mockTablet: Tablet;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockHandleNewPopulatedTab = jest.fn();
    
    (mockUseRootStore as any).getState = jest.fn(() => ({
      handleNewPopulatedTab: mockHandleNewPopulatedTab,
    }));

    (mockUseWorkspaceStore as any).getState = jest.fn(() => ({
      activeWorkspaceId: 'test-workspace-id',
    }));

    // Mock tablet implementation
    mockTablet = {
      id: 'test-tablet',
      label: 'Test Tablet',
      keywords: ['test'],
      createInitialState: jest.fn().mockReturnValue({
        type: 'test',
        data: { content: 'test content' }
      } as TabletState),
      serializeState: jest.fn().mockReturnValue('{"type":"test","data":{"content":"test content"}}'),
      deserializeState: jest.fn(),
      render: jest.fn(),
    };
  });

  describe('handleAction', () => {
    it('should successfully create a new tab when tablet is found', async () => {
      mockDynamicTabletRegistry.getById.mockResolvedValue(mockTablet);

      const message: TabletActionMessage = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: { content: 'test content' },
        source: {
          tabId: 'source-tab-id',
          titleHint: 'Test Tab Title',
        },
      };

      await tabletActionService.handleAction(message);

      expect(mockDynamicTabletRegistry.getById).toHaveBeenCalledWith('test-tablet');
      expect(mockTablet.createInitialState).toHaveBeenCalledWith({ content: 'test content' });
      expect(mockTablet.serializeState).toHaveBeenCalledWith({
        type: 'test',
        data: { content: 'test content' }
      });
      expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Tab Title',
          isTablet: true,
          tabletState: '{"type":"test","data":{"content":"test content"}}',
          workspaceId: 'test-workspace-id',
        }),
        false
      );
    });

    it('should use tablet label as title when titleHint is not provided', async () => {
      mockDynamicTabletRegistry.getById.mockResolvedValue(mockTablet);

      const message: TabletActionMessage = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: {},
        source: {
          tabId: 'source-tab-id',
        },
      };

      await tabletActionService.handleAction(message);

      expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Tablet',
        }),
        false
      );
    });

    it('should handle empty workspace ID gracefully', async () => {
      mockDynamicTabletRegistry.getById.mockResolvedValue(mockTablet);
      (mockUseWorkspaceStore as any).getState = jest.fn(() => ({
        activeWorkspaceId: '',
      }));

      const message: TabletActionMessage = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: {},
        source: {},
      };

      await tabletActionService.handleAction(message);

      expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: '',
        }),
        false
      );
    });

    it('should create tab with proper default values', async () => {
      mockDynamicTabletRegistry.getById.mockResolvedValue(mockTablet);

      const message: TabletActionMessage = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: {},
        source: {},
      };

      await tabletActionService.handleAction(message);

      expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: 'Test Tablet',
          isTablet: true,
          content: '',
          language: 'plaintext',
          languageLocked: true,
          dateCreated: expect.any(Number),
          lastModified: expect.any(Number),
          cursorPosition: { lineNumber: 1, column: 1 },
        }),
        false
      );
    });

    it('should log error and return early when tablet is not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDynamicTabletRegistry.getById.mockResolvedValue(undefined);

      const message: TabletActionMessage = {
        targetTablet: 'nonexistent-tablet',
        action: 'new-tab',
        payload: {},
        source: {},
      };

      await tabletActionService.handleAction(message);

      expect(consoleSpy).toHaveBeenCalledWith('Target tablet "nonexistent-tablet" not found.');
      expect(mockHandleNewPopulatedTab).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle registry errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Registry error');
      mockDynamicTabletRegistry.getById.mockRejectedValue(error);

      const message: TabletActionMessage = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: {},
        source: {},
      };

      await expect(tabletActionService.handleAction(message)).rejects.toThrow('Registry error');
      expect(mockHandleNewPopulatedTab).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should be completely tablet-agnostic', async () => {
      // Test with a different tablet type
      const mockCustomTablet = {
        ...mockTablet,
        id: 'custom-tablet',
        label: 'Custom Tablet',
        createInitialState: jest.fn().mockReturnValue({
          type: 'custom',
          data: { customData: 'value' }
        }),
        serializeState: jest.fn().mockReturnValue('{"type":"custom","data":{"customData":"value"}}'),
      };

      mockDynamicTabletRegistry.getById.mockResolvedValue(mockCustomTablet);

      const message: TabletActionMessage = {
        targetTablet: 'custom-tablet',
        action: 'new-tab',
        payload: { customPayload: 'test' },
        source: { titleHint: 'Custom Title' },
      };

      await tabletActionService.handleAction(message);

      expect(mockDynamicTabletRegistry.getById).toHaveBeenCalledWith('custom-tablet');
      expect(mockCustomTablet.createInitialState).toHaveBeenCalledWith({ customPayload: 'test' });
      expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Custom Title',
          tabletState: '{"type":"custom","data":{"customData":"value"}}',
        }),
        false
      );
    });
  });

  describe('type safety', () => {
    it('should maintain type safety for generic payload', async () => {
      mockDynamicTabletRegistry.getById.mockResolvedValue(mockTablet);

      interface CustomPayload {
        customField: string;
        numericField: number;
      }

      const message: TabletActionMessage<CustomPayload> = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: {
          customField: 'test',
          numericField: 42,
        },
        source: {},
      };

      await tabletActionService.handleAction(message);

      expect(mockTablet.createInitialState).toHaveBeenCalledWith({
        customField: 'test',
        numericField: 42,
      });
    });

    it('should respect side parameter when opening tabs', async () => {
      const message: TabletActionMessage = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: { content: 'test content' },
        source: { 
          tabId: 'source-tab',
          side: 'right'
        },
      };

      await tabletActionService.handleAction(message);

      expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: 'Test Tablet',
        }),
        true // toRightSide should be true when source.side is 'right'
      );
    });

    it('should default to left side when side parameter is not provided', async () => {
      const message: TabletActionMessage = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: { content: 'test content' },
        source: { 
          tabId: 'source-tab'
        },
      };

      await tabletActionService.handleAction(message);

      expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: 'Test Tablet',
        }),
        false // toRightSide should be false when source.side is not provided
      );
    });

    it('should open to left side when side parameter is explicitly left', async () => {
      const message: TabletActionMessage = {
        targetTablet: 'test-tablet',
        action: 'new-tab',
        payload: { content: 'test content' },
        source: { 
          tabId: 'source-tab',
          side: 'left'
        },
      };

      await tabletActionService.handleAction(message);

      expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          title: 'Test Tablet',
        }),
        false // toRightSide should be false when source.side is 'left'
      );
    });
  });
});