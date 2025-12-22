import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ParseInspector } from '../ParseInspector';

// Mock the Icons
jest.mock('../../../../components/Icons', () => ({
  Code: ({ className }: { className: string }) => <div data-testid="code-icon" className={className}>Code</div>,
  Check: ({ className }: { className: string }) => <div data-testid="check-icon" className={className}>Check</div>,
  Copy: () => <div data-testid="copy-icon">Copy</div>,
  CheckCircle: ({ className }: { className: string }) => <div data-testid="check-circle-icon" className={className}>CheckCircle</div>,
  XCircle: ({ className }: { className: string }) => <div data-testid="x-circle-icon" className={className}>XCircle</div>
}));

// Mock the dateUtils functions
jest.mock('../../utils/dateUtils', () => ({
  simulateCrossPlatformParsing: jest.fn(() => [
    { language: 'JavaScript', success: true, result: '2023-01-01', code: 'new Date()' },
    { language: 'Python', success: true, result: '2023-01-01', code: 'datetime()' },
    { language: 'Java', success: false, code: 'Instant()', error: 'Error' }
  ]),
  isValidDateValue: jest.fn((v) => !!v),
  ensureDate: jest.fn((v) => v instanceof Date ? v : (v ? new Date() : null))
}));

describe('ParseInspector', () => {
  const mockDate = new Date('2023-01-01T12:00:00.000Z');

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('should show empty state when no input', () => {
    render(<ParseInspector inputValue="" parsedDate={null} />);
    expect(screen.getByText(/Enter a date\/time to see cross-platform parsing/i)).toBeInTheDocument();
  });

  it('should show results and handle copy feedback', async () => {
    render(<ParseInspector inputValue="" parsedDate={mockDate} />);

    expect(screen.getByText('JavaScript')).toBeInTheDocument();

    const copyButton = screen.getAllByRole('button', { name: /copy/i })[0];

    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(await screen.findByTestId('check-icon')).toBeInTheDocument();
  });
});