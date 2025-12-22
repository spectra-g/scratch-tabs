import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DateTimeTablet } from '../DateTimeTablet';
import { DateTimeTabletState } from '../types';

// We need to render the component through the tablet's render method
const DateTimeTabletComponent: React.FC<{ state: DateTimeTabletState, onChange: (state: DateTimeTabletState) => void }> = ({ state, onChange }) => {
  return DateTimeTablet.render(state, onChange as any) as React.ReactElement;
};

// Mock the components and icons to avoid complex dependencies
jest.mock('../components/LiveHeader', () => ({
  LiveHeader: ({ onSetInput }: any) => (
    <div data-testid="live-header">
      <button onClick={() => onSetInput('2025-12-22')}>Set Live</button>
    </div>
  )
}));

jest.mock('../components/SmartInput', () => ({
  SmartInput: ({ inputValue, onUpdate }: any) => (
    <div data-testid="smart-input">
      <input
        data-testid="main-input"
        value={inputValue}
        onChange={(e) => onUpdate(e.target.value, null, null)}
        placeholder="Date input"
      />
    </div>
  )
}));

jest.mock('../components/QuickAdjustPanel', () => ({
  QuickAdjustPanel: () => <div data-testid="quick-adjust">Quick Adjust</div>
}));

jest.mock('../components/ConversionDashboard', () => ({
  ConversionDashboard: ({ formats }: any) => (
    <div data-testid="conversion-dashboard">
      {formats ? 'Conversion results' : 'Enter a date to see conversions'}
    </div>
  )
}));

jest.mock('../components/HistorySidebar', () => ({
  HistorySidebar: ({ onSelectDate }: any) => (
    <div data-testid="history-sidebar">
      <button onClick={() => onSelectDate(new Date())}>Load Date</button>
    </div>
  )
}));

jest.mock('../components/TimezoneExplorer', () => ({
  TimezoneExplorer: () => <div data-testid="timezone-explorer">Timezone Explorer</div>
}));

jest.mock('../components/ParseInspector', () => ({
  ParseInspector: () => <div data-testid="parse-inspector">Parse Inspector</div>
}));

describe('DateTimeTablet', () => {
  const createMockState = (overrides: Partial<DateTimeTabletState['data']> = {}): DateTimeTabletState => ({
    type: "datetime",
    data: {
      inputValue: 'now',
      parsedDate: null,
      error: null,
      selectedTimezones: [],
      history: [],
      isOptimizing: false,
      selectedElementId: null,
      expandedAccordionSections: [],
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
      expect(screen.getByTestId('history-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('smart-input')).toBeInTheDocument();
      expect(screen.getByTestId('conversion-dashboard')).toBeInTheDocument();
    });
  });

  describe('data flow and interactions', () => {
    it('should handle input changes from SmartInput', () => {
      const state = createMockState();
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      const input = screen.getByTestId('main-input');
      fireEvent.change(input, { target: { value: '2025-12-22' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputValue: '2025-12-22'
          })
        })
      );
    });

    it('should handle set input from LiveHeader', () => {
      const state = createMockState();
      render(<DateTimeTabletComponent state={state} onChange={mockOnChange} />);

      const setLiveBtn = screen.getByText('Set Live');
      fireEvent.click(setLiveBtn);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            inputValue: '2025-12-22'
          })
        })
      );
    });
  });

  describe('tablet interface compliance', () => {
    it('should create proper initial state', () => {
      const initialState = DateTimeTablet.createInitialState();

      expect(initialState.type).toBe('datetime');
      expect(initialState.data.inputValue).toBe('now');
      expect(initialState.data.selectedTimezones).toHaveLength(1);
    });
  });
});