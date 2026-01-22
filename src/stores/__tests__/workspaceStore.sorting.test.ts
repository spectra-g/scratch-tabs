import { Workspace } from '../../types';

// Helper function extracted from workspaceStore for testing
const sortWorkspaces = (workspaces: Workspace[]): Workspace[] => {
  return [...workspaces].sort((a, b) => {
    // Primary: Use displayOrder if both have it
    if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
      return a.displayOrder - b.displayOrder;
    }
    // If only one has displayOrder, it comes first
    if (a.displayOrder !== undefined) return -1;
    if (b.displayOrder !== undefined) return 1;
    // Fallback: Use lastAccessed (most recent first)
    return b.lastAccessed - a.lastAccessed;
  });
};

describe('Workspace Sorting Logic', () => {
  it('sorts by displayOrder when all workspaces have it', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-3',
        name: 'Third',
        links: [],
        createdAt: 1000,
        lastAccessed: 3000,
        displayOrder: 2,
      },
      {
        id: 'ws-1',
        name: 'First',
        links: [],
        createdAt: 1000,
        lastAccessed: 1000,
        displayOrder: 0,
      },
      {
        id: 'ws-2',
        name: 'Second',
        links: [],
        createdAt: 1000,
        lastAccessed: 2000,
        displayOrder: 1,
      },
    ];

    const sorted = sortWorkspaces(workspaces);

    expect(sorted[0].id).toBe('ws-1'); // displayOrder 0
    expect(sorted[1].id).toBe('ws-2'); // displayOrder 1
    expect(sorted[2].id).toBe('ws-3'); // displayOrder 2
  });

  it('sorts by lastAccessed when no workspace has displayOrder', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-1',
        name: 'First',
        links: [],
        createdAt: 1000,
        lastAccessed: 1000,
      },
      {
        id: 'ws-3',
        name: 'Third',
        links: [],
        createdAt: 1000,
        lastAccessed: 3000,
      },
      {
        id: 'ws-2',
        name: 'Second',
        links: [],
        createdAt: 1000,
        lastAccessed: 2000,
      },
    ];

    const sorted = sortWorkspaces(workspaces);

    expect(sorted[0].id).toBe('ws-3'); // Most recent
    expect(sorted[1].id).toBe('ws-2');
    expect(sorted[2].id).toBe('ws-1'); // Least recent
  });

  it('places workspaces with displayOrder before those without', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-no-order-1',
        name: 'No Order Recent',
        links: [],
        createdAt: 1000,
        lastAccessed: 5000, // Most recent
      },
      {
        id: 'ws-ordered-2',
        name: 'Ordered 2',
        links: [],
        createdAt: 1000,
        lastAccessed: 2000,
        displayOrder: 1,
      },
      {
        id: 'ws-ordered-1',
        name: 'Ordered 1',
        links: [],
        createdAt: 1000,
        lastAccessed: 1000,
        displayOrder: 0,
      },
      {
        id: 'ws-no-order-2',
        name: 'No Order Old',
        links: [],
        createdAt: 1000,
        lastAccessed: 3000,
      },
    ];

    const sorted = sortWorkspaces(workspaces);

    // Workspaces with displayOrder come first (sorted by displayOrder)
    expect(sorted[0].id).toBe('ws-ordered-1');
    expect(sorted[1].id).toBe('ws-ordered-2');
    // Then workspaces without displayOrder (sorted by lastAccessed)
    expect(sorted[2].id).toBe('ws-no-order-1');
    expect(sorted[3].id).toBe('ws-no-order-2');
  });

  it('handles edge case with displayOrder 0', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-2',
        name: 'Second',
        links: [],
        createdAt: 1000,
        lastAccessed: 1000,
        displayOrder: 1,
      },
      {
        id: 'ws-1',
        name: 'First',
        links: [],
        createdAt: 1000,
        lastAccessed: 2000,
        displayOrder: 0,
      },
    ];

    const sorted = sortWorkspaces(workspaces);

    expect(sorted[0].id).toBe('ws-1'); // displayOrder 0
    expect(sorted[1].id).toBe('ws-2'); // displayOrder 1
  });

  it('maintains stable sort for workspaces with same lastAccessed and no displayOrder', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-1',
        name: 'First',
        links: [],
        createdAt: 1000,
        lastAccessed: 5000,
      },
      {
        id: 'ws-2',
        name: 'Second',
        links: [],
        createdAt: 2000,
        lastAccessed: 5000,
      },
    ];

    const sorted1 = sortWorkspaces(workspaces);
    const sorted2 = sortWorkspaces(workspaces);

    // Should maintain order from input since lastAccessed is same
    expect(sorted1[0].id).toBe(sorted2[0].id);
    expect(sorted1[1].id).toBe(sorted2[1].id);
  });

  it('handles empty workspace array', () => {
    const workspaces: Workspace[] = [];
    const sorted = sortWorkspaces(workspaces);

    expect(sorted).toEqual([]);
  });

  it('handles single workspace', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-1',
        name: 'Only',
        links: [],
        createdAt: 1000,
        lastAccessed: 1000,
      },
    ];

    const sorted = sortWorkspaces(workspaces);

    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('ws-1');
  });

  it('does not mutate original array', () => {
    const workspaces: Workspace[] = [
      {
        id: 'ws-2',
        name: 'Second',
        links: [],
        createdAt: 1000,
        lastAccessed: 1000,
        displayOrder: 1,
      },
      {
        id: 'ws-1',
        name: 'First',
        links: [],
        createdAt: 1000,
        lastAccessed: 2000,
        displayOrder: 0,
      },
    ];

    const original = [...workspaces];
    sortWorkspaces(workspaces);

    expect(workspaces).toEqual(original); // Original array unchanged
  });

  describe('Workspace Selection Logic (after sorting)', () => {
    it('selects most recently accessed workspace, not first in displayOrder', () => {
      // This tests the bug fix: after sorting by displayOrder,
      // we need to find the workspace with highest lastAccessed, not sortedWorkspaces[0]
      const workspaces: Workspace[] = [
        {
          id: 'ws-1',
          name: 'First (display order)',
          links: [],
          createdAt: 1000,
          lastAccessed: 1000, // Oldest access
          displayOrder: 0,
        },
        {
          id: 'ws-2',
          name: 'Second (display order)',
          links: [],
          createdAt: 1000,
          lastAccessed: 5000, // Most recently accessed
          displayOrder: 1,
        },
        {
          id: 'ws-3',
          name: 'Third (display order)',
          links: [],
          createdAt: 1000,
          lastAccessed: 3000,
          displayOrder: 2,
        },
      ];

      const sortedWorkspaces = sortWorkspaces(workspaces);

      // After sorting, workspaces are in displayOrder: ws-1, ws-2, ws-3
      expect(sortedWorkspaces[0].id).toBe('ws-1');

      // But when selecting which to activate, we should pick the most recently accessed
      const mostRecentlyAccessed = sortedWorkspaces.reduce((latest, current) => {
        return current.lastAccessed > latest.lastAccessed ? current : latest;
      }, sortedWorkspaces[0]);

      expect(mostRecentlyAccessed.id).toBe('ws-2'); // Has highest lastAccessed (5000)
    });

    it('handles single workspace correctly', () => {
      const workspaces: Workspace[] = [
        {
          id: 'ws-1',
          name: 'Only workspace',
          links: [],
          createdAt: 1000,
          lastAccessed: 1000,
          displayOrder: 0,
        },
      ];

      const sortedWorkspaces = sortWorkspaces(workspaces);
      const mostRecentlyAccessed = sortedWorkspaces.reduce((latest, current) => {
        return current.lastAccessed > latest.lastAccessed ? current : latest;
      }, sortedWorkspaces[0]);

      expect(mostRecentlyAccessed.id).toBe('ws-1');
    });
  });
});
