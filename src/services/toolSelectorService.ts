import { tabletMetadata } from '../tablets/tabletMetadata';
import { smartViewRegistry } from '../views/registry';
import { formatRegistry } from '../formats/registry';
import { FileText, Layers, Package } from '../components/Icons';
import { getRecentTools, addRecentTool } from '../db';

export type ToolType = 'tablet' | 'smartview' | 'format';

export interface ToolItem {
    id: string;
    type: ToolType;
    label: string;
    description?: string;
    icon?: any; // LucideIcon
    keywords?: string[];
    languageId?: string;
}

class ToolSelectorService {
    /**
     * Get all available tools (tablets and smart views)
     */
    async getAllTools(): Promise<ToolItem[]> {
        const tablets: ToolItem[] = tabletMetadata.map(tablet => ({
            id: tablet.id,
            type: 'tablet',
            label: tablet.label,
            description: tablet.description,
            keywords: tablet.keywords,
            icon: Layers, // Default icon for tablets if none specified
        }));

        const smartViews: ToolItem[] = smartViewRegistry.getAllViews().map(view => ({
            id: view.id,
            type: 'smartview',
            label: view.label,
            description: `View ${view.languageId.toUpperCase()} content using ${view.label}`,
            languageId: view.languageId,
            icon: view.icon || Package,
            keywords: [view.languageId, 'view', 'smart', view.label.toLowerCase()],
        }));

        return [...tablets, ...smartViews];
    }

    /**
     * Get all formats (for search only)
     */
    getAllFormats(): ToolItem[] {
        return formatRegistry.getAll().map(format => ({
            id: format.id,
            type: 'format',
            label: format.name,
            description: `Create new ${format.name} tab`,
            languageId: format.id,
            icon: FileText,
            keywords: [format.id, ...format.extensions, format.name.toLowerCase()],
        }));
    }

    /**
     * Search for tools and formats
     */
    async search(query: string): Promise<{
        tablets: ToolItem[];
        smartViews: ToolItem[];
        formats: ToolItem[];
    }> {
        const normalizedQuery = query.toLowerCase().trim();
        if (!normalizedQuery) {
            const allTools = await this.getAllTools();
            return {
                tablets: allTools.filter(t => t.type === 'tablet'),
                smartViews: allTools.filter(t => t.type === 'smartview'),
                formats: [], // Don't show formats by default
            };
        }

        const allTools = await this.getAllTools();
        const allFormats = this.getAllFormats();

        const matches = (item: ToolItem) => {
            return (
                item.label.toLowerCase().includes(normalizedQuery) ||
                item.id.toLowerCase().includes(normalizedQuery) ||
                item.description?.toLowerCase().includes(normalizedQuery) ||
                item.keywords?.some(k => k.toLowerCase().includes(normalizedQuery))
            );
        };

        return {
            tablets: allTools.filter(t => t.type === 'tablet' && matches(t)),
            smartViews: allTools.filter(t => t.type === 'smartview' && matches(t)),
            formats: allFormats.filter(matches),
        };
    }

    /**
     * Get recently used items
     */
    async getRecentItems(): Promise<ToolItem[]> {
        const recentIds = await getRecentTools();
        const allTools = await this.getAllTools();
        const allFormats = this.getAllFormats();
        const allItems = [...allTools, ...allFormats];

        return recentIds
            .map(id => allItems.find(item => this.getGlobalId(item) === id))
            .filter((item): item is ToolItem => !!item);
    }

    /**
     * Record tool usage
     */
    async recordUsage(item: ToolItem) {
        await addRecentTool(this.getGlobalId(item));
    }

    /**
     * Get a unique ID across all types
     */
    private getGlobalId(item: ToolItem): string {
        return `${item.type}:${item.id}`;
    }
}

export const toolSelectorService = new ToolSelectorService();
