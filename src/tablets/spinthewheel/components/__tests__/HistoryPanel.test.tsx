import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { HistoryPanel } from '../HistoryPanel';
import type { WinnerHistoryItem } from '../../types';

const item = (id: string, label: string, timestamp: number): WinnerHistoryItem => ({
  id,
  entryId: null,
  label,
  timestamp,
});

describe('HistoryPanel', () => {
  const setup = (history: WinnerHistoryItem[] = []) => {
    const onClear = jest.fn();
    const utils = render(<HistoryPanel history={history} onClear={onClear} />);
    return {
      onClear,
      ...utils,
    };
  };

  it('shows the empty state when there are no spins', () => {
    const { getByText } = setup();
    expect(getByText(/No spins yet/i)).toBeInTheDocument();
  });

  it('renders newest-first list and count summary', () => {
    const history = [
      item('h1', 'Bob', 2000),
      item('h2', 'Alice', 1000),
      item('h3', 'Alice', 3000),
    ];
    const { getByText } = setup(history);
    expect(getByText(/3 spins/)).toBeInTheDocument();
    const summaries = Array.from(
      document.querySelectorAll('[data-testid="spinthewheel-history-summary"]'),
    ).map((el) => el.textContent);
    expect(summaries).toEqual(['Alice × 2', 'Bob × 1']);
    // Newest first in the chronological list.
    const labels = Array.from(document.querySelectorAll('ol li span')).map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(['Bob', 'Alice', 'Alice']);
  });

  it('calls onClear from the clear button', () => {
    const { getByLabelText, onClear } = setup([item('h1', 'Alice', 1)]);
    fireEvent.click(getByLabelText('Clear spin history'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disables clear and copy for empty history', () => {
    const { getByLabelText, onClear } = setup();
    const clear = getByLabelText('Clear spin history') as HTMLButtonElement;
    expect(clear.disabled).toBe(true);
    fireEvent.click(clear);
    expect(onClear).not.toHaveBeenCalled();
  });

  it('copies chronological one-per-line text to the clipboard', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByLabelText } = setup([
      item('h1', 'Bob', 2000),
      item('h2', 'Alice', 1000),
    ]);
    fireEvent.click(getByLabelText('Copy spin history to clipboard'));
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('Alice\nBob');
  });

  it('shows transient copied feedback', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { getByLabelText, findByRole, queryByRole } = setup([item('h1', 'Alice', 1)]);
    fireEvent.click(getByLabelText('Copy spin history to clipboard'));
    expect(await findByRole('status').then((el) => el.textContent)).toMatch(/Copied/i);
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(queryByRole('status')).not.toBeInTheDocument();
  });
});
