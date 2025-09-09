import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveHeader } from '../LiveHeader';

// Mock the Clock icon
jest.mock('../../../../components/Icons', () => ({
  Clock: ({ size, className }: { size: number; className: string }) => (
    <div data-testid="clock-icon" data-size={size} className={className}>Clock</div>
  )
}));

describe('LiveHeader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock a specific date/time for consistent testing
    jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render the live header with all time formats', () => {
    render(<LiveHeader />);

    expect(screen.getByText('Live System Time')).toBeInTheDocument();
    expect(screen.getByText('Epoch (s)')).toBeInTheDocument();
    expect(screen.getByText('UTC Time')).toBeInTheDocument();
    expect(screen.getByText('Local Time')).toBeInTheDocument();
  });

  it('should display correct epoch time', () => {
    render(<LiveHeader />);
    
    // 2023-01-01T12:00:00.000Z = 1672574400 seconds since epoch
    expect(screen.getByText('1672574400')).toBeInTheDocument();
  });

  it('should display correct UTC time', () => {
    render(<LiveHeader />);
    
    expect(screen.getByText('2023-01-01T12:00:00.000Z')).toBeInTheDocument();
  });

  it('should display local time with timezone offset', () => {
    render(<LiveHeader />);
    
    // The local time display depends on the system timezone
    // We'll just check that some local time is displayed
    const localTimeElements = screen.getAllByText(/2023-01-01T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}/);
    expect(localTimeElements.length).toBeGreaterThan(0);
  });

  it('should update time every second', () => {
    render(<LiveHeader />);
    
    // Initial time
    expect(screen.getByText('1672574400')).toBeInTheDocument();
    
    // Advance time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Should show updated time (1 second later)
    expect(screen.getByText('1672574401')).toBeInTheDocument();
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    const { unmount } = render(<LiveHeader />);
    
    // Unmount the component
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    
    clearIntervalSpy.mockRestore();
  });

  it('should render the clock icon', () => {
    render(<LiveHeader />);
    
    const clockIcon = screen.getByTestId('clock-icon');
    expect(clockIcon).toBeInTheDocument();
    expect(clockIcon).toHaveAttribute('data-size', '20');
    expect(clockIcon).toHaveClass('text-gray-400');
  });

  it('should have proper accessibility structure', () => {
    render(<LiveHeader />);
    
    // Check that the component has proper semantic structure
    const header = screen.getByText('Live System Time').closest('div');
    expect(header).toBeInTheDocument();
    
    // Check that time labels are properly structured
    expect(screen.getByText('Epoch (s)')).toHaveClass('text-xs', 'text-gray-400');
    expect(screen.getByText('UTC Time')).toHaveClass('text-xs', 'text-gray-400');
    expect(screen.getByText('Local Time')).toHaveClass('text-xs', 'text-gray-400');
  });

  it('should handle timezone offset calculations correctly', () => {
    // Mock a timezone with a specific offset
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = jest.fn(() => 300); // UTC-5 (Eastern Time) - note: positive value means behind UTC
    
    render(<LiveHeader />);
    
    // Should display local time with correct offset
    // UTC time: 12:00:00, local time should be 07:00:00 with -05:00 offset
    expect(screen.getByText(/2023-01-01T07:00:00\.000-05:00/)).toBeInTheDocument();
    
    // Restore original method
    Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
  });
});