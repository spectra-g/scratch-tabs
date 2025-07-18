import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ResponseComparisonViewer } from '../components/ResponseComparison';
import { ResponseComparison, ComparisonItem } from '../types';

const mockComparison: ResponseComparison = {
  left: {
    id: 'item1',
    label: 'GET /api/test (200)',
    response: {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"id":1,"name":"test"}',
      size: 1024,
      timing: { dns: 10, connection: 20, tls: 30, firstByte: 100, download: 50, total: 210 },
      contentType: 'application/json',
    },
    timestamp: 1700000000000,
    method: 'GET',
    url: '/api/test',
  },
  right: {
    id: 'item2',
    label: 'GET /api/test (201)',
    response: {
      status: 201,
      statusText: 'Created',
      headers: { 'content-type': 'application/json', 'x-custom': 'value' },
      body: '{"id":2,"name":"updated"}',
      size: 1536,
      timing: { dns: 15, connection: 25, tls: 35, firstByte: 120, download: 60, total: 255 },
      contentType: 'application/json',
    },
    timestamp: 1700000001000,
    method: 'GET',
    url: '/api/test',
  },
  statusDiff: {
    type: 'modified',
    path: 'status',
    oldValue: 200,
    newValue: 201,
    description: 'Status code changed from 200 to 201',
  },
  headersDiff: [
    {
      type: 'added',
      path: 'headers.x-custom',
      newValue: 'value',
      description: 'Added header x-custom',
    },
  ],
  bodyDiff: [
    {
      type: 'modified',
      path: 'body.id',
      oldValue: 1,
      newValue: 2,
      description: 'Value changed from 1 to 2',
    },
    {
      type: 'modified',
      path: 'body.name',
      oldValue: 'test',
      newValue: 'updated',
      description: 'Value changed from "test" to "updated"',
    },
  ],
  timingDiff: [
    {
      type: 'modified',
      path: 'timing.total',
      oldValue: 210,
      newValue: 255,
      description: 'Value changed from 210 to 255',
    },
  ],
  sizeDiff: {
    type: 'modified',
    path: 'size',
    oldValue: 1024,
    newValue: 1536,
    description: 'Response size changed from 1024 to 1536 bytes',
  },
};

const mockEmptyComparison: ResponseComparison = {
  left: mockComparison.left,
  right: mockComparison.left, // Same as left to create no differences
  statusDiff: null,
  headersDiff: [],
  bodyDiff: [],
  timingDiff: [],
  sizeDiff: null,
};

