import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateCalculator } from '../DateCalculator';

describe('DateCalculator', () => {
  const mockOnCalculatorStateChange = jest.fn();
  const mockOnCalculationComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultCalculatorState = {
    operation: 'add' as const,
    years: 0,
    months: 0,
    weeks: 0,
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
    secondDate: '',
    durationResult: null
  };

  test('should work with Date object', () => {
    const parsedDate = new Date('2036-12-05T20:35:12.000Z');
    
    render(
      <DateCalculator
        parsedDate={parsedDate}
        calculatorState={defaultCalculatorState}
        onCalculatorStateChange={mockOnCalculatorStateChange}
        onCalculationComplete={mockOnCalculationComplete}
      />
    );

    const calculateButton = screen.getByRole('button', { name: /calculate addition/i });
    fireEvent.click(calculateButton);

    expect(mockOnCalculationComplete).toHaveBeenCalled();
    const callArg = mockOnCalculationComplete.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(Date);
    expect(callArg.toISOString()).toBe('2036-12-06T20:35:12.000Z');
  });

  test('should work with serialized date string (the real bug scenario)', () => {
    // This simulates what happens when dates are serialized/deserialized
    const parsedDate = "2036-12-05T20:35:12.000Z";
    
    render(
      <DateCalculator
        parsedDate={parsedDate as any}
        calculatorState={defaultCalculatorState}
        onCalculatorStateChange={mockOnCalculatorStateChange}
        onCalculationComplete={mockOnCalculationComplete}
      />
    );

    const calculateButton = screen.getByRole('button', { name: /calculate addition/i });
    fireEvent.click(calculateButton);

    expect(mockOnCalculationComplete).toHaveBeenCalled();
    const callArg = mockOnCalculationComplete.mock.calls[0][0];
    expect(callArg).toBeInstanceOf(Date);
    expect(callArg.toISOString()).toBe('2036-12-06T20:35:12.000Z');
  });

  test('should not work with invalid date values', () => {
    render(
      <DateCalculator
        parsedDate={null}
        calculatorState={defaultCalculatorState}
        onCalculatorStateChange={mockOnCalculatorStateChange}
        onCalculationComplete={mockOnCalculationComplete}
      />
    );

    const calculateButton = screen.getByRole('button', { name: /calculate addition/i });
    expect(calculateButton.hasAttribute('disabled')).toBe(true);
  });

  test('should handle duration calculation with date strings', () => {
    const parsedDate = "2036-12-05T20:35:12.000Z";
    const durationState = {
      ...defaultCalculatorState,
      operation: 'duration' as const,
      secondDate: '2036-12-10T20:35:12.000Z'
    };
    
    render(
      <DateCalculator
        parsedDate={parsedDate as any}
        calculatorState={durationState}
        onCalculatorStateChange={mockOnCalculatorStateChange}
        onCalculationComplete={mockOnCalculationComplete}
      />
    );

    const calculateButtons = screen.getAllByRole('button', { name: /calculate duration/i });
    const calculateButton = calculateButtons[1]; // Use the form button, not the tab button
    fireEvent.click(calculateButton);

    expect(mockOnCalculatorStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        durationResult: expect.objectContaining({
          days: 5,
          totalDays: 5
        })
      })
    );
  });
});