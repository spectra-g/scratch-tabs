import {
  createComparisonItem,
  createCurrentComparisonItem,
  compareResponses,
  formatValueForDisplay,
  getDiffTypeClass,
  canCompareItems,
  getComparisonSummary,
} from '../utils/comparisonUtils';
import { ResponseHistoryItem, HttpResponse, ComparisonItem } from '../types';

// Mock data
const mockResponse1: HttpResponse = {
  status: 200,
  statusText: 'OK',
  headers: {
    'content-type': 'application/json',
    'cache-control': 'no-cache',
  },
  body: JSON.stringify({ id: 1, name: 'Test', active: true }),
  size: 1024,
  timing: {
    dns: 10,
    connection: 20,
    tls: 30,
    firstByte: 100,
    download: 50,
    total: 210,
  },
  contentType: 'application/json',
};

const mockResponse2: HttpResponse = {
  status: 201,
  statusText: 'Created',
  headers: {
    'content-type': 'application/json',
    'x-custom': 'test-value',
  },
  body: JSON.stringify({ id: 2, name: 'Test Updated', active: false, email: 'test@example.com' }),
  size: 1536,
  timing: {
    dns: 15,
    connection: 25,
    tls: 35,
    firstByte: 120,
    download: 60,
    total: 255,
  },
  contentType: 'application/json',
};

const mockHistoryItem: ResponseHistoryItem = {
  id: 'test-1',
  timestamp: 1700000000000,
  method: 'GET',
  url: 'https://api.example.com/test',
  status: 200,
  statusText: 'OK',
  duration: 210,
  isPinned: false,
  response: mockResponse1,
};