describe('ResponseComparisonViewer', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render comparison header with correct information', () => {
    render(<ResponseComparisonViewer comparison={mockComparison} onClose={mockOnClose} />);
    
    expect(screen.getByText('Response Comparison')).toBeInTheDocument();
    expect(screen.getByText('GET /api/test (200)')).toBeInTheDocument();
    expect(screen.getByText('GET /api/test (201)')).toBeInTheDocument();
    expect(screen.getByText('6 differences found')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<ResponseComparisonViewer comparison={mockComparison} onClose={mockOnClose} />);
    
    // The close button is the X icon button
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should render diff sections with correct counts', () => {
    render(<ResponseComparisonViewer comparison={mockComparison} onClose={mockOnClose} />);
    
    expect(screen.getByText('Response Info')).toBeInTheDocument();
    expect(screen.getByText('Headers')).toBeInTheDocument();
    expect(screen.getByText('Response Body')).toBeInTheDocument();
    expect(screen.getByText('Timing')).toBeInTheDocument();
    
    // Check diff counts - there are multiple sections with similar counts
    expect(screen.getAllByText('2 differences')).toHaveLength(2); // Response Info and Body
    expect(screen.getAllByText('1 difference')).toHaveLength(2); // Headers and Timing
  });

  it('should expand and collapse diff sections', () => {
    render(<ResponseComparisonViewer comparison={mockComparison} onClose={mockOnClose} />);
    
    // Response Body should be open by default
    expect(screen.getByText('Value changed from 1 to 2')).toBeInTheDocument();
    
    // Headers should be closed by default
    expect(screen.queryByText('Added header x-custom')).not.toBeInTheDocument();
    
    // Click to expand headers
    const headersButton = screen.getByText('Headers');
    fireEvent.click(headersButton);
    
    expect(screen.getByText('Added header x-custom')).toBeInTheDocument();
    
    // Click to collapse response body
    const bodyButton = screen.getByText('Response Body');
    fireEvent.click(bodyButton);
    
    expect(screen.queryByText('Value changed from 1 to 2')).not.toBeInTheDocument();
  });

  it('should show and hide diff values', () => {
    render(<ResponseComparisonViewer comparison={mockComparison} onClose={mockOnClose} />);
    
    // Values should be hidden by default
    expect(screen.queryByText('Old Value:')).not.toBeInTheDocument();
    expect(screen.queryByText('New Value:')).not.toBeInTheDocument();
    
    // Click to show values
    const showValuesButton = screen.getAllByText('Show values')[0];
    fireEvent.click(showValuesButton);
    
    expect(screen.getByText('Old Value:')).toBeInTheDocument();
    expect(screen.getByText('New Value:')).toBeInTheDocument();
    
    // Click to hide values
    const hideValuesButton = screen.getByText('Hide values');
    fireEvent.click(hideValuesButton);
    
    expect(screen.queryByText('Old Value:')).not.toBeInTheDocument();
    expect(screen.queryByText('New Value:')).not.toBeInTheDocument();
  });

  it('should render diff types with correct styling', () => {
    render(<ResponseComparisonViewer comparison={mockComparison} onClose={mockOnClose} />);
    
    // Expand Headers section to see the "added" badge
    fireEvent.click(screen.getByText('Headers'));
    
    // Check for diff type badges
    expect(screen.getAllByText('modified').length).toBeGreaterThan(0);
    expect(screen.getByText('added')).toBeInTheDocument();
    
    // Check for correct CSS classes
    const modifiedBadge = screen.getAllByText('modified')[0];
    expect(modifiedBadge).toHaveClass('text-yellow-400', 'bg-yellow-500/10');
    
    const addedBadge = screen.getByText('added');
    expect(addedBadge).toHaveClass('text-green-400', 'bg-green-500/10');
  });

  it('should render empty state when no differences found', () => {
    render(<ResponseComparisonViewer comparison={mockEmptyComparison} onClose={mockOnClose} />);
    
    expect(screen.getByText('No differences found')).toBeInTheDocument();
    expect(screen.getByText('The responses are identical')).toBeInTheDocument();
    expect(screen.getByText('0 differences found')).toBeInTheDocument();
  });

  it('should not render sections with no differences', () => {
    const partialComparison = {
      ...mockComparison,
      headersDiff: [],
      timingDiff: [],
    };
    
    render(<ResponseComparisonViewer comparison={partialComparison} onClose={mockOnClose} />);
    
    expect(screen.queryByText('Headers')).not.toBeInTheDocument();
    expect(screen.queryByText('Timing')).not.toBeInTheDocument();
    expect(screen.getByText('Response Info')).toBeInTheDocument();
    expect(screen.getByText('Response Body')).toBeInTheDocument();
  });

  it('should handle diff descriptions correctly', () => {
    render(<ResponseComparisonViewer comparison={mockComparison} onClose={mockOnClose} />);
    
    // Expand Response Info section to see status description
    fireEvent.click(screen.getByText('Response Info'));
    
    expect(screen.getByText('Status code changed from 200 to 201')).toBeInTheDocument();
    expect(screen.getByText('Value changed from 1 to 2')).toBeInTheDocument();
    expect(screen.getByText('Value changed from "test" to "updated"')).toBeInTheDocument();
  });

  it('should display diff paths correctly', () => {
    render(<ResponseComparisonViewer comparison={mockComparison} onClose={mockOnClose} />);
    
    // Expand all sections to see the paths
    fireEvent.click(screen.getByText('Response Info'));
    fireEvent.click(screen.getByText('Headers'));
    fireEvent.click(screen.getByText('Timing'));
    // Response Body is already expanded by default
    
    expect(screen.getByText('status')).toBeInTheDocument();
    expect(screen.getByText('size')).toBeInTheDocument();
    expect(screen.getByText('body.id')).toBeInTheDocument();
    expect(screen.getByText('body.name')).toBeInTheDocument();
    expect(screen.getByText('timing.total')).toBeInTheDocument();
  });
});