import { ArrowTipStyle } from '../types';

// Arrow tip styles in cycling order
export const ARROW_TIP_STYLES: ArrowTipStyle[] = [
  'none',
  'simple',
  'filled-triangle',
  'outline-triangle',
  'filled-circle',
  'outline-circle',
  'filled-diamond',
  'outline-diamond',
  'cross-circle',
  'dot',
  'arrowhead',
  'double-line'
];

/**
 * Cycles through arrow tip styles in the predefined order
 * @param currentTip - The current arrow tip style
 * @returns The next arrow tip style in the cycle
 */
export const cycleArrowTip = (currentTip: ArrowTipStyle | undefined): ArrowTipStyle => {
  // If no current tip, start with 'simple' instead of 'none'
  if (!currentTip) {
    return 'simple';
  }
  
  const currentIndex = ARROW_TIP_STYLES.indexOf(currentTip);
  const nextIndex = (currentIndex + 1) % ARROW_TIP_STYLES.length;
  return ARROW_TIP_STYLES[nextIndex];
};

/**
 * Gets the default arrow tip style for new lines
 * @returns The default arrow tip style
 */
export const getDefaultArrowTip = (): ArrowTipStyle => 'simple';

/**
 * Checks if an arrow tip style is valid
 * @param style - The arrow tip style to validate
 * @returns True if the style is valid
 */
export const isValidArrowTipStyle = (style: string): style is ArrowTipStyle => {
  return ARROW_TIP_STYLES.includes(style as ArrowTipStyle);
}; 