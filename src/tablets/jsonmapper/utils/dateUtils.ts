/**
 * Format a timestamp as a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  // Convert to seconds
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) {
    return 'just now';
  }
  
  // Convert to minutes
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  
  // Convert to hours
  const hours = Math.floor(minutes / 60);
  
  if (hours < 24) {
    return `${hours}h ago`;
  }
  
  // Convert to days
  const days = Math.floor(hours / 24);
  
  if (days < 30) {
    return `${days}d ago`;
  }
  
  // Convert to months
  const months = Math.floor(days / 30);
  
  if (months < 12) {
    return `${months}mo ago`;
  }
  
  // Convert to years
  const years = Math.floor(months / 12);
  
  return `${years}y ago`;
}

/**
 * Format a timestamp as a date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format a timestamp as a time string
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString();
}

/**
 * Format a timestamp as a date and time string
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}