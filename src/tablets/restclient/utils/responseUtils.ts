import { HttpResponse } from '../types';

/**
 * Formats a response body based on content type
 */
export function formatResponseBody(response: HttpResponse): { formatted: string; language: string } {
  const contentType = response.contentType || '';
  const body = response.body || '';
  
  // Try to format JSON
  if (contentType.includes('application/json') || contentType.includes('json')) {
    try {
      const parsed = JSON.parse(body);
      return {
        formatted: JSON.stringify(parsed, null, 2),
        language: 'json'
      };
    } catch (e) {
      // If parsing fails, return as-is
      return { formatted: body, language: 'json' };
    }
  }
  
  // XML formatting
  if (contentType.includes('application/xml') || contentType.includes('text/xml') || contentType.includes('xml')) {
    return { formatted: body, language: 'xml' };
  }
  
  // HTML formatting
  if (contentType.includes('text/html') || contentType.includes('html')) {
    return { formatted: body, language: 'html' };
  }
  
  // JavaScript formatting
  if (contentType.includes('application/javascript') || contentType.includes('javascript')) {
    return { formatted: body, language: 'javascript' };
  }
  
  // CSS formatting
  if (contentType.includes('text/css') || contentType.includes('css')) {
    return { formatted: body, language: 'css' };
  }
  
  // Default to plaintext
  return { formatted: body, language: 'plaintext' };
}

/**
 * Gets a color for the status code
 */
export function getStatusCodeColor(status: number): string {
  if (status >= 200 && status < 300) {
    return 'text-green-400'; // Success
  } else if (status >= 300 && status < 400) {
    return 'text-blue-400'; // Redirection
  } else if (status >= 400 && status < 500) {
    return 'text-yellow-400'; // Client Error
  } else if (status >= 500) {
    return 'text-red-400'; // Server Error
  }
  return 'text-gray-400'; // Default
}

/**
 * Formats bytes to a human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats milliseconds to a human-readable string
 */
export function formatTime(ms: number): string {
  if (ms < 1) return '< 1 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}