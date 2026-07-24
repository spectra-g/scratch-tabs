interface ResolveCanvasPaneWidthOptions {
  observedWidth?: number;
  measuredWidth: number;
  previousWidth: number | null;
}

const isPositiveFiniteWidth = (
  width: number | null | undefined,
): width is number =>
  typeof width === "number" && Number.isFinite(width) && width > 0;

export const resolveCanvasPaneWidth = ({
  observedWidth,
  measuredWidth,
  previousWidth,
}: ResolveCanvasPaneWidthOptions): number | null => {
  if (isPositiveFiniteWidth(observedWidth)) return observedWidth;
  if (isPositiveFiniteWidth(measuredWidth)) return measuredWidth;
  if (isPositiveFiniteWidth(previousWidth)) return previousWidth;
  return null;
};
