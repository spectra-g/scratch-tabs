const UNITS = ["B", "KB", "MB", "GB", "TB"];
const K = 1024;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(K)), UNITS.length - 1);
  return `${(bytes / Math.pow(K, i)).toFixed(1)} ${UNITS[i]}`;
}

export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
