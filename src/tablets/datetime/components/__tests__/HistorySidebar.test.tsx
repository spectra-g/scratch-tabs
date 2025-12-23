import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HistorySidebar } from '../HistorySidebar';

// Mock the Icons
jest.mock('../../../../components/Icons', () => ({
  History: () => <div data-testid="history-icon">History</div>,
  Star: ({ fill }: { fill: string }) => <div data-testid="star-icon" data-fill={fill}>Star</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  ChevronLeft: () => <div data-testid="chevron-left-icon">Left</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">Right</div>
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
  differenceInSeconds: jest.fn(() => 0),
  differenceInHours: jest.fn(() => 0),
  differenceInMinutes: jest.fn(() => 0),
  differenceInDays: jest.fn(() => 0),
}));

describe('HistorySidebar', () => {
  const mockOnSelectDate = jest.fn();
  const mockOnToggleStar = jest.fn();
  const mockOnRemove = jest.fn();
  const mockDate = new Date('2023-01-01T12:00:00.000Z');

  const mockHistory = [
    {
      id: '1',
      label: 'Test Item',
      date: mockDate,
      originalInput: 'now',
      pinnedAt: Date.now()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render expanded by default and handle collapse toggle', async () => {
    render(
      <HistorySidebar
        history={mockHistory}
        onSelectDate={mockOnSelectDate}
        onToggleStar={mockOnToggleStar}
        onRemove={mockOnRemove}
        currentDate={null}
      />
    );

    // Should be expanded by default (isCollapsed = false)
    expect(screen.getByTestId('chevron-left-icon')).toBeInTheDocument();
    expect(screen.getByText(/History & Stars/i)).toBeInTheDocument();

    // Test collapse
    const collapseBtn = screen.getByTestId('chevron-left-icon').closest('button');
    await act(async () => {
      fireEvent.click(collapseBtn!);
    });

    expect(screen.getByTestId('chevron-right-icon')).toBeInTheDocument();
    expect(screen.queryByText(/History & Stars/i)).not.toBeInTheDocument();
  });

  it('should call onSelectDate when history item is clicked', () => {
    render(
      <HistorySidebar
        history={mockHistory}
        onSelectDate={mockOnSelectDate}
        onToggleStar={mockOnToggleStar}
        onRemove={mockOnRemove}
        currentDate={null}
      />
    );

    // Already expanded
    const itemText = screen.getByText('now');
    fireEvent.click(itemText);

    expect(mockOnSelectDate).toHaveBeenCalled();
  });

  it('should call onRemove when remove icon is clicked', () => {
    render(
      <HistorySidebar
        history={mockHistory}
        onSelectDate={mockOnSelectDate}
        onToggleStar={mockOnToggleStar}
        onRemove={mockOnRemove}
        currentDate={null}
      />
    );

    // Already expanded
    const xIcon = screen.getByTestId('x-icon');
    const removeBtn = xIcon.closest('button');
    fireEvent.click(removeBtn!);

    expect(mockOnRemove).toHaveBeenCalledWith('1');
  });

  it('should call onToggleStar when star icon is clicked', () => {
    render(
      <HistorySidebar
        history={mockHistory}
        onSelectDate={mockOnSelectDate}
        onToggleStar={mockOnToggleStar}
        onRemove={mockOnRemove}
        currentDate={null}
      />
    );

    // Already expanded
    const starIcon = screen.getByTestId('star-icon');
    const starBtn = starIcon.closest('button');
    fireEvent.click(starBtn!);

    expect(mockOnToggleStar).toHaveBeenCalledWith('1');
  });
});