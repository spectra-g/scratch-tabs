import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ParseInspector } from '../ParseInspector';

// Mock the Icons
jest.mock('../../../../components/Icons', () => ({
  Code: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="code-icon" data-size={size} className={className}>Code</div>
  ),
  CheckCircle: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="check-circle-icon" data-size={size} className={className}>CheckCircle</div>
  ),
  XCircle: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="x-circle-icon" data-size={size} className={className}>XCircle</div>
  ),
  Copy: ({ size }: { size: number }) => (
    <div data-testid="copy-icon" data-size={size}>Copy</div>
  )
}));

// Mock the dateUtils functions
jest.mock('../../utils/dateUtils', () => ({
  simulateCrossPlatformParsing: jest.fn((dateString: string) => [
    {
      language: 'JavaScript',
      success: true,
      result: '2023-01-01T12:00:00.000Z',
      code: `new Date("${dateString}")`,
      error: undefined
    },
    {
      language: 'Python',
      success: true,
      result: '2023-01-01 12:00:00+00:00',
      code: `datetime.fromisoformat("${dateString.replace('Z', '+00:00')}")`,
      error: undefined
    },
    {
      language: 'Java',
      success: false,
      result: undefined,
      code: `Instant.parse("${dateString}")`,
      error: 'DateTimeParseException'
    }
  ]),
  isValidDateValue: jest.fn((value: any) => {
    if (!value) return false;
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return !isNaN(parsed.getTime());
    }
    return false;
  }),
  ensureDate: jest.fn((value: any) => {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  })
}));

describe('ParseInspector', () => {
  const mockDate = new Date('2023-01-01T12:00:00.000Z');

  it('should show empty state when no input value and no parsed date', () => {
    render(<ParseInspector inputValue="" parsedDate={null} />);
    
    expect(screen.getByText('Enter a date/time to see cross-platform parsing')).toBeInTheDocument();
    expect(screen.getByText('See how different programming languages would parse your input')).toBeInTheDocument();
    expect(screen.getByTestId('code-icon')).toBeInTheDocument();
  });

  it('should show parse results when parsedDate is provided', () => {
    render(<ParseInspector inputValue="" parsedDate={mockDate} />);
    
    expect(screen.getByText('Cross-Platform Parse Inspector')).toBeInTheDocument();
    expect(screen.getByText('How different languages would parse:')).toBeInTheDocument();
    expect(screen.getAllByText('2023-01-01T12:00:00.000Z')).toHaveLength(2); // Header and result
    
    // Should show all three language results
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Java')).toBeInTheDocument();
  });

  it('should show success and error states for different languages', () => {
    render(<ParseInspector inputValue="" parsedDate={mockDate} />);
    
    // Should show success indicators for JavaScript and Python
    const checkIcons = screen.getAllByTestId('check-circle-icon');
    expect(checkIcons).toHaveLength(2);
    
    // Should show error indicator for Java
    const errorIcon = screen.getByTestId('x-circle-icon');
    expect(errorIcon).toBeInTheDocument();
    
    // Should show success and error sections
    expect(screen.getAllByText('Success')).toHaveLength(2); // JavaScript and Python
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('DateTimeParseException')).toBeInTheDocument();
  });

  it('should show parse results when input value is provided without parsed date', () => {
    render(<ParseInspector inputValue="2023-01-01" parsedDate={null} />);
    
    expect(screen.getByText('Cross-Platform Parse Inspector')).toBeInTheDocument();
    expect(screen.getByText('How different languages would parse:')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
  });

  it('should show code snippets for all languages', () => {
    render(<ParseInspector inputValue="" parsedDate={mockDate} />);
    
    // Check that code snippets are displayed
    expect(screen.getByText(/new Date\(/)).toBeInTheDocument();
    expect(screen.getByText(/datetime\.fromisoformat\(/)).toBeInTheDocument();
    expect(screen.getByText(/Instant\.parse\(/)).toBeInTheDocument();
  });

  it('should show copy buttons for all code snippets', () => {
    render(<ParseInspector inputValue="" parsedDate={mockDate} />);
    
    const copyButtons = screen.getAllByTestId('copy-icon');
    expect(copyButtons).toHaveLength(3); // One for each language
  });

  it('should prioritize parsedDate over inputValue when both are provided', () => {
    render(<ParseInspector inputValue="some input" parsedDate={mockDate} />);
    
    // Should show the parsedDate ISO string, not the input value
    expect(screen.getAllByText('2023-01-01T12:00:00.000Z')).toHaveLength(2); // Header and result
    expect(screen.queryByText('some input')).not.toBeInTheDocument();
  });
});