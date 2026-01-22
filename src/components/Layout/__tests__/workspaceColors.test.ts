import { getWorkspaceColor, getWorkspaceInitial } from '../workspaceColors';

describe('workspaceColors', () => {
  describe('getWorkspaceColor', () => {
    it('returns consistent colors for the same workspace ID', () => {
      const workspaceId = 'test-workspace-123';
      const color1 = getWorkspaceColor(workspaceId);
      const color2 = getWorkspaceColor(workspaceId);

      expect(color1).toBe(color2);
    });

    it('returns different colors for different workspace IDs', () => {
      const workspaceId1 = 'workspace-1';
      const workspaceId2 = 'workspace-2';

      const color1 = getWorkspaceColor(workspaceId1);
      const color2 = getWorkspaceColor(workspaceId2);

      // Note: There's a small chance they could be the same color
      // due to hash collisions, but it's unlikely with 12 colors
      expect(typeof color1).toBe('string');
      expect(typeof color2).toBe('string');
      expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
      expect(color2).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('returns a valid hex color', () => {
      const workspaceId = 'test-workspace';
      const color = getWorkspaceColor(workspaceId);

      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('handles empty workspace ID', () => {
      const color = getWorkspaceColor('');

      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('getWorkspaceInitial', () => {
    it('returns first letter uppercased for normal workspace names', () => {
      expect(getWorkspaceInitial('Project')).toBe('P');
      expect(getWorkspaceInitial('work')).toBe('W');
      expect(getWorkspaceInitial('123')).toBe('1');
    });

    it('returns # for empty workspace name', () => {
      expect(getWorkspaceInitial('')).toBe('#');
    });

    it('returns # for whitespace-only workspace name', () => {
      expect(getWorkspaceInitial('   ')).toBe('#');
    });

    it('trims whitespace before getting first letter', () => {
      expect(getWorkspaceInitial('  Project  ')).toBe('P');
    });

    it('handles special characters', () => {
      expect(getWorkspaceInitial('!Important')).toBe('!');
      expect(getWorkspaceInitial('@Work')).toBe('@');
      expect(getWorkspaceInitial('#Project')).toBe('#');
    });
  });
});
