import { dynamicTabletRegistry } from './dynamicRegistry';

// For backward compatibility, we can still manually register tablets if needed
// But the dynamic system will handle most cases automatically

// Export the new metadata-based registry
export { dynamicTabletRegistry as tabletRegistry } from './dynamicRegistry';

// Export types
export type { Tablet, TabletState, TabletRegistry } from './types';
export type { TabletMetadata } from './tabletMetadata';

// Export metadata for direct access if needed
export { tabletMetadata } from './tabletMetadata';

// Export the tablet selector component
export { TabletSelector } from './components/TabletSelector';