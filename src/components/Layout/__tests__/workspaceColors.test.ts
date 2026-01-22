import { getWorkspaceColor, toPastel } from '../workspaceColors';

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

      // If by chance these two hashes collide modulo 12, this test would fail.
      // But we can check that AT LEAST distinct inputs CAN produce distinct outputs.
      // or try a third one.
      if (color1 === color3) {
        const color4 = getWorkspaceColor('workspace-C');
        expect(color1).not.toBe(color4);
      } else {
        expect(color1).not.toBe(color3);
      }
    });
  });

  describe('toPastel', () => {
    it('returns a valid hex color', () => {
      const originalColor = '#ff0000';
      const pastelColor = toPastel(originalColor);
      expect(pastelColor).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('makes the color lighter', () => {
      // Pure red
      const original = '#FF0000';
      const pastel = toPastel(original);
      // Since we mix with white, R should stay FF (255), but G and B should increase from 00

      const r = parseInt(pastel.substring(1, 3), 16);
      const g = parseInt(pastel.substring(3, 5), 16);
      const b = parseInt(pastel.substring(5, 7), 16);

      expect(r).toBeGreaterThanOrEqual(255); // Should be very close to 255
      expect(g).toBeGreaterThan(0);
      expect(b).toBeGreaterThan(0);
    });
  });
});
