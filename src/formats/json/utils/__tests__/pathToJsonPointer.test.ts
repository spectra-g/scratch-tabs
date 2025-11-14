/**
 * Tests for pathToJsonPointer utility function
 * Converts dot-notation paths (e.g., "users[1].name") to JSON Pointers (e.g., "/users/1/name")
 */

/**
 * Converts a dot-notation path to a JSON Pointer (RFC 6901)
 * This is extracted for testing purposes
 */
export const pathToJsonPointer = (path: string): string => {
  if (!path || !path.trim()) return '';

  // Replace array brackets with dots, then split on dots
  // "users[1].name" -> "users.1.name" -> ["users", "1", "name"]
  const normalized = path.trim().replace(/\[/g, '.').replace(/\]/g, '');
  const parts = normalized.split('.').filter(Boolean).map(part => part.trim());

  // Convert to JSON Pointer format: "/users/1/name"
  return '/' + parts.join('/');
};

describe('pathToJsonPointer', () => {
  describe('Simple paths', () => {
    it('should convert simple property path', () => {
      expect(pathToJsonPointer('name')).toBe('/name');
      expect(pathToJsonPointer('age')).toBe('/age');
    });

    it('should convert nested property path', () => {
      expect(pathToJsonPointer('user.name')).toBe('/user/name');
      expect(pathToJsonPointer('data.items.title')).toBe('/data/items/title');
    });

    it('should handle deeply nested paths', () => {
      expect(pathToJsonPointer('a.b.c.d.e')).toBe('/a/b/c/d/e');
    });
  });

  describe('Array paths', () => {
    it('should convert array index path', () => {
      expect(pathToJsonPointer('[0]')).toBe('/0');
      expect(pathToJsonPointer('[5]')).toBe('/5');
    });

    it('should convert array element property path', () => {
      expect(pathToJsonPointer('[0].name')).toBe('/0/name');
      expect(pathToJsonPointer('[1].user.email')).toBe('/1/user/email');
    });

    it('should convert property with array index', () => {
      expect(pathToJsonPointer('users[0]')).toBe('/users/0');
      expect(pathToJsonPointer('items[3].name')).toBe('/items/3/name');
    });

    it('should handle multiple array indices', () => {
      expect(pathToJsonPointer('data[0].items[1]')).toBe('/data/0/items/1');
      expect(pathToJsonPointer('matrix[2][3]')).toBe('/matrix/2/3');
    });
  });

  describe('Complex paths', () => {
    it('should handle mixed object and array paths', () => {
      expect(pathToJsonPointer('users[0].addresses[1].city')).toBe('/users/0/addresses/1/city');
      expect(pathToJsonPointer('data.results[0].items[2].name')).toBe('/data/results/0/items/2/name');
    });

    it('should handle consecutive array indices', () => {
      expect(pathToJsonPointer('grid[0][1][2]')).toBe('/grid/0/1/2');
    });
  });

  describe('Edge cases', () => {
    it('should return empty string for empty path', () => {
      expect(pathToJsonPointer('')).toBe('');
      expect(pathToJsonPointer('   ')).toBe('');
    });

    it('should handle whitespace in path', () => {
      expect(pathToJsonPointer('  user.name  ')).toBe('/user/name');
    });

    it('should handle root path', () => {
      expect(pathToJsonPointer('')).toBe('');
    });

    it('should handle path with only array index', () => {
      expect(pathToJsonPointer('[0]')).toBe('/0');
    });

    it('should filter out empty parts', () => {
      expect(pathToJsonPointer('user..name')).toBe('/user/name'); // Double dot
      expect(pathToJsonPointer('.user.name')).toBe('/user/name'); // Leading dot
      expect(pathToJsonPointer('user.name.')).toBe('/user/name'); // Trailing dot
    });
  });

  describe('Special characters', () => {
    it('should handle property names with numbers', () => {
      expect(pathToJsonPointer('user123.name456')).toBe('/user123/name456');
    });

    it('should handle property names with underscores', () => {
      expect(pathToJsonPointer('user_data.first_name')).toBe('/user_data/first_name');
    });

    it('should handle property names with hyphens', () => {
      expect(pathToJsonPointer('user-data.first-name')).toBe('/user-data/first-name');
    });
  });

  describe('Real-world examples', () => {
    it('should handle GitHub API response paths', () => {
      expect(pathToJsonPointer('data.repository.issues[0].title')).toBe('/data/repository/issues/0/title');
      expect(pathToJsonPointer('user.repos[2].owner.login')).toBe('/user/repos/2/owner/login');
    });

    it('should handle nested configuration paths', () => {
      expect(pathToJsonPointer('config.server.database.connections[0].host')).toBe(
        '/config/server/database/connections/0/host'
      );
    });

    it('should handle nested array of objects', () => {
      expect(pathToJsonPointer('teams[0].members[1].roles[2]')).toBe('/teams/0/members/1/roles/2');
    });
  });
});
