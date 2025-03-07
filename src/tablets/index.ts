import { tabletRegistry } from './registry';
import { PasswordTablet } from './password/PasswordTablet';
import { CalculatorTablet } from './calculator/CalculatorTablet';
import { RunCodeTablet } from './runcode/RunCodeTablet';
import { TempEmailTablet } from './email/TempEmailTablet';
import { RandomUserTablet } from './usergen/RandomUserTablet';

// Register built-in tablets
tabletRegistry.register(PasswordTablet);
tabletRegistry.register(CalculatorTablet);
tabletRegistry.register(RunCodeTablet);
tabletRegistry.register(TempEmailTablet);
tabletRegistry.register(RandomUserTablet);

export { TabletSelector } from './components/TabletSelector';
export { tabletRegistry } from './registry';
export type { Tablet, TabletState } from './types';