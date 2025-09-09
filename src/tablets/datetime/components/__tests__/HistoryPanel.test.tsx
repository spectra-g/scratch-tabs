import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistoryPanel } from '../HistoryPanel';

// Mock the Icons
jest.mock('../../../../components/Icons', () => ({
  History: ({ size }: { size: number }) => (
    <div data-testid="history-icon" data-size={size}>History</div>
  ),
  Pin: ({ size }: { size: number }) => (
    <div data-testid="pin-icon" data-size={size}>Pin</div>
  ),
  X: ({ size }: { size: number }) => (
    <div data-testid="x-icon" data-size={size}>X</div>
  ),
  Copy: ({ size }: { size: number }) => (
    <div data-testid="copy-icon" data-size={size}>Copy</div>
  ),
  Plus: ({ size }: { size: number }) => (
    <div data-testid="plus-icon" data-size={size}>Plus</div>
  )
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: Date, formatStr: string) => 'Monday, January 1, 2023, 12:00:00 PM')
}));

// Mock dateUtils
jest.mock('../../utils/dateUtils', () => ({
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

describe('HistoryPanel', () => {
  const mockOnHistoryChange = jest.fn();
  const mockOnSelectDate = jest.fn();
  const mockDate = new Date('2023-01-01T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty state when no history', () => {
    render(
      <HistoryPanel
        history={[]}
        onHistoryChange={mockOnHistoryChange}
        onSelectDate={mockOnSelectDate}
        currentInput=""
        parsedDate={null}
      />
    );

    expect(screen.getByText('No pinned dates yet')).toBeInTheDocument();
    expect(screen.getByText('Enter a date above, then pin it for quick reference')).toBeInTheDocument();
  });

  it('should show Pin Current button when valid date exists', () => {
    render(
      <HistoryPanel
        history={[]}
        onHistoryChange={mockOnHistoryChange}
        onSelectDate={mockOnSelectDate}
        currentInput="now"
        parsedDate={mockDate}
      />
    );

    expect(screen.getByText('Pin Current')).toBeInTheDocument();
    expect(screen.getByText("Click 'Pin Current' above to save this date")).toBeInTheDocument();
  });

  it('should show add form when Pin Current is clicked', () => {
    render(
      <HistoryPanel
        history={[]}
        onHistoryChange={mockOnHistoryChange}
        onSelectDate={mockOnSelectDate}
        currentInput="now"
        parsedDate={mockDate}
      />
    );

    fireEvent.click(screen.getByText('Pin Current'));
    expect(screen.getByPlaceholderText('Label (optional)')).toBeInTheDocument();
  });

  it('should display pinned dates', () => {
    const mockHistory = [
      {
        id: '1',
        label: 'Test Date',
        date: mockDate,
        originalInput: 'now',
        pinnedAt: Date.now()
      }
    ];

    render(
      <HistoryPanel
        history={mockHistory}
        onHistoryChange={mockOnHistoryChange}
        onSelectDate={mockOnSelectDate}
        currentInput=""
        parsedDate={null}
      />
    );

    expect(screen.getByText('Test Date')).toBeInTheDocument();
    expect(screen.getByText('Input: now')).toBeInTheDocument();
    expect(screen.getByText('Load this date')).toBeInTheDocument();
  });

  it('should handle Load this date click', () => {
    const mockHistory = [
      {
        id: '1',
        label: 'Test Date',
        date: mockDate,
        originalInput: 'now',
        pinnedAt: Date.now()
      }
    ];

    render(
      <HistoryPanel
        history={mockHistory}
        onHistoryChange={mockOnHistoryChange}
        onSelectDate={mockOnSelectDate}
        currentInput=""
        parsedDate={null}
      />
    );

    fireEvent.click(screen.getByText('Load this date'));
    expect(mockOnSelectDate).toHaveBeenCalledWith(mockDate, 'now');
  });

  it('should handle remove pinned date', () => {
    const mockHistory = [
      {
        id: '1',
        label: 'Test Date',
        date: mockDate,
        originalInput: 'now',
        pinnedAt: Date.now()
      }
    ];

    render(
      <HistoryPanel
        history={mockHistory}
        onHistoryChange={mockOnHistoryChange}
        onSelectDate={mockOnSelectDate}
        currentInput=""
        parsedDate={null}
      />
    );

    const removeButton = screen.getByTestId('x-icon').parentElement;
    fireEvent.click(removeButton!);
    expect(mockOnHistoryChange).toHaveBeenCalledWith([]);
  });
});