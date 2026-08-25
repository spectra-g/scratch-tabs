import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SidePanel } from '../SidePanel';

const tabs = [
  {
    id: 'entries',
    label: 'Names',
    icon: <span>N</span>,
    content: <p>entries-content</p>,
  },
  {
    id: 'history',
    label: 'History',
    icon: <span>H</span>,
    content: <p>history-content</p>,
  },
];

describe('SidePanel', () => {
  it('shows the first tab by default', () => {
    render(<SidePanel tabs={tabs} />);
    expect(screen.getByText('entries-content')).toBeInTheDocument();
    expect(screen.queryByText('history-content')).not.toBeInTheDocument();
  });

  it('switches content when another tab is clicked', () => {
    render(<SidePanel tabs={tabs} />);
    fireEvent.click(screen.getByRole('tab', { name: /History/i }));
    expect(screen.getByText('history-content')).toBeInTheDocument();
    expect(screen.queryByText('entries-content')).not.toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<SidePanel tabs={tabs} />);
    fireEvent.click(screen.getByRole('tab', { name: /History/i }));
    expect(screen.getByRole('tab', { name: /History/i }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: /Names/i }).getAttribute('aria-selected')).toBe('false');
  });
});
