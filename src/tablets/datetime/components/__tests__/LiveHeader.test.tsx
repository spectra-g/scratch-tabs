import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveHeader } from '../LiveHeader';

// Mock the Icons
jest.mock('../../../../components/Icons', () => ({
  Clock: ({ className }: { className: string }) => <div data-testid="clock-icon" className={className}>Clock</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  Play: () => <div data-testid="play-icon">Play</div>,
  Check: ({ className }: { className: string }) => <div data-testid="check-icon" className={className}>Check</div>,
  ArrowDown: () => <div data-testid="arrow-down-icon">Down</div>
}));

describe('LiveHeader', () => {
  const mockOnSetInput = jest.fn();
  const mockOnFreezeToggle = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
    mockOnSetInput.mockClear();
    mockOnFreezeToggle.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('should render the live dashboard with all counters', () => {
    render(<LiveHeader onSetInput={mockOnSetInput} isFrozen={false} onFreezeToggle={mockOnFreezeToggle} />);
    expect(screen.getByText('Live Dashboard')).toBeInTheDocument();
  });

  it('should show check icon when copy button is clicked', async () => {
    render(<LiveHeader onSetInput={mockOnSetInput} isFrozen={false} onFreezeToggle={mockOnFreezeToggle} />);

    const copyButton = screen.getAllByTitle(/Copy/)[0];

    await act(async () => {
      fireEvent.click(copyButton);
    });

    const checkIcon = await screen.findByTestId('check-icon');
    expect(checkIcon).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
  });

  it('should call onSetInput when the down arrow is clicked', () => {
    render(<LiveHeader onSetInput={mockOnSetInput} isFrozen={false} onFreezeToggle={mockOnFreezeToggle} />);

    const setInputBtns = screen.getAllByTestId('arrow-down-icon');
    fireEvent.click(setInputBtns[0].closest('button')!);

    expect(mockOnSetInput).toHaveBeenCalled();
  });

  it('should call onFreezeToggle when freeze button is clicked', () => {
    render(<LiveHeader onSetInput={mockOnSetInput} isFrozen={false} onFreezeToggle={mockOnFreezeToggle} />);

    const freezeButton = screen.getByText('FREEZE').closest('button');
    fireEvent.click(freezeButton!);

    expect(mockOnFreezeToggle).toHaveBeenCalled();
  });

  it('should show resume button when frozen', () => {
    render(<LiveHeader onSetInput={mockOnSetInput} isFrozen={true} onFreezeToggle={mockOnFreezeToggle} />);

    expect(screen.getByText('RESUME')).toBeInTheDocument();
    expect(screen.queryByText('FREEZE')).not.toBeInTheDocument();
  });

  it('should show freeze button when not frozen', () => {
    render(<LiveHeader onSetInput={mockOnSetInput} isFrozen={false} onFreezeToggle={mockOnFreezeToggle} />);

    expect(screen.getByText('FREEZE')).toBeInTheDocument();
    expect(screen.queryByText('RESUME')).not.toBeInTheDocument();
  });
});