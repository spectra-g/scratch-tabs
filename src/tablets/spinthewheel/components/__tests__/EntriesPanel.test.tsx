import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EntriesPanel } from '../EntriesPanel';
import type { WheelEntry } from '../../types';

const entriesFrom = (labels: string[]): WheelEntry[] =>
  labels.map((label) => ({ id: label, label, enabled: true }));

describe('EntriesPanel', () => {
  const setup = (initialLabels: string[] = ['Alice', 'Bob']) => {
    const onChange = jest.fn();
    const { container } = render(
      <EntriesPanel entries={entriesFrom(initialLabels)} onChange={onChange} />,
    );
    const textarea = container.querySelector(
      '#spinthewheel-entries',
    ) as HTMLTextAreaElement;
    return { textarea, onChange };
  };

  it('renders the current entries one per line', () => {
    const { textarea } = setup();
    expect(textarea.value).toBe('Alice\nBob');
  });

  it('emits parsed entries on every keystroke', () => {
    const { textarea, onChange } = setup();
    fireEvent.change(textarea, { target: { value: 'Alice\nBob\nCarol' } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: 'Alice' }),
      expect.objectContaining({ label: 'Bob' }),
      expect.objectContaining({ label: 'Carol' }),
    ]);
  });

  it.each([
    ['trailing newline', 'Alice\n'],
    ['trailing space', 'Alice '],
    ['blank line mid-edit', '\n\nAlice'],
  ])('preserves in-progress typing (%s)', (_label, raw) => {
    const { textarea } = setup();
    fireEvent.change(textarea, { target: { value: raw } });
    // The parent echoes back normalized labels; the raw text must survive.
    expect(textarea.value).toBe(raw);
  });

  it('adopts genuine external entry changes (restore, remove-winner)', () => {
    const { container, rerender } = render(
      <EntriesPanel
        entries={entriesFrom(['Alice', 'Bob'])}
        onChange={jest.fn()}
      />,
    );
    const textarea = () => container.querySelector('#spinthewheel-entries') as HTMLTextAreaElement;
    rerender(
      <EntriesPanel
        entries={entriesFrom(['Zed'])}
        onChange={jest.fn()}
      />,
    );
    expect(textarea().value).toBe('Zed');
  });

  it('adopts external changes after the user finished typing a partial line', () => {
    const onChange = jest.fn();
    const { container, rerender } = render(
      <EntriesPanel entries={entriesFrom(['Alice'])} onChange={onChange} />,
    );
    const textarea = container.querySelector('#spinthewheel-entries') as HTMLTextAreaElement;

    // User is mid-edit with a dangling fragment.
    fireEvent.change(textarea, { target: { value: 'Alice and' } });
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: 'Alice and' }),
    ]);

    // External change that does NOT match what the user typed → adopt it.
    rerender(<EntriesPanel entries={entriesFrom(['Fresh'])} onChange={onChange} />);
    expect(textarea.value).toBe('Fresh');
  });

  it('keeps local text when the parent echo matches what was typed', () => {
    const onChange = jest.fn();
    const { container, rerender } = render(
      <EntriesPanel entries={entriesFrom([])} onChange={onChange} />,
    );
    const textarea = container.querySelector('#spinthewheel-entries') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'Solo Player' } });
    // Parent stores trimmed parse of "Solo Player" — identical here.
    rerender(<EntriesPanel entries={entriesFrom(['Solo Player'])} onChange={onChange} />);
    expect(textarea.value).toBe('Solo Player');
  });

  it('shows the entry count', () => {
    const { getByText } = render(
      <EntriesPanel entries={entriesFrom(['Alice', 'Bob', 'Carol'])} onChange={jest.fn()} />,
    );
    expect(getByText('3 entries')).toBeInTheDocument();
  });
});

describe('EntriesPanel toolbar', () => {
  const setup = (labels: string[]) => {
    const onChange = jest.fn();
    const utils = render(<EntriesPanel entries={entriesFrom(labels)} onChange={onChange} />);
    return { onChange, ...utils };
  };

  it('sorts A→Z (case-insensitive)', () => {
    const { getByLabelText, onChange } = setup(['carol', 'Bob', 'alice']);
    fireEvent.click(getByLabelText('Sort entries alphabetically'));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: 'alice' }),
      expect.objectContaining({ label: 'Bob' }),
      expect.objectContaining({ label: 'carol' }),
    ]);
  });

  it('dedupes case-insensitively keeping the first occurrence', () => {
    const { getByLabelText, onChange } = setup(['Alice', 'ALICE', 'Bob']);
    fireEvent.click(getByLabelText('Remove duplicate entries'));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'Alice' }),
      expect.objectContaining({ id: 'Bob' }),
    ]);
  });

  it('shuffles into a permutation of the same entries', () => {
    const labels = ['A', 'B', 'C', 'D', 'E'];
    const { getByLabelText, onChange } = setup(labels);
    fireEvent.click(getByLabelText('Shuffle entries'));
    const shuffled = onChange.mock.lastCall[0] as WheelEntry[];
    expect([...shuffled].sort((a, b) => a.id.localeCompare(b.id)).map((e) => e.label)).toEqual(
      [...labels].sort(),
    );
  });

  it('removes blank lines from the raw text without emitting intermediate churn', () => {
    const onChange = jest.fn();
    const { container, getByLabelText } = render(
      <EntriesPanel entries={entriesFrom(['Alice'])} onChange={onChange} />,
    );
    const textarea = container.querySelector('#spinthewheel-entries') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '\nAlice\n\n\nBob\n\n' } });
    fireEvent.click(getByLabelText('Remove blank lines'));
    expect(textarea.value).toBe('Alice\nBob');
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: 'Alice' }),
      expect.objectContaining({ label: 'Bob' }),
    ]);
  });

  it('keeps enabled flags when removing blank lines', () => {
    const entries: WheelEntry[] = [
      { id: '1', label: 'Alice', enabled: false },
      { id: '2', label: 'Bob', enabled: true },
    ];
    const onChange = jest.fn();
    const { container, getByLabelText } = render(
      <EntriesPanel entries={entries} onChange={onChange} />,
    );
    const textarea = container.querySelector('#spinthewheel-entries') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Alice\n\nBob' } });
    fireEvent.click(getByLabelText('Remove blank lines'));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ label: 'Alice', enabled: false }),
      expect.objectContaining({ label: 'Bob', enabled: true }),
    ]);
  });
});

describe('EntriesPanel list mode', () => {
  const setupList = (entries: WheelEntry[]) => {
    const onChange = jest.fn();
    render(<EntriesPanel entries={entries} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Switch to list editor'));
    return { onChange };
  };

  it('toggles an entry via its checkbox', () => {
    const { onChange } = setupList(entriesFrom(['Alice', 'Bob']));
    fireEvent.click(screen.getByLabelText('Include Bob on the wheel'));
    expect(onChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'Alice', enabled: true }),
      expect.objectContaining({ id: 'Bob', enabled: false }),
    ]);
  });

  it('deletes an entry via its delete button', () => {
    const { onChange } = setupList(entriesFrom(['Alice', 'Bob']));
    fireEvent.click(screen.getByLabelText('Delete Alice'));
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'Bob' })]);
  });

  it('greys out disabled entries with strikethrough styling', () => {
    setupList([
      { id: '1', label: 'Alice', enabled: false },
      { id: '2', label: 'Bob', enabled: true },
    ]);
    const aliceLabel = screen.getByText('Alice');
    expect(aliceLabel).toHaveClass('line-through');
    expect(screen.getByText('Bob')).not.toHaveClass('line-through');
  });

  it('shows active/total count when some entries are disabled', () => {
    setupList([
      { id: '1', label: 'Alice', enabled: false },
      { id: '2', label: 'Bob', enabled: true },
    ]);
    expect(screen.getByText('1/2 entries')).toBeInTheDocument();
  });

  it('switches back to the text editor showing current labels', () => {
    const entries: WheelEntry[] = [
      { id: '1', label: 'Alice', enabled: true },
      { id: '2', label: 'Bob', enabled: false },
    ];
    render(<EntriesPanel entries={entries} onChange={jest.fn()} />);
    fireEvent.click(screen.getByLabelText('Switch to list editor'));
    fireEvent.click(screen.getByLabelText('Switch to text editor'));
    const textarea = document.querySelector('#spinthewheel-entries') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Alice\nBob');
  });
});
