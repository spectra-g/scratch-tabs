import { tabletMetadata } from '../tablets/tabletMetadata';
import { smartViewRegistry } from '../views/registry';
import { formatRegistry } from '../formats/registry';
import { FileCode, Eye, Layers, Tablet } from '../components/Icons';
import { getRecentTools, addRecentTool } from '../db';

export type ToolType = 'document' | 'tablet' | 'smartview' | 'format';

export interface ToolItem {
    id: string;
    type: ToolType;
    label: string;
    description?: string;
    icon?: any; // LucideIcon
    keywords?: string[];
    languageId?: string;
}

export interface ToolExecutionContext {
    side: 'left' | 'right';
    activeWorkspaceId: string;
    addTab: (tabData: any, isRightSide: boolean) => void;
    updateTab?: (tabId: string, updates: any) => void;
    activeTabId?: string;
    createCanvas?: (isRightSide: boolean) => Promise<string | undefined>;
}

class ToolService {
    /**
     * Get all available tools
     */
    async getAllTools(): Promise<ToolItem[]> {
        const documents: ToolItem[] = [{
            id: 'canvas',
            type: 'document',
            label: 'Canvas',
            description: 'Create a spatial Canvas document',
            icon: Layers,
            keywords: ['canvas', 'board', 'spatial', 'document'],
        }];
        const tablets: ToolItem[] = tabletMetadata.map(tablet => ({
            id: tablet.id,
            type: 'tablet',
            label: tablet.label,
            description: tablet.description,
            keywords: tablet.keywords,
            icon: (tablet as any).icon || Tablet,
        }));

        const smartViews: ToolItem[] = smartViewRegistry.getAllViews().map(view => ({
            id: view.id,
            type: 'smartview',
            label: view.label,
            description: `View ${view.languageId.toUpperCase()} content using ${view.label}`,
            languageId: view.languageId,
            icon: Eye,
            keywords: [view.languageId, 'view', 'smart', view.label.toLowerCase()],
        }));

        const formats: ToolItem[] = formatRegistry.getAll().map(format => ({
            id: format.id,
            type: 'format',
            label: format.name,
            description: `Create new ${format.name} tab`,
            languageId: format.id,
            icon: FileCode,
            keywords: [format.id, ...format.extensions, format.name.toLowerCase()],
        }));

        return [...documents, ...tablets, ...smartViews, ...formats];
    }

    /**
     * Search for tools with weighting: Title > Keywords > Description
     */
    async search(query: string): Promise<{
        tablets: ToolItem[];
        smartViews: ToolItem[];
        formats: ToolItem[];
        documents: ToolItem[];
    }> {
        const normalizedQuery = query.toLowerCase().trim();
        const allTools = await this.getAllTools();

        if (!normalizedQuery) {
            return {
                documents: allTools.filter(t => t.type === 'document'),
                tablets: allTools.filter(t => t.type === 'tablet'),
                smartViews: allTools.filter(t => t.type === 'smartview'),
                formats: allTools.filter(t => t.type === 'format'),
            };
        }

        const scoredItems = allTools.map(item => {
            let score = 0;
            if (item.label.toLowerCase().includes(normalizedQuery)) {
                score += 10;
                if (item.label.toLowerCase() === normalizedQuery) score += 5;
            }
            if (item.id.toLowerCase().includes(normalizedQuery)) score += 8;
            if (item.keywords?.some(k => k.toLowerCase().includes(normalizedQuery))) score += 5;
            if (item.description?.toLowerCase().includes(normalizedQuery)) score += 2;

            return { item, score };
        }).filter(res => res.score > 0)
            .sort((a, b) => b.score - a.score);

        const sortedItems = scoredItems.map(res => res.item);

        return {
            documents: sortedItems.filter(t => t.type === 'document'),
            tablets: sortedItems.filter(t => t.type === 'tablet'),
            smartViews: sortedItems.filter(t => t.type === 'smartview'),
            formats: sortedItems.filter(t => t.type === 'format'),
        };
    }

    /**
     * Execute a tool based on its type
     */
    async executeTool(tool: ToolItem, context: ToolExecutionContext) {
        // Record usage
        await addRecentTool(this.getGlobalId(tool));

        const { side, activeWorkspaceId, addTab, updateTab, activeTabId, createCanvas } = context;
        const isRightSide = side === 'right';

        if (tool.type === 'document') {
            if (tool.id !== 'canvas' || !createCanvas) {
                throw new Error(`Document tool ${tool.id} is not available`);
            }
            await createCanvas(isRightSide);
        } else if (tool.type === 'tablet') {
            const { dynamicTabletRegistry: tabletRegistry } = await import("../tablets/dynamicRegistry");
            const tablet = await tabletRegistry.getById(tool.id);
            if (tablet) {
                const state = tablet.createInitialState();
                const serializedState = tablet.serializeState(state);

                const tabData = {
                    id: crypto.randomUUID(),
                    title: tablet.label,
                    content: "",
                    language: "plaintext",
                    languageLocked: true,
                    isTablet: true,
                    tabletState: serializedState,
                    cursorPosition: { lineNumber: 1, column: 1 },
                    workspaceId: activeWorkspaceId || "default",
                    dateCreated: Date.now(),
                    lastModified: Date.now(),
                };

                if (updateTab && activeTabId) {
                    updateTab(activeTabId, tabData);
                } else {
                    addTab(tabData, isRightSide);
                }
            }
        } else if (tool.type === 'smartview') {
            const format = formatRegistry.getById(tool.languageId!);
            if (format) {
                const tabData = {
                    id: crypto.randomUUID(),
                    title: tool.label,
                    content: format.sampleContent(),
                    language: tool.languageId!,
                    languageLocked: false,
                    activeViewId: tool.id,
                    cursorPosition: { lineNumber: 1, column: 1 },
                    workspaceId: activeWorkspaceId || "default",
                    dateCreated: Date.now(),
                    lastModified: Date.now(),
                };

                if (updateTab && activeTabId) {
                    updateTab(activeTabId, { activeViewId: tool.id });
                } else {
                    addTab(tabData, isRightSide);
                }
            }
        } else if (tool.type === 'format') {
            const format = formatRegistry.getById(tool.id);
            if (format) {
                addTab({
                    id: crypto.randomUUID(),
                    title: format.name,
                    content: format.sampleContent(),
                    language: format.id,
                    languageLocked: false,
                    cursorPosition: { lineNumber: 1, column: 1 },
                    workspaceId: activeWorkspaceId || "default",
                    dateCreated: Date.now(),
                    lastModified: Date.now(),
                }, isRightSide);
            }
        }
    }

    /**
     * Get recently used items
     */
    async getRecentItems(): Promise<ToolItem[]> {
        const recentIds = await getRecentTools();
        const allTools = await this.getAllTools();

        return recentIds
            .map(id => allTools.find(item => this.getGlobalId(item) === id))
            .filter((item): item is ToolItem => !!item)
            .slice(0, 10);
    }

    /**
     * Get a unique ID across all types
     */
    private getGlobalId(item: ToolItem): string {
        return `${item.type}:${item.id}`;
    }
}

export const toolService = new ToolService();
