import React from 'react';
import { fireEvent, render } from '@testing-library/react';
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
});
