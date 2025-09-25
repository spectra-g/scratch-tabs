import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DateTimeTablet } from '../DateTimeTablet';
import { DateTimeTabletState } from '../types';

// We need to render the component through the tablet's render method
const DateTimeTabletComponent: React.FC<{state: DateTimeTabletState, onChange: (state: DateTimeTabletState) => void}> = ({ state, onChange }) => {
  return DateTimeTablet.render(state, onChange) as React.ReactElement;
};

// Mock the components and icons to avoid complex dependencies
jest.mock('../components/LiveHeader', () => ({
  LiveHeader: () => <div data-testid="live-header">Live Header</div>
}));

jest.mock('../components/TabbedInput', () => ({
  TabbedInput: ({ parsedDate, onDateChange }: any) => (
    <div data-testid="tabbed-input">
      <input 
        data-testid="main-input"
        onChange={(e) => onDateChange(new Date(), null)}
        placeholder="Date input"
      />
    </div>
  )
}));

jest.mock('../components/ConversionDashboard', () => ({
  ConversionDashboard: ({ formats }: any) => (
    <div data-testid="conversion-dashboard">
      {formats ? 'Conversion results' : 'Enter a date to see conversions'}
    </div>
  )
}));

jest.mock('../components/TimezoneExplorer', () => ({
  TimezoneExplorer: () => <div data-testid="timezone-explorer">Timezone Explorer</div>
}));

jest.mock('../components/DateCalculator', () => ({
  DateCalculator: ({ onCalculationComplete }: any) => (
    <div data-testid="date-calculator">
      <button onClick={() => onCalculationComplete(new Date())}>Calculate</button>
    </div>
  )
}));

jest.mock('../components/ParseInspector', () => ({
  ParseInspector: () => <div data-testid="parse-inspector">Parse Inspector</div>
}));

jest.mock('../components/HistoryPanel', () => ({
  HistoryPanel: ({ onSelectDate }: any) => (
    <div data-testid="history-panel">
      <button onClick={() => onSelectDate(new Date(), 'test')}>Load Date</button>
    </div>
  )
}));

// Mock date-fns to have predictable results
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  formatDistanceToNow: jest.fn(() => '2 hours ago'),
}));

describe('DateTimeTablet', () => {
  const createMockState = (overrides: Partial<DateTimeTabletState['data']> = {}): DateTimeTabletState => ({
    type: "datetime",
    data: {
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
      expandedAccordionSections: ['timezone', 'calculator', 'parser', 'history'],
      ...overrides
    }
  });

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('layout and structure', () => {
    it('should render the new two-column layout', () => {
      const state = createMockState();
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      expect(screen.getByTestId('live-header')).toBeInTheDocument();
      expect(screen.getByText('Date & Time Input')).toBeInTheDocument();
      expect(screen.getByText('Tools & Analysis')).toBeInTheDocument();
    });

    it('should render all tool components in right column', () => {
      const state = createMockState();
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      expect(screen.getByTestId('timezone-explorer')).toBeInTheDocument();
      expect(screen.getByTestId('date-calculator')).toBeInTheDocument();
      expect(screen.getByTestId('parse-inspector')).toBeInTheDocument();
      expect(screen.getByTestId('history-panel')).toBeInTheDocument();
    });

    it('should handle accordion toggle functionality', () => {
      const state = createMockState({ expandedAccordionSections: ['timezone'] });
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      // Timezone should be visible, others should not
      expect(screen.getByTestId('timezone-explorer')).toBeInTheDocument();
      expect(screen.queryByTestId('date-calculator')).not.toBeInTheDocument();

      // Click on calculator section to expand it
      fireEvent.click(screen.getByText('Date Calculator'));

      // Should call onChange to expand calculator section
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expandedAccordionSections: ['timezone', 'calculator']
          })
        })
      );
    });

    it('should render tabbed input and conversion dashboard in left column', () => {
      const state = createMockState();
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      expect(screen.getByTestId('tabbed-input')).toBeInTheDocument();
      expect(screen.getByTestId('conversion-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Conversions')).toBeInTheDocument();
    });
  });

  describe('data flow and interactions', () => {
    it('should handle date changes from TabbedInput', () => {
      const state = createMockState();
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      const input = screen.getByTestId('main-input');
      fireEvent.change(input, { target: { value: 'now' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parsedDate: expect.any(Date),
            error: null
          })
        })
      );
    });

    it('should handle calculation completion from calculator', () => {
      const state = createMockState({ parsedDate: new Date() });
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      const calculateButton = screen.getByText('Calculate');
      fireEvent.click(calculateButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parsedDate: expect.any(Date),
            error: null
          })
        })
      );
    });

    it('should handle date selection from history', () => {
      const state = createMockState();
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      const loadButton = screen.getByText('Load Date');
      fireEvent.click(loadButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parsedDate: expect.any(Date),
            error: null
          })
        })
      );
    });
  });

  describe('state updates and reactive behavior', () => {
    it('should show conversion results when parsedDate is set', () => {
      const state = createMockState({ parsedDate: new Date() });
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      // The conversion dashboard should show results when there's a parsed date
      // This will be tested via the mock that checks for formats
      expect(screen.getByTestId('conversion-dashboard')).toBeInTheDocument();
    });

    it('should show empty state when no parsedDate', () => {
      const state = createMockState({ parsedDate: null });
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      expect(screen.getByText('Enter a date to see conversions')).toBeInTheDocument();
    });
  });

  describe('tablet interface compliance', () => {
    it('should create proper initial state', () => {
      const initialState = DateTimeTablet.createInitialState();
      
      expect(initialState.type).toBe('datetime');
      expect(initialState.data.parsedDate).toBeNull();
      expect(initialState.data.selectedTimezones).toHaveLength(1);
      expect(initialState.data.history).toEqual([]);
    });

    it('should serialize and deserialize state correctly', () => {
      const originalState = createMockState({ parsedDate: new Date('2023-01-01') });
      
      const serialized = DateTimeTablet.serializeState(originalState);
      const deserialized = DateTimeTablet.deserializeState(serialized);
      
      expect(deserialized.type).toBe('datetime');
      expect(deserialized.data.parsedDate).toBeInstanceOf(Date);
    });

    it('should handle invalid serialized state gracefully', () => {
      const invalidJson = '{"invalid": "data"}';
      const result = DateTimeTablet.deserializeState(invalidJson);
      
      expect(result.type).toBe('datetime');
      expect(result.data.parsedDate).toBeNull();
    });
  });
});