import { Tablet, TabletRegistry, TabletState } from './types';
import { tabletMetadata, TabletMetadata } from './tabletMetadata';

// Type for lazy-loaded tablet modules
type LazyTabletModule = () => Promise<{ default: Tablet }>;

class DynamicTabletRegistryImpl implements TabletRegistry {
  private loadedTablets: Map<string, Tablet> = new Map();
  private lazyModules: Map<string, LazyTabletModule> = new Map();
  
  constructor() {
    // Register lazy modules for all tablets
    this.registerLazyModules();
  }

  private registerLazyModules() {
    // Use Vite's import.meta.glob to create lazy loading functions for all tablets
    // Try a more specific pattern to ensure we get all tablet files
    const tabletModules = import.meta.glob('./*/**/*Tablet.tsx', { eager: false });
    
    console.log('🔍 DynamicRegistry: Found tablet modules:', Object.keys(tabletModules));
    
    // Also try a fallback pattern if the first one doesn't work
    if (Object.keys(tabletModules).length === 0) {
      console.warn('⚠️ DynamicRegistry: No modules found with pattern ./*/**/*Tablet.tsx, trying alternative pattern');
      const fallbackModules = import.meta.glob('./*/*Tablet.tsx', { eager: false });
      console.log('🔍 DynamicRegistry: Fallback pattern found:', Object.keys(fallbackModules));
      
      // Use fallback modules if available
      if (Object.keys(fallbackModules).length > 0) {
        Object.entries(fallbackModules).forEach(([modulePath, importFn]) => {
          console.log(`📁 DynamicRegistry: Registering fallback module: ${modulePath}`);
          this.lazyModules.set(modulePath, importFn as LazyTabletModule);
        });
      }
    } else {
      // Map each module path to a lazy loading function
      Object.entries(tabletModules).forEach(([modulePath, importFn]) => {
        console.log(`📁 DynamicRegistry: Registering module: ${modulePath}`);
        // Store the module path for later use
        this.lazyModules.set(modulePath, importFn as LazyTabletModule);
      });
    }
    
    console.log(`📊 DynamicRegistry: Registered ${this.lazyModules.size} lazy modules`);
  }

  private extractTabletId(modulePath: string): string | null {
    // Extract tablet ID from module path like './converter/ConverterTablet.tsx'
    const match = modulePath.match(/\.\/([^\/]+)\/[^\/]+Tablet\.tsx$/);
    return match ? match[1] : null;
  }

  // Get all available tablet metadata (eager loading)
  getAllMetadata(): TabletMetadata[] {
    return tabletMetadata;
  }

  // Get tablet by ID (lazy loading)
  async getById(id: string): Promise<Tablet | undefined> {
    console.log(`🔍 DynamicRegistry: Looking for tablet with ID: ${id}`);
    
    // Check if already loaded
    if (this.loadedTablets.has(id)) {
      console.log(`✅ DynamicRegistry: Tablet ${id} already loaded from cache`);
      return this.loadedTablets.get(id);
    }

    console.log(`📁 DynamicRegistry: Available modules:`, Array.from(this.lazyModules.keys()));

    // Find the module that contains this tablet ID
    let targetModule: string | null = null;
    for (const [modulePath, lazyModule] of this.lazyModules.entries()) {
      console.log(`🔍 DynamicRegistry: Checking module: ${modulePath}`);
      try {
        // Load the module to check its ID
        const module = await lazyModule();
        
        // Try to find the tablet export - it could be default or named
        let tablet: Tablet | undefined;
        
        // First try default export
        if (module.default && module.default.id) {
          tablet = module.default;
        } else {
          // Try to find named export that matches the pattern *Tablet
          const exportNames = Object.keys(module as Record<string, any>);
          const tabletExportName = exportNames.find(name => name.endsWith('Tablet'));
          if (tabletExportName && (module as Record<string, any>)[tabletExportName] && (module as Record<string, any>)[tabletExportName].id) {
            tablet = (module as Record<string, any>)[tabletExportName];
          }
        }
        
        console.log(`📱 DynamicRegistry: Module ${modulePath} exports tablet with ID: ${tablet?.id}`);
        
        if (tablet && tablet.id === id) {
          targetModule = modulePath;
          console.log(`✅ DynamicRegistry: Found target module: ${targetModule}`);
          break;
        }
      } catch (error) {
        console.warn(`⚠️ DynamicRegistry: Failed to check module ${modulePath}:`, error);
        continue;
      }
    }

    if (!targetModule) {
      console.error(`❌ DynamicRegistry: No module found for tablet: ${id}`);
      console.log(`📋 DynamicRegistry: Available tablet IDs in metadata:`, tabletMetadata.map(t => t.id));
      return undefined;
    }

    try {
      // Load the tablet implementation
      const lazyModule = this.lazyModules.get(targetModule);
      if (!lazyModule) {
        console.error(`❌ DynamicRegistry: Lazy module not found for ${targetModule}`);
        return undefined;
      }

      console.log(`🔄 DynamicRegistry: Loading tablet from module: ${targetModule}`);
      const module = await lazyModule();
      
      // Try to find the tablet export - it could be default or named
      let tablet: Tablet | undefined;
      
      // First try default export
      if (module.default && module.default.id) {
        tablet = module.default;
      } else {
        // Try to find named export that matches the pattern *Tablet
        const exportNames = Object.keys(module as Record<string, any>);
        const tabletExportName = exportNames.find(name => name.endsWith('Tablet'));
        if (tabletExportName && (module as Record<string, any>)[tabletExportName] && (module as Record<string, any>)[tabletExportName].id) {
          tablet = (module as Record<string, any>)[tabletExportName];
        }
      }
      
      if (!tablet || !tablet.id) {
        console.error(`❌ DynamicRegistry: Invalid tablet loaded for ${id}:`, tablet);
        return undefined;
      }
      
      console.log(`✅ DynamicRegistry: Successfully loaded tablet ${tablet.id} from ${targetModule}`);
      
      // Cache the loaded tablet
      this.loadedTablets.set(id, tablet);
      
      return tablet;
    } catch (error) {
      console.error(`❌ DynamicRegistry: Failed to load tablet ${id}:`, error);
      return undefined;
    }
  }

  // Search tablets by query (using metadata only)
  search(query: string): TabletMetadata[] {
    if (!query) return tabletMetadata;
    
    const normalizedQuery = query.toLowerCase();
    return tabletMetadata.filter(tablet => {
      return tablet.id.toLowerCase().includes(normalizedQuery) ||
             tablet.label.toLowerCase().includes(normalizedQuery) ||
             tablet.keywords.some(k => k.toLowerCase().includes(normalizedQuery));
    });
  }

  // Check if a tablet is loaded
  isLoaded(id: string): boolean {
    return this.loadedTablets.has(id);
  }

  // Create initial state for a tablet (using metadata)
  createInitialState(id: string): TabletState | null {
    const metadata = tabletMetadata.find(t => t.id === id);
    if (!metadata) {
      console.error(`No metadata found for tablet: ${id}`);
      return null;
    }

    // We can't create initial state without the implementation
    // This will be handled when the tablet is actually loaded
    return null;
  }
}

// Export singleton instance
export const dynamicTabletRegistry = new DynamicTabletRegistryImpl(); 