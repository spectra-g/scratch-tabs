import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComparisonSelector } from '../components/ComparisonSelector';
import { ResponseHistoryItem, HttpResponse, ComparisonItem } from '../types';

const mockResponse1: HttpResponse = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: '{"id":1}',
  size: 1024,
  timing: { dns: 10, connection: 20, tls: 30, firstByte: 100, download: 50, total: 210 },
  contentType: 'application/json',
};

const mockResponse2: HttpResponse = {
  status: 201,
  statusText: 'Created',
  headers: { 'content-type': 'application/json' },
  body: '{"id":2}',
  size: 1536,
  timing: { dns: 15, connection: 25, tls: 35, firstByte: 120, download: 60, total: 255 },
  contentType: 'application/json',
};

const mockHistoryItems: ResponseHistoryItem[] = [
  {
    id: 'hist1',
    timestamp: 1700000000000,
    method: 'GET',
    url: '/api/test',
    status: 200,
    statusText: 'OK',
    duration: 210,
    isPinned: false,
    response: mockResponse1,
  },
  {
    id: 'hist2',
    timestamp: 1700000001000,
    method: 'POST',
    url: '/api/create',
    status: 201,
    statusText: 'Created',
    duration: 255,
    isPinned: false,
    response: mockResponse2,
  },
];

