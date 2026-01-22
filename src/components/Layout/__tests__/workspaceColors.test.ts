import { getWorkspaceColor } from '../workspaceColors';

describe('workspaceColors', () => {
  describe('getWorkspaceColor', () => {
    it('returns a color string', () => {
      const color = getWorkspaceColor('test-id');
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('returns deterministic colors', () => {
      const color1 = getWorkspaceColor('workspace-A');
      const color2 = getWorkspaceColor('workspace-A');
      const color3 = getWorkspaceColor('workspace-B');

      expect(color1).toBe(color2);

      // Note: In a small palette (12 items), collisions are possible but unlikely for sequential IDs.
      // This assertion assumes 'workspace-A' and 'workspace-B' hash to different indices.
      // If they collide, change the input string to 'workspace-C'.
      if (color1 === color3) {
        const color4 = getWorkspaceColor('workspace-C');
        expect(color1).not.toBe(color4);
      } else {
        expect(color1).not.toBe(color3);
      }
    });
  });
});
