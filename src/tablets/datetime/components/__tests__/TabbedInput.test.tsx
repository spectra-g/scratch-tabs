import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TabbedInput } from '../TabbedInput';

// Mock the Icons
jest.mock('../../../../components/Icons', () => ({
  Calendar: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="calendar-icon" data-size={size} className={className}>Calendar</div>
  ),
  X: ({ size }: { size: number }) => (
    <div data-testid="x-icon" data-size={size}>X</div>
  ),
  RotateCcw: ({ size }: { size: number }) => (
    <div data-testid="rotate-ccw-icon" data-size={size}>RotateCcw</div>
  )
}));

// Mock dateUtils functions
jest.mock('../../utils/dateUtils', () => ({
  intelligentParse: jest.fn((input: string) => {
    if (input === 'now') return new Date('2023-01-01T12:00:00.000Z');
    if (input === 'yesterday') return new Date('2022-12-31T12:00:00.000Z');
    if (input === 'invalid') return null;
    return new Date(input);
  }),
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

describe('TabbedInput', () => {
  const mockOnDateChange = jest.fn();
  const testDate = new Date('2023-01-01T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all tab options', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    expect(screen.getByRole('button', { name: 'Natural Language' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ISO / Human Readable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unix Timestamp (ms)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unix Timestamp (s)' })).toBeInTheDocument();
  });

  it('should start with Natural Language tab active', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const naturalTab = screen.getByRole('button', { name: 'Natural Language' });
    expect(naturalTab).toHaveClass('bg-blue-600', 'text-white');
  });

  it('should switch between tabs', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const isoTab = screen.getByRole('button', { name: 'ISO / Human Readable' });
    fireEvent.click(isoTab);

    expect(isoTab).toHaveClass('bg-blue-600', 'text-white');
    expect(screen.getByRole('button', { name: 'Natural Language' })).not.toHaveClass('bg-blue-600');
  });

  it('should have correct placeholder for Natural Language tab', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const input = screen.getByPlaceholderText(/now, yesterday, 3 days ago/);
    expect(input).toBeInTheDocument();
  });

  it('should update input value when typing', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'yesterday' } });

    expect(input).toHaveValue('yesterday');
    expect(mockOnDateChange).toHaveBeenCalledWith(
      expect.any(Date),
      null
    );
  });

  it('should parse natural language input', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'now' } });

    expect(mockOnDateChange).toHaveBeenCalledWith(
      new Date('2023-01-01T12:00:00.000Z'),
      null
    );
  });

  it('should parse ISO date input', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    // Switch to ISO tab
    fireEvent.click(screen.getByRole('button', { name: 'ISO / Human Readable' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '2023-01-01T12:00:00.000Z' } });

    expect(mockOnDateChange).toHaveBeenCalledWith(
      expect.any(Date),
      null
    );
  });

  it('should parse Unix timestamp in milliseconds', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    // Switch to Unix ms tab
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (ms)' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '1672574400000' } });

    expect(mockOnDateChange).toHaveBeenCalledWith(
      new Date(1672574400000),
      null
    );
  });

  it('should parse Unix timestamp in seconds', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    // Switch to Unix s tab
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (s)' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '1672574400' } });

    expect(mockOnDateChange).toHaveBeenCalledWith(
      new Date(1672574400 * 1000),
      null
    );
  });

  it('should update all input fields when parsedDate changes externally', () => {
    const { rerender } = render(
      <TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />
    );

    // Update with a new date
    rerender(
      <TabbedInput parsedDate={testDate} onDateChange={mockOnDateChange} />
    );

    // Switch to ISO tab and check the value was updated
    fireEvent.click(screen.getByRole('button', { name: 'ISO / Human Readable' }));
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('2023-01-01T12:00:00.000Z');

    // Switch to Unix ms tab and check the value
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (ms)' }));
    expect(input).toHaveValue('1672574400000');

    // Switch to Unix s tab and check the value
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (s)' }));
    expect(input).toHaveValue('1672574400');
  });

  it('should show clear button when input has value', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'now' } });

    const clearButton = screen.getByTestId('x-icon');
    expect(clearButton).toBeInTheDocument();
  });

  it('should clear input when clear button is clicked', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'now' } });

    const clearButton = screen.getByTestId('x-icon').parentElement;
    fireEvent.click(clearButton!);

    expect(input).toHaveValue('');
    expect(mockOnDateChange).toHaveBeenCalledWith(null, null);
  });

  it('should start with "now" in Natural Language tab', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('now');
  });

  it('should handle invalid input gracefully', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    // Switch to Unix ms tab
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (ms)' }));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'invalid-number' } });

    expect(mockOnDateChange).toHaveBeenCalledWith(null, null);
  });

  it('should show appropriate help text for each tab', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    // Natural Language tab
    expect(screen.getByText(/Try: now, yesterday, 3 days ago/)).toBeInTheDocument();

    // Switch to ISO tab
    fireEvent.click(screen.getByRole('button', { name: 'ISO / Human Readable' }));
    expect(screen.getByText(/Enter iso \/ human readable/)).toBeInTheDocument();

    // Switch to Unix ms tab
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (ms)' }));
    expect(screen.getByText(/Enter unix timestamp \(ms\)/)).toBeInTheDocument();

    // Switch to Unix s tab
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (s)' }));
    expect(screen.getByText(/Enter unix timestamp \(s\)/)).toBeInTheDocument();
  });

  it('should maintain separate input values for each tab', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    // Type in Natural Language tab
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'yesterday' } });

    // Switch to ISO tab and type different value
    fireEvent.click(screen.getByRole('button', { name: 'ISO / Human Readable' }));
    fireEvent.change(input, { target: { value: '2023-01-01T00:00:00Z' } });

    // Switch back to Natural Language tab - should retain previous value
    fireEvent.click(screen.getByRole('button', { name: 'Natural Language' }));
    expect(input).toHaveValue('yesterday');

    // Switch back to ISO tab - should retain its value
    fireEvent.click(screen.getByRole('button', { name: 'ISO / Human Readable' }));
    expect(input).toHaveValue('2023-01-01T00:00:00Z');
  });

  it('should handle serialized date strings from state (bug fix)', () => {
    // This tests the specific bug where parsedDate comes as a string instead of Date object
    const serializedDateString = "2023-01-01T12:00:00.000Z";
    
    render(<TabbedInput parsedDate={serializedDateString as any} onDateChange={mockOnDateChange} />);

    // Switch to ISO tab - should handle the string date gracefully
    fireEvent.click(screen.getByRole('button', { name: 'ISO / Human Readable' }));
    const input = screen.getByRole('textbox');
    
    // Should display the formatted date, not crash
    expect(input).toHaveValue('2023-01-01T12:00:00.000Z');

    // Switch to Unix ms tab - should also work
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (ms)' }));
    expect(input).toHaveValue('1672574400000');

    // Switch to Unix s tab - should also work  
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (s)' }));
    expect(input).toHaveValue('1672574400');
  });

  it('should show reset button', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    const resetButton = screen.getByRole('button', { name: /Reset/ });
    expect(resetButton).toBeInTheDocument();
    expect(screen.getByTestId('rotate-ccw-icon')).toBeInTheDocument();
  });

  it('should reset all inputs to default when reset button is clicked', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    // First, modify some inputs in different tabs
    fireEvent.click(screen.getByRole('button', { name: 'ISO / Human Readable' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '2023-01-01T00:00:00Z' } });

    // Switch to Unix ms tab and add value
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (ms)' }));
    fireEvent.change(input, { target: { value: '1672574400000' } });

    // Now click reset
    const resetButton = screen.getByRole('button', { name: /Reset/ });
    fireEvent.click(resetButton);

    // Should switch back to Natural Language tab
    expect(screen.getByRole('button', { name: 'Natural Language' })).toHaveClass('bg-blue-600', 'text-white');
    
    // Input should be 'now'
    expect(input).toHaveValue('now');
    
    // Should call onDateChange with parsed 'now'
    expect(mockOnDateChange).toHaveBeenCalledWith(
      new Date('2023-01-01T12:00:00.000Z'),
      null
    );
  });

  it('should reset from any tab when reset button is clicked', () => {
    render(<TabbedInput parsedDate={null} onDateChange={mockOnDateChange} />);

    // Switch to Unix seconds tab
    fireEvent.click(screen.getByRole('button', { name: 'Unix Timestamp (s)' }));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '1672574400' } });

    // Clear mock calls from the change
    jest.clearAllMocks();

    // Click reset
    const resetButton = screen.getByRole('button', { name: /Reset/ });
    fireEvent.click(resetButton);

    // Should switch back to Natural Language tab
    expect(screen.getByRole('button', { name: 'Natural Language' })).toHaveClass('bg-blue-600', 'text-white');
    
    // Input should be 'now'
    expect(input).toHaveValue('now');
    
    // Should call onDateChange with parsed 'now'
    expect(mockOnDateChange).toHaveBeenCalledWith(
      new Date('2023-01-01T12:00:00.000Z'),
      null
    );
  });
});