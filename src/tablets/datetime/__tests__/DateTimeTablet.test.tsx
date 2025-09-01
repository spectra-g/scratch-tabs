import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DateTimeTablet } from '../DateTimeTablet';
import { DateTimeTabletState } from '../types';

// Mock date-fns to have predictable results
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

describe('DateTimeTablet', () => {
  const createMockState = (overrides: Partial<DateTimeTabletState> = {}): DateTimeTabletState => ({
    inputValue: '',
    parsedDate: null,
    error: null,
    selectedTimezones: [],
    calculatorState: {
      operation: 'add',
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      secondDate: '',
      durationResult: null
    },
    history: [],
    isOptimizing: false,
    selectedElementId: null,
    ...overrides
  });

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current time for consistent tests
    jest.spyOn(Date, 'now').mockReturnValue(1672531200000); // 2023-01-01 00:00:00 UTC
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render the main interface', () => {
      const state = createMockState();
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Date & Time Toolkit')).toBeInTheDocument();
      expect(screen.getByText('The ultimate date/time converter and inspector')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter date\/time/)).toBeInTheDocument();
    });

    it('should render all tab options', () => {
      const state = createMockState();
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Conversions')).toBeInTheDocument();
      expect(screen.getByText('Timezones')).toBeInTheDocument();
      expect(screen.getByText('Calculator')).toBeInTheDocument();
      expect(screen.getByText('Inspector')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('should show conversion dashboard by default', () => {
      const state = createMockState();
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Enter a valid date/time to see conversions')).toBeInTheDocument();
    });
  });

  describe('input handling', () => {
    it('should update input value when typing', () => {
      const state = createMockState();
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText(/Enter date\/time/);
      fireEvent.change(input, { target: { value: 'now' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          inputValue: 'now',
          error: null
        })
      );
    });

    it('should clear error when typing', () => {
      const state = createMockState({ error: 'Previous error' });
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText(/Enter date\/time/);
      fireEvent.change(input, { target: { value: 'new input' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          error: null
        })
      );
    });
  });

  describe('tab navigation', () => {
    it('should switch between tabs', () => {
      const state = createMockState();
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      // Click on Timezones tab
      fireEvent.click(screen.getByText('Timezones'));
      expect(screen.getByText('Add timezones to compare times')).toBeInTheDocument();

      // Click on Calculator tab
      fireEvent.click(screen.getByText('Calculator'));
      expect(screen.getByText('Date Calculator')).toBeInTheDocument();

      // Click on Inspector tab
      fireEvent.click(screen.getByText('Inspector'));
      expect(screen.getByText('Cross-Platform Parse Inspector')).toBeInTheDocument();
    });

    it('should show count badges for tabs with data', () => {
      const state = createMockState({
        selectedTimezones: ['UTC', 'America/New_York'],
        history: [
          {
            id: '1',
            label: 'Test Date',
            date: new Date(),
            originalInput: 'now',
            pinnedAt: Date.now()
          }
        ]
      });
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      // Should show count for timezones
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 timezones

      // Should show count for history
      expect(screen.getByText('1')).toBeInTheDocument(); // 1 history item
    });
  });

  describe('date parsing integration', () => {
    it('should parse and display valid dates', async () => {
      const state = createMockState({ inputValue: 'now' });
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      // Wait for debounced parsing
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            parsedDate: expect.any(Date),
            error: null
          })
        );
      }, { timeout: 500 });
    });

    it('should handle parsing errors', async () => {
      const state = createMockState({ inputValue: 'invalid date' });
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            parsedDate: null,
            error: 'Unable to parse date/time'
          })
        );
      }, { timeout: 500 });
    });
  });

  describe('timezone management', () => {
    it('should add timezones', () => {
      const state = createMockState();
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      // Switch to timezones tab
      fireEvent.click(screen.getByText('Timezones'));

      // Add a timezone
      const input = screen.getByPlaceholderText(/Add timezone/);
      fireEvent.change(input, { target: { value: 'UTC' } });
      fireEvent.click(screen.getByText('Add'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedTimezones: ['UTC']
        })
      );
    });
  });

  describe('history management', () => {
    it('should load date from history', () => {
      const testDate = new Date('2023-01-01T12:00:00Z');
      const state = createMockState({
        history: [{
          id: '1',
          label: 'Test Date',
          date: testDate,
          originalInput: '2023-01-01T12:00:00Z',
          pinnedAt: Date.now()
        }]
      });
      
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      // Switch to history tab
      fireEvent.click(screen.getByText('History'));

      // Click load button
      fireEvent.click(screen.getByText('Load this date'));

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          inputValue: '2023-01-01T12:00:00Z',
          parsedDate: testDate,
          error: null
        })
      );
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      const state = createMockState();
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      
      // Check for input accessibility
      const input = screen.getByPlaceholderText(/Enter date\/time/);
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('autoComplete', 'off');
    });

    it('should support keyboard navigation', () => {
      const state = createMockState();
      render(<DateTimeTablet state={state} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText(/Enter date\/time/);
      
      // Should be focusable
      input.focus();
      expect(input).toHaveFocus();
    });
  });
});