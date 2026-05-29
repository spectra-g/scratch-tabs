export interface LinePosition {
  line: number;
  column: number;
  lineStart: number;
  lineEnd: number;
  text: string;
}

export function buildLineStarts(input: string): number[] {
  const starts = [0];
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

export function getLinePosition(input: string, lineStarts: number[], index: number): LinePosition {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (lineStarts[mid] <= index) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const lineIndex = Math.max(0, high);
  const lineStart = lineStarts[lineIndex];
  const nextLineStart = lineStarts[lineIndex + 1] ?? input.length + 1;
  const lineEnd = Math.max(lineStart, nextLineStart - 1);

  return {
    line: lineIndex + 1,
    column: index - lineStart + 1,
    lineStart,
    lineEnd,
    text: input.slice(lineStart, lineEnd).replace(/\r$/, ""),
  };
}

export function isDiffAddedLine(lineText: string): boolean {
  return lineText.startsWith("+") && !lineText.startsWith("+++");
}