describe('comparisonUtils', () => {
  describe('createComparisonItem', () => {
    it('should create a comparison item from history item', () => {
      const result = createComparisonItem(mockHistoryItem);
      
      expect(result).toEqual({
        id: 'test-1',
        label: 'GET https://api.example.com/test (200)',
        response: mockResponse1,
        timestamp: 1700000000000,
        method: 'GET',
        url: 'https://api.example.com/test',
      });
    });
  });

  describe('createCurrentComparisonItem', () => {
    it('should create a comparison item for current response', () => {
      const result = createCurrentComparisonItem(mockResponse1, 'POST', 'https://api.example.com/create');
      
      expect(result).toEqual({
        id: 'current',
        label: 'POST https://api.example.com/create (200) - Current',
        response: mockResponse1,
        timestamp: expect.any(Number),
        method: 'POST',
        url: 'https://api.example.com/create',
      });
    });
  });

  describe('compareResponses', () => {
    it('should compare two identical responses', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({ ...mockHistoryItem, id: 'test-2' });
      
      const result = compareResponses(item1, item2);
      
      expect(result.statusDiff).toBeNull();
      expect(result.headersDiff).toHaveLength(0);
      expect(result.bodyDiff).toHaveLength(0);
      expect(result.sizeDiff).toBeNull();
    });

    it('should detect status code differences', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: { ...mockResponse1, status: 404, statusText: 'Not Found' },
      });
      
      const result = compareResponses(item1, item2);
      
      expect(result.statusDiff).toEqual({
        type: 'modified',
        path: 'status',
        oldValue: 200,
        newValue: 404,
        description: 'Status code changed from 200 to 404',
      });
    });

    it('should detect header differences', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: { ...mockResponse1, headers: { 'content-type': 'application/xml' } },
      });
      
      const result = compareResponses(item1, item2);
      
      expect(result.headersDiff).toContainEqual({
        type: 'modified',
        path: 'headers.content-type',
        oldValue: 'application/json',
        newValue: 'application/xml',
        description: 'Header content-type changed from "application/json" to "application/xml"',
      });
      
      expect(result.headersDiff).toContainEqual({
        type: 'removed',
        path: 'headers.cache-control',
        oldValue: 'no-cache',
        description: 'Removed header cache-control',
      });
    });

    it('should detect added headers', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: {
          ...mockResponse1,
          headers: { ...mockResponse1.headers, 'x-new-header': 'new-value' },
        },
      });
      
      const result = compareResponses(item1, item2);
      
      expect(result.headersDiff).toContainEqual({
        type: 'added',
        path: 'headers.x-new-header',
        newValue: 'new-value',
        description: 'Added header x-new-header',
      });
    });

    it('should detect JSON body differences', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: { ...mockResponse1, body: JSON.stringify({ id: 1, name: 'Updated Test', active: false }) },
      });
      
      const result = compareResponses(item1, item2);
      
      expect(result.bodyDiff).toContainEqual({
        type: 'modified',
        path: 'body.name',
        oldValue: 'Test',
        newValue: 'Updated Test',
        description: 'Value changed from "Test" to "Updated Test"',
      });
      
      expect(result.bodyDiff).toContainEqual({
        type: 'modified',
        path: 'body.active',
        oldValue: true,
        newValue: false,
        description: 'Value changed from true to false',
      });
    });

    it('should detect added and removed JSON properties', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: { ...mockResponse1, body: JSON.stringify({ id: 1, email: 'test@example.com' }) },
      });
      
      const result = compareResponses(item1, item2);
      
      expect(result.bodyDiff).toContainEqual({
        type: 'added',
        path: 'body.email',
        newValue: 'test@example.com',
        description: 'Added property email',
      });
      
      expect(result.bodyDiff).toContainEqual({
        type: 'removed',
        path: 'body.name',
        oldValue: 'Test',
        description: 'Removed property name',
      });
    });

    it('should detect size differences', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: { ...mockResponse1, size: 2048 },
      });
      
      const result = compareResponses(item1, item2);
      
      expect(result.sizeDiff).toEqual({
        type: 'modified',
        path: 'size',
        oldValue: 1024,
        newValue: 2048,
        description: 'Response size changed from 1024 to 2048 bytes',
      });
    });

    it('should detect timing differences', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: {
          ...mockResponse1,
          timing: { ...mockResponse1.timing, total: 300 },
        },
      });
      
      const result = compareResponses(item1, item2);
      
      expect(result.timingDiff).toContainEqual({
        type: 'modified',
        path: 'timing.total',
        oldValue: 210,
        newValue: 300,
        description: 'Value changed from 210 to 300',
      });
    });

    it('should handle non-JSON body comparison', () => {
      const item1 = createComparisonItem({
        ...mockHistoryItem,
        response: { ...mockResponse1, body: 'Plain text response' },
      });
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: { ...mockResponse1, body: 'Updated plain text response' },
      });
      
      const result = compareResponses(item1, item2);
      
      expect(result.bodyDiff).toContainEqual({
        type: 'modified',
        path: 'body',
        oldValue: 'Plain text response',
        newValue: 'Updated plain text response',
        description: 'Response body content changed',
      });
    });
  });

  describe('formatValueForDisplay', () => {
    it('should format null values', () => {
      expect(formatValueForDisplay(null)).toBe('null');
      expect(formatValueForDisplay(undefined)).toBe('null');
    });

    it('should format string values', () => {
      expect(formatValueForDisplay('test')).toBe('test');
    });

    it('should format object values', () => {
      const obj = { key: 'value' };
      expect(formatValueForDisplay(obj)).toBe('{\n  "key": "value"\n}');
    });

    it('should format primitive values', () => {
      expect(formatValueForDisplay(123)).toBe('123');
      expect(formatValueForDisplay(true)).toBe('true');
    });
  });

  describe('getDiffTypeClass', () => {
    it('should return correct classes for diff types', () => {
      expect(getDiffTypeClass('added')).toBe('text-green-400 bg-green-500/10');
      expect(getDiffTypeClass('removed')).toBe('text-red-400 bg-red-500/10');
      expect(getDiffTypeClass('modified')).toBe('text-yellow-400 bg-yellow-500/10');
      expect(getDiffTypeClass('unchanged')).toBe('text-gray-400 bg-gray-500/10');
    });
  });

  describe('canCompareItems', () => {
    it('should return true for exactly 2 items', () => {
      const items: ComparisonItem[] = [
        createComparisonItem(mockHistoryItem),
        createComparisonItem({ ...mockHistoryItem, id: 'test-2' }),
      ];
      
      expect(canCompareItems(items)).toBe(true);
    });

    it('should return false for other counts', () => {
      expect(canCompareItems([])).toBe(false);
      expect(canCompareItems([createComparisonItem(mockHistoryItem)])).toBe(false);
      expect(canCompareItems([
        createComparisonItem(mockHistoryItem),
        createComparisonItem({ ...mockHistoryItem, id: 'test-2' }),
        createComparisonItem({ ...mockHistoryItem, id: 'test-3' }),
      ])).toBe(false);
    });
  });

  describe('getComparisonSummary', () => {
    it('should return "No differences found" for identical responses', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({ ...mockHistoryItem, id: 'test-2' });
      const comparison = compareResponses(item1, item2);
      
      expect(getComparisonSummary(comparison)).toBe('No differences found');
    });

    it('should return correct count for single difference', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: { ...mockResponse1, status: 404 },
      });
      const comparison = compareResponses(item1, item2);
      
      expect(getComparisonSummary(comparison)).toBe('1 difference found');
    });

    it('should return correct count for multiple differences', () => {
      const item1 = createComparisonItem(mockHistoryItem);
      const item2 = createComparisonItem({
        ...mockHistoryItem,
        id: 'test-2',
        response: {
          ...mockResponse1,
          status: 404,
          size: 2048,
          headers: { 'content-type': 'application/xml' },
        },
      });
      const comparison = compareResponses(item1, item2);
      
      expect(getComparisonSummary(comparison)).toContain('differences found');
    });
  });
});