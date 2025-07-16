import { Tablet, TabletRegistry, TabletState } from "./types";
import { tabletMetadata, TabletMetadata } from "./tabletMetadata";

// Type for lazy-loaded tablet modules. Can have default or named exports.
type LazyTabletModule = () => Promise<{ default?: Tablet; [key: string]: any }>;

class DynamicTabletRegistryImpl implements TabletRegistry {
  private loadedTablets: Map<string, Tablet> = new Map();
  private lazyModules: Map<string, LazyTabletModule>;

  constructor() {
    this.lazyModules = this.createLazyModuleMap();
  }

  // Creates a direct map from tablet ID to its dynamic import function.
  private createLazyModuleMap(): Map<string, LazyTabletModule> {
    const modules = import.meta.glob("./*/*Tablet.tsx") as Record<
      string,
      LazyTabletModule
    >;
    const moduleMap = new Map<string, LazyTabletModule>();

    for (const path in modules) {
      // e.g., from './calculator/CalculatorTablet.tsx' extracts 'calculator'
      const match = path.match(/\.\/([^/]+)\//);
      if (match && match[1]) {
        const tabletId = match[1];
        moduleMap.set(tabletId, modules[path]);
      } else {
        console.warn(
          `⚠️ DynamicRegistry: Could not extract tablet ID from path: ${path}`,
        );
      }
    }
    return moduleMap;
  }

  getAllMetadata(): TabletMetadata[] {
    return tabletMetadata;
  }

  async getById(id: string): Promise<Tablet | undefined> {
    // 1. Check cache first
    if (this.loadedTablets.has(id)) {
      return this.loadedTablets.get(id);
    }

    // 2. Find the specific lazy loading function for this ID
    const lazyLoadFn = this.lazyModules.get(id);
    if (!lazyLoadFn) {
      console.error(
        `❌ DynamicRegistry: No module found for tablet ID '${id}'.`,
      );
      return undefined;
    }

    // 3. Load ONLY the required module
    try {
      const module = await lazyLoadFn();

      // Try to find the tablet export - it could be default or named
      let tablet: Tablet | undefined;

      // First try default export
      if (module.default && module.default.id) {
        tablet = module.default;
      } else {
        // Try to find named export that matches the pattern *Tablet
        const exportNames = Object.keys(module as Record<string, any>);
        const tabletExportName = exportNames.find((name) =>
          name.endsWith("Tablet"),
        );
        if (
          tabletExportName &&
          (module as Record<string, any>)[tabletExportName] &&
          (module as Record<string, any>)[tabletExportName].id
        ) {
          tablet = (module as Record<string, any>)[tabletExportName];
        }
      }

      if (tablet && tablet.id === id) {
        this.loadedTablets.set(id, tablet); // Cache it
        return tablet;
      } else {
        console.error(
          `❌ DynamicRegistry: Module for '${id}' did not export a matching tablet.`,
        );
        return undefined;
      }
    } catch (error) {
      console.error(`❌ DynamicRegistry: Error loading tablet '${id}':`, error);
      return undefined;
    }
  }

  search(query: string): TabletMetadata[] {
    const results = query 
      ? tabletMetadata.filter(
          (tablet) =>
            tablet.id.toLowerCase().includes(query.toLowerCase()) ||
            tablet.label.toLowerCase().includes(query.toLowerCase()) ||
            tablet.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase())),
        )
      : tabletMetadata;
    
    // Sort by label alphabetically
    return results.sort((a, b) => a.label.localeCompare(b.label));
  }

  isLoaded(id: string): boolean {
    return this.loadedTablets.has(id);
  }

  createInitialState(id: string): TabletState | null {
    // This is problematic with lazy loading. The implementation should be loaded first.
    const loadedTablet = this.loadedTablets.get(id);
    if (loadedTablet) {
      return loadedTablet.createInitialState();
    }
    // Cannot create state for a non-loaded tablet.
    // The TabletView component now handles this correctly by creating a default state
    // only after the tablet has been successfully loaded.
    console.warn(
      `Attempted to create initial state for non-loaded tablet: ${id}`,
    );
    return null;
  }
}

export const dynamicTabletRegistry = new DynamicTabletRegistryImpl();
