import { toolService } from '../toolService';
import { getRecentTools, addRecentTool } from '../../db';

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
    value: {
        randomUUID: jest.fn(() => 'test-uuid-123'),
    },
});

// Mock dependencies
jest.mock('../../tablets/tabletMetadata', () => ({
    tabletMetadata: [
        { id: 'tablet1', label: 'Tablet One', keywords: ['key1'], description: 'Desc one' },
        { id: 'tablet2', label: 'Tablet Two', keywords: ['key2'], description: 'Desc two' },
    ]
}));

jest.mock('../../views/registry', () => ({
    smartViewRegistry: {
        getAllViews: jest.fn().mockReturnValue([
            { id: 'view1', label: 'View One', languageId: 'json' }
        ])
    }
}));

jest.mock('../../formats/registry', () => ({
    formatRegistry: {
        getAll: jest.fn().mockReturnValue([
            { id: 'json', name: 'JSON', extensions: ['json'] }
        ]),
        getById: jest.fn().mockImplementation((id: string) => {
            if (id === 'json') return { id: 'json', name: 'JSON', extensions: ['json'], sampleContent: () => '{}' };
            return null;
        })
    }
}));

jest.mock('../../db', () => ({
    getRecentTools: jest.fn().mockResolvedValue([]),
    addRecentTool: jest.fn().mockResolvedValue(undefined),
}));
describe('ToolService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllTools', () => {
        it('should aggregate all tools from registries', async () => {
            const tools = await toolService.getAllTools();
            expect(tools.length).toBe(5); // 1 document + 2 tablets + 1 view + 1 format
            expect(tools.some((t: any) => t.type === 'document')).toBe(true);
            expect(tools.some((t: any) => t.type === 'tablet')).toBe(true);
            expect(tools.some((t: any) => t.type === 'smartview')).toBe(true);
            expect(tools.some((t: any) => t.type === 'format')).toBe(true);
        });
    });

    describe('search', () => {
        it('should return weighted results', async () => {
            // "tablet" matches labels of tablet1 and tablet2
            const results = await toolService.search('Tablet One');
            expect(results.tablets[0].id).toBe('tablet1');
        });

        it('should prioritize Title matches over Keywords and Description', async () => {
            // Create a custom mock for this test to verify weighting
            // Assuming toolService.search uses the internal getAllTools

            // Search for "key1" which is a keyword for tablet1
            const res1 = await toolService.search('key1');
            expect(res1.tablets[0].id).toBe('tablet1');

            // Search for "Desc" which is in descriptions
            const res2 = await toolService.search('Desc');
            expect(res2.tablets.length).toBe(2);
        });

        it('should return all items grouped when query is empty', async () => {
            const results = await toolService.search('');
            expect(results.tablets.length).toBe(2);
            expect(results.documents.length).toBe(1);
            expect(results.smartViews.length).toBe(1);
            expect(results.formats.length).toBe(1);
        });
    });

    describe('executeTool', () => {
        const mockContext = {
            side: 'left' as const,
            activeWorkspaceId: 'ws1',
            addTab: jest.fn(),
            updateTab: jest.fn(),
            activeTabId: 'tab1',
        };

        it('should record usage and execute format tool', async () => {
            const tools = await toolService.getAllTools();
            const formatTool = tools.find(t => t.type === 'format')!;

            await toolService.executeTool(formatTool, mockContext);

            expect(addRecentTool).toHaveBeenCalledWith('format:json');
            expect(mockContext.addTab).toHaveBeenCalledWith(expect.objectContaining({
                language: 'json',
                content: '{}'
            }), false);
        });

        it('should record usage and execute smartview tool', async () => {
            const tools = await toolService.getAllTools();
            const svTool = tools.find(t => t.type === 'smartview')!;

            await toolService.executeTool(svTool, mockContext);

            expect(addRecentTool).toHaveBeenCalledWith('smartview:view1');
            expect(mockContext.updateTab).toHaveBeenCalledWith('tab1', { activeViewId: 'view1' });
        });

        it('should create a Canvas through the document action port', async () => {
            const tools = await toolService.getAllTools();
            const canvasTool = tools.find(t => t.type === 'document')!;
            const createCanvas = jest.fn().mockResolvedValue('canvas-1');

            await toolService.executeTool(canvasTool, {
                ...mockContext,
                side: 'right',
                createCanvas,
            });

            expect(addRecentTool).toHaveBeenCalledWith('document:canvas');
            expect(createCanvas).toHaveBeenCalledWith(true);
        });
    });

    describe('getRecentItems', () => {
        it('should return hydrated recent tools', async () => {
            (getRecentTools as jest.Mock).mockResolvedValue(['tablet:tablet1', 'format:json']);

            const recent = await toolService.getRecentItems();
            expect(recent.length).toBe(2);
            expect(recent[0].id).toBe('tablet1');
            expect(recent[1].id).toBe('json');
        });
    });
});