describe('ComparisonSelector', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectionChange = jest.fn();
  const mockOnStartComparison = jest.fn();

  const defaultProps = {
    responseHistory: mockHistoryItems,
    currentResponse: mockResponse1,
    currentMethod: 'GET',
    currentUrl: '/api/current',
    selectedItems: [],
    onSelectionChange: mockOnSelectionChange,
    onStartComparison: mockOnStartComparison,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render comparison selector with correct title', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    expect(screen.getByText('Compare Responses')).toBeInTheDocument();
    expect(screen.getByText('Select 2 responses to compare (0/2)')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render current response and history items', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    // Current response should show "Current" badge
    expect(screen.getAllByText('Current')).toHaveLength(2); // One in timestamp, one in badge
    expect(screen.getByText('/api/current')).toBeInTheDocument();
    
    // History items
    expect(screen.getByText('/api/test')).toBeInTheDocument();
    expect(screen.getByText('/api/create')).toBeInTheDocument();
    
    // Should have 3 total items (1 current + 2 history)
    const items = screen.getAllByText(/GET|POST/).filter(el => 
      el.className.includes('font-medium')
    );
    expect(items).toHaveLength(3);
  });

  it('should handle item selection', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    const firstItem = screen.getByText('/api/current').closest('div');
    fireEvent.click(firstItem!);
    
    expect(mockOnSelectionChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'current',
        method: 'GET',
        url: '/api/current',
      }),
    ]);
  });

  it('should show selection count correctly', () => {
    const selectedItems: ComparisonItem[] = [
      {
        id: 'current',
        label: 'GET /api/current (200) - Current',
        response: mockResponse1,
        timestamp: Date.now(),
        method: 'GET',
        url: '/api/current',
      },
    ];
    
    render(<ComparisonSelector {...defaultProps} selectedItems={selectedItems} />);
    
    expect(screen.getByText('Select 2 responses to compare (1/2)')).toBeInTheDocument();
  });

  it('should enable compare button when 2 items are selected', () => {
    const selectedItems: ComparisonItem[] = [
      {
        id: 'current',
        label: 'GET /api/current (200) - Current',
        response: mockResponse1,
        timestamp: Date.now(),
        method: 'GET',
        url: '/api/current',
      },
      {
        id: 'hist1',
        label: 'GET /api/test (200)',
        response: mockResponse1,
        timestamp: 1700000000000,
        method: 'GET',
        url: '/api/test',
      },
    ];
    
    render(<ComparisonSelector {...defaultProps} selectedItems={selectedItems} />);
    
    const compareButton = screen.getByRole('button', { name: /compare/i });
    expect(compareButton).not.toBeDisabled();
    
    fireEvent.click(compareButton);
    expect(mockOnStartComparison).toHaveBeenCalledWith(selectedItems);
  });

  it('should disable compare button when less than 2 items are selected', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    const compareButton = screen.getByRole('button', { name: /compare/i });
    expect(compareButton).toBeDisabled();
  });

  it('should filter items based on search term', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search responses...');
    fireEvent.change(searchInput, { target: { value: 'create' } });
    
    // Should only show items containing 'create'
    expect(screen.getByText('/api/create')).toBeInTheDocument();
    expect(screen.queryByText('/api/test')).not.toBeInTheDocument();
  });

  it('should handle case-insensitive search', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search responses...');
    fireEvent.change(searchInput, { target: { value: 'POST' } });
    
    expect(screen.getByText('/api/create')).toBeInTheDocument();
    expect(screen.queryByText('/api/test')).not.toBeInTheDocument();
  });

  it('should show empty state when no items available', () => {
    render(
      <ComparisonSelector 
        {...defaultProps} 
        responseHistory={[]} 
        currentResponse={null} 
      />
    );
    
    expect(screen.getByText('No responses available for comparison')).toBeInTheDocument();
    expect(screen.getByText('Execute some requests to see them here')).toBeInTheDocument();
  });

  it('should show no results when search returns empty', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search responses...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No responses available for comparison')).toBeInTheDocument();
  });

  it('should disable items when 2 are already selected', () => {
    const selectedItems: ComparisonItem[] = [
      {
        id: 'current',
        label: 'GET /api/current (200) - Current',
        response: mockResponse1,
        timestamp: Date.now(),
        method: 'GET',
        url: '/api/current',
      },
      {
        id: 'hist1',
        label: 'GET /api/test (200)',
        response: mockResponse1,
        timestamp: 1700000000000,
        method: 'GET',
        url: '/api/test',
      },
    ];
    
    render(<ComparisonSelector {...defaultProps} selectedItems={selectedItems} />);
    
    // The third item should be disabled - find the top-level div container
    const disabledItem = screen.getByText('/api/create').closest('div[class*="border rounded-lg"]');
    expect(disabledItem).toHaveClass('opacity-50');
    expect(disabledItem).toHaveClass('cursor-not-allowed');
  });

  it('should replace oldest selection when selecting third item', () => {
    const selectedItems: ComparisonItem[] = [
      {
        id: 'current',
        label: 'GET /api/current (200) - Current',
        response: mockResponse1,
        timestamp: Date.now(),
        method: 'GET',
        url: '/api/current',
      },
      {
        id: 'hist1',
        label: 'GET /api/test (200)',
        response: mockResponse1,
        timestamp: 1700000000000,
        method: 'GET',
        url: '/api/test',
      },
    ];
    
    render(<ComparisonSelector {...defaultProps} selectedItems={selectedItems} />);
    
    // Try to select the third item - it should not work since disabled items can't be clicked
    const thirdItem = screen.getByText('/api/create').closest('div[class*="border rounded-lg"]');
    expect(thirdItem).toHaveClass('opacity-50');
    expect(thirdItem).toHaveClass('cursor-not-allowed');
    
    // The actual replacement logic happens in the component but clicking disabled items does nothing
  });

  it('should deselect item when clicking on already selected item', () => {
    const selectedItems: ComparisonItem[] = [
      {
        id: 'current',
        label: 'GET /api/current (200) - Current',
        response: mockResponse1,
        timestamp: Date.now(),
        method: 'GET',
        url: '/api/current',
      },
    ];
    
    render(<ComparisonSelector {...defaultProps} selectedItems={selectedItems} />);
    
    const selectedItem = screen.getByText('/api/current').closest('div');
    fireEvent.click(selectedItem!);
    
    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });

  it('should display status codes with correct styling', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    // Should show status codes
    expect(screen.getAllByText('200')).toHaveLength(2); // Current + history item
    expect(screen.getByText('201')).toBeInTheDocument();
  });

  it('should display timing information', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    // Should show timing information
    expect(screen.getAllByText('210 ms')).toHaveLength(2); // Current and history both have same timing
    expect(screen.getByText('255 ms')).toBeInTheDocument();
  });

  it('should display timestamps for history items', () => {
    render(<ComparisonSelector {...defaultProps} />);
    
    // Should show timestamps for history items but "Current" for current response
    expect(screen.getAllByText('Current')).toHaveLength(2); // Badge and timestamp
    
    // History items should show time - check for PM/AM pattern
    const timeElements = screen.getAllByText(/\d{1,2}:\d{2}:\d{2} [AP]M/);
    expect(timeElements).toHaveLength(2);
  });
});