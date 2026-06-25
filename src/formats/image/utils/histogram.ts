export interface ImageHistogram {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
  max: number;
}

export function buildHistogram(imageData: ImageData): ImageHistogram {
  const histogram: ImageHistogram = {
    red: Array(256).fill(0),
    green: Array(256).fill(0),
    blue: Array(256).fill(0),
    luminance: Array(256).fill(0),
    max: 0,
  };

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    histogram.red[r] += 1;
    histogram.green[g] += 1;
    histogram.blue[b] += 1;
    histogram.luminance[luminance] += 1;
    histogram.max = Math.max(
      histogram.max,
      histogram.red[r],
      histogram.green[g],
      histogram.blue[b],
      histogram.luminance[luminance],
    );
  }

  return histogram;
}
