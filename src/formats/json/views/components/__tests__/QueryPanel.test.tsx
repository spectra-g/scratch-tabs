import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryPanel } from '../QueryPanel';
import { useJmespath } from '../../../hooks/useJmespath';
import { useQueryPanelStore } from '../../../stores/useQueryPanelStore';
import { Tab } from '../../../../../types';

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

// Mock the hooks
jest.mock('../../../hooks/useJmespath');
jest.mock('../../../stores/useQueryPanelStore');
jest.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange }: { value?: string; onChange?: (value: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

const mockUseJmespath = useJmespath as jest.MockedFunction<typeof useJmespath>;
const mockUseQueryPanelStore = useQueryPanelStore as jest.MockedFunction<typeof useQueryPanelStore>;

describe('QueryPanel', () => {
  const mockAddTab = jest.fn();
  const mockCloseQueryPanel = jest.fn();
  const sampleContent = JSON.stringify({ foo: 'bar', items: [1, 2, 3] });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock store
    mockUseQueryPanelStore.mockReturnValue({
      isQueryPanelOpen: true,
      toggleQueryPanel: jest.fn(),
      openQueryPanel: jest.fn(),
      closeQueryPanel: mockCloseQueryPanel,
    });

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('should render the panel with header and editors', () => {
    mockUseJmespath.mockReturnValue({ results: null, error: null });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    expect(screen.getByText('JSON Query (JMESPath)')).toBeInTheDocument();
    expect(screen.getByText('Copy Results')).toBeInTheDocument();
    expect(screen.getByText('Export to Tab')).toBeInTheDocument();
    expect(screen.getByTitle('Close Query Panel')).toBeInTheDocument();
  });

  it('should display results when hook returns data', () => {
    const mockResults = { foo: 'bar' };
    mockUseJmespath.mockReturnValue({
      results: mockResults,
      error: null,
    });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const editors = screen.getAllByTestId('monaco-editor');
    expect(editors.length).toBeGreaterThan(0);
  });

  it('should display error when hook returns error', () => {
    const mockError = 'Query Error: Invalid expression';
    mockUseJmespath.mockReturnValue({
      results: null,
      error: mockError,
    });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    expect(screen.getByText('Error:')).toBeInTheDocument();
  });

  it('should call closeQueryPanel when close button is clicked', () => {
    mockUseJmespath.mockReturnValue({ results: null, error: null });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const closeButton = screen.getByTitle('Close Query Panel');
    fireEvent.click(closeButton);

    expect(mockCloseQueryPanel).toHaveBeenCalledTimes(1);
  });

  it('should copy results to clipboard when Copy button is clicked', async () => {
    const mockResults = { foo: 'bar' };
    mockUseJmespath.mockReturnValue({
      results: mockResults,
      error: null,
    });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const copyButton = screen.getByTitle('Copy Results');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        JSON.stringify(mockResults, null, 2)
      );
    });

    // Should show "Copied" feedback
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('should not copy when results are empty', async () => {
    mockUseJmespath.mockReturnValue({ results: null, error: null });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const copyButton = screen.getByTitle('Copy Results');
    expect(copyButton).toBeDisabled();

    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('should export results to a new tab when Export button is clicked', () => {
    const mockResults = { data: 'test' };
    mockUseJmespath.mockReturnValue({
      results: mockResults,
      error: null,
    });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const exportButton = screen.getByTitle('Export to New Tab');
    fireEvent.click(exportButton);

    expect(mockAddTab).toHaveBeenCalledTimes(1);

    const tabArg = mockAddTab.mock.calls[0][0] as Tab;
    expect(tabArg.title).toBe('Query Results');
    expect(tabArg.content).toBe(JSON.stringify(mockResults, null, 2));
    expect(tabArg.language).toBe('json');
  });

  it('should not export when results are empty', () => {
    mockUseJmespath.mockReturnValue({ results: null, error: null });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const exportButton = screen.getByTitle('Export to New Tab');
    expect(exportButton).toBeDisabled();

    fireEvent.click(exportButton);

    expect(mockAddTab).not.toHaveBeenCalled();
  });

  it('should handle error results when copying', async () => {
    const mockError = 'Query Error: Test error';
    mockUseJmespath.mockReturnValue({
      results: null,
      error: mockError,
    });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const copyButton = screen.getByTitle('Copy Results');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockError);
    });
  });

  it('should show appropriate message for different result states', () => {
    // No results
    mockUseJmespath.mockReturnValue({ results: null, error: null });
    const { rerender, unmount } = render(
      <QueryPanel content={sampleContent} addTab={mockAddTab} />
    );

    expect(screen.getByText('Results (enter a query above):')).toBeInTheDocument();
    unmount();

    // With error
    mockUseJmespath.mockReturnValue({
      results: null,
      error: 'Test error',
    });
    const { unmount: unmount2 } = render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    expect(screen.getByText('Error:')).toBeInTheDocument();
    unmount2();

    // With results
    mockUseJmespath.mockReturnValue({
      results: { data: 'test' },
      error: null,
    });
    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    expect(screen.getByText('Results:')).toBeInTheDocument();
  });

  it('should handle primitive result values', () => {
    mockUseJmespath.mockReturnValue({
      results: 42,
      error: null,
    });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    // Should format primitive as JSON
    const editors = screen.getAllByTestId('monaco-editor');
    expect(editors.length).toBeGreaterThan(0);
  });

  it('should handle array results', () => {
    mockUseJmespath.mockReturnValue({
      results: [1, 2, 3],
      error: null,
    });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const editors = screen.getAllByTestId('monaco-editor');
    expect(editors.length).toBeGreaterThan(0);
  });

  it('should reset copied state after timeout', async () => {
    jest.useFakeTimers();

    const mockResults = { foo: 'bar' };
    mockUseJmespath.mockReturnValue({
      results: mockResults,
      error: null,
    });

    render(<QueryPanel content={sampleContent} addTab={mockAddTab} />);

    const copyButton = screen.getByTitle('Copy Results');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText('Copy Results')).toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
