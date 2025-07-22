export const formatDisplay = (value: any): string => {
  if (typeof value === "number") {
    return parseFloat(value.toPrecision(14)).toString();
  }
  return String(value);
};

export const getDisplayFontSize = (text: string): string => {
  const length = text?.length || 1;
  if (length > 24) return "text-xl";
  if (length > 16) return "text-2xl";
  return "text-3xl";
};