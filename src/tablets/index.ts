import { tabletRegistry } from './registry';
import { PasswordTablet } from './password/PasswordTablet';
import { CalculatorTablet } from './calculator/CalculatorTablet';

// Register built-in tablets
tabletRegistry.register(PasswordTablet);
tabletRegistry.register(CalculatorTablet);

export { TabletSelector } from './components/TabletSelector';
export { tabletRegistry } from './registry';
export type { Tablet, TabletState } from './types';