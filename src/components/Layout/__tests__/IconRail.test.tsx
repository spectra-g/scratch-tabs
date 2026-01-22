import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconRail } from '../IconRail';
import { Workspace } from '../../../types';

// Mock the workspaceColors module
jest.mock('../workspaceColors', () => ({
  getWorkspaceColor: (id: string) => '#3b82f6',
  getWorkspaceInitial: (name: string) => name[0]?.toUpperCase() || '#',
}));

describe('IconRail', () => {
  const mockWorkspaces: Workspace[] = [
    {
      id: 'ws-1',
      name: 'Alpha',
      links: [],
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    },
    {
      id: 'ws-2',
      name: 'Beta',
      links: [],
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    },
  ];

  const mockWorkspaceTabCounts = new Map<string, number>([
    ['ws-1', 5],
    ['ws-2', 3],
  ]);

  const mockCallbacks = {
    onWorkspaceClick: jest.fn(),
    onCreateWorkspace: jest.fn(),
    onExpandSidebar: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workspace icons', () => {
    render(
      <IconRail
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        workspaceTabCounts={mockWorkspaceTabCounts}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('highlights active workspace', () => {
    render(
      <IconRail
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        workspaceTabCounts={mockWorkspaceTabCounts}
        {...mockCallbacks}
      />
    );

    const activeButton = screen.getByLabelText('Switch to Alpha');
    expect(activeButton).toHaveClass('ring-2', 'ring-primary');
  });

  it('calls onWorkspaceClick when workspace icon is clicked', () => {
    render(
      <IconRail
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        workspaceTabCounts={mockWorkspaceTabCounts}
        {...mockCallbacks}
      />
    );

    const workspaceButton = screen.getByLabelText('Switch to Beta');
    fireEvent.click(workspaceButton);

    expect(mockCallbacks.onWorkspaceClick).toHaveBeenCalledWith('ws-2');
  });

  it('calls onExpandSidebar when expand button is clicked', () => {
    render(
      <IconRail
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        workspaceTabCounts={mockWorkspaceTabCounts}
        {...mockCallbacks}
      />
    );

    const expandButton = screen.getByLabelText('Expand sidebar');
    fireEvent.click(expandButton);

    expect(mockCallbacks.onExpandSidebar).toHaveBeenCalled();
  });

  it('calls onCreateWorkspace when new workspace button is clicked', () => {
    render(
      <IconRail
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        workspaceTabCounts={mockWorkspaceTabCounts}
        {...mockCallbacks}
      />
    );

    const createButton = screen.getByLabelText('Create new workspace');
    fireEvent.click(createButton);

    expect(mockCallbacks.onCreateWorkspace).toHaveBeenCalled();
  });

  it('renders empty state when no workspaces', () => {
    render(
      <IconRail
        workspaces={[]}
        activeWorkspaceId={null}
        workspaceTabCounts={new Map()}
        {...mockCallbacks}
      />
    );

    // Should still render expand and create buttons
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument();
    expect(screen.getByLabelText('Create new workspace')).toBeInTheDocument();
  });

  it('hides on mobile (has md:flex class)', () => {
    const { container } = render(
      <IconRail
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        workspaceTabCounts={mockWorkspaceTabCounts}
        {...mockCallbacks}
      />
    );

    const rail = container.firstChild;
    expect(rail).toHaveClass('hidden', 'md:flex');
  });

  it('shows correct tooltip for workspace buttons', () => {
    render(
      <IconRail
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        workspaceTabCounts={mockWorkspaceTabCounts}
        {...mockCallbacks}
      />
    );

    const button = screen.getByLabelText('Switch to Alpha');
    expect(button).toHaveAttribute('title', expect.stringContaining('Alpha'));
  });

  it('displays tab count in tooltip', () => {
    render(
      <IconRail
        workspaces={mockWorkspaces}
        activeWorkspaceId="ws-1"
        workspaceTabCounts={mockWorkspaceTabCounts}
        {...mockCallbacks}
      />
    );

    const alphaButton = screen.getByLabelText('Switch to Alpha');
    expect(alphaButton).toHaveAttribute('title', 'Alpha (5 tabs)');

    const betaButton = screen.getByLabelText('Switch to Beta');
    expect(betaButton).toHaveAttribute('title', 'Beta (3 tabs)');
  });
});
