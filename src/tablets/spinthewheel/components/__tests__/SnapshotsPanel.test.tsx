import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { SnapshotsPanel } from '../SnapshotsPanel';
import type { WheelSnapshot } from '../../types';

const snapshot = (id: string, name: string, count = 2): WheelSnapshot => ({
  id,
  name,
  createdAt: 1,
  entries: Array.from({ length: count }, (_, i) => ({
    id: `${id}-e${i}`,
    label: `Name ${i}`,
    enabled: true,
  })),
});

describe('SnapshotsPanel', () => {
  const setup = (snapshots: WheelSnapshot[] = [], entryCount = 3) => {
    const onSave = jest.fn();
    const onRestore = jest.fn();
    const onDelete = jest.fn();
    const utils = render(
      <SnapshotsPanel
        snapshots={snapshots}
        entryCount={entryCount}
        onSave={onSave}
        onRestore={onRestore}
        onDelete={onDelete}
      />,
    );
    return { onSave, onRestore, onDelete, ...utils };
  };

  it('shows the empty state', () => {
    const { getByText } = setup();
    expect(getByText(/No snapshots yet/i)).toBeInTheDocument();
  });

  it('lists snapshot names with entry counts', () => {
    const { getByText } = setup([snapshot('s1', 'Class 5B'), snapshot('s2', 'Team A', 4)]);
    expect(getByText('Class 5B')).toBeInTheDocument();
    expect(getByText('2 entries')).toBeInTheDocument();
    expect(getByText('Team A')).toBeInTheDocument();
    expect(getByText('4 entries')).toBeInTheDocument();
  });

  it('saves with a trimmed, non-empty name and clears the input', () => {
    const { getByLabelText, getByRole, onSave } = setup();
    const input = getByLabelText('Snapshot name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Friday raffle  ' } });
    fireEvent.click(getByRole('button', { name: /Save current entries/i }));
    expect(onSave).toHaveBeenCalledWith('Friday raffle');
    expect(input.value).toBe('');
  });

  it('disables save for blank names or zero entries', () => {
    const { getByRole } = setup([], 0);
    const save = getByRole('button', { name: /Save current entries/i }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('saves on Enter key as well as click', () => {
    const { getByLabelText, onSave } = setup();
    const input = getByLabelText('Snapshot name');
    fireEvent.change(input, { target: { value: 'X' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('X');
  });

  it('restores and deletes via the row buttons', () => {
    const { getByLabelText, onRestore, onDelete } = setup([
      snapshot('s1', 'Class 5B'),
      snapshot('s2', 'Team A'),
    ]);
    fireEvent.click(getByLabelText('Restore "Class 5B"'));
    expect(onRestore).toHaveBeenCalledWith('s1');
    fireEvent.click(getByLabelText('Delete "Team A"'));
    expect(onDelete).toHaveBeenCalledWith('s2');
  });
});
