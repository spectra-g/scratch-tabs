/**
 * Tablet Bridge - Single point of access for external dependencies
 * 
 * This bridge provides a facade/adapter pattern to decouple tablets from external dependencies.
 * All tablets should use this bridge instead of directly importing from stores, hooks, or utilities
 * outside the tablets directory.
 * 
 * Benefits:
 * - Reduces coupling between tablets and external code
 * - Makes tablets more testable by providing a mockable interface
 * - Centralizes external dependencies in one place
 * - Makes it easier to refactor external APIs without affecting all tablets
 */

// Main bridge interface and implementation
export type { TabletBridge, TabCreationOptions, DeviceInfo, LanguageDetectionResult, SplitViewOperations } from './types';
export { tabletBridge } from './implementation';

// React hooks for easy usage in tablet components
export { 
  useTabletBridge, 
  useTabletTabCreation, 
  useTabletDeviceInfo, 
  useTabletLanguageDetection 
} from './hook';