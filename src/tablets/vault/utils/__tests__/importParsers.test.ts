import { parseTerminalHistory, parseVscodeSnippets, parseMarkdownNotes, parseImportData } from '../importParsers';

describe('Import Parsers', () => {
  describe('parseTerminalHistory', () => {
    it('should parse terminal history format correctly', () => {
      const input = `998 chmod +x inspect_folder.sh
999 git status
1000 npm install
1001 docker ps`;

      const result = parseTerminalHistory(input);

      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(4);
      expect(result.items[0]).toEqual({
        title: 'chmod +x inspect_folder.sh',
        content: 'chmod +x inspect_folder.sh',
        contentType: 'script',
        labels: ['terminal-history', 'chmod']
      });
      expect(result.items[1]).toEqual({
        title: 'git status',
        content: 'git status',
        contentType: 'script',
        labels: ['terminal-history', 'git']
      });
    });

    it('should handle duplicate commands in history', () => {
      const input = `985 del inspect_folder.sh
986 rm inspect_folder.sh
987 vi inspect_folder.sh
988 chmod +x inspect_folder.sh
989 ./inspect_folder.sh
990 cat processed_folder_content_20250508_160
991 cat processed_folder_content_20250508_160528.txt
992 ./inspect_folder.sh
993 cat processed_folder_content_20250508_160749.txt
994 file hooks/useEditorScrollManager.ts
995 file --mime-type -b hooks/useEditorScrollManager.ts
996 rm inspect_folder.sh
997 vi inspect_folder.sh
998 chmod +x inspect_folder.sh
999 ./inspect_folder.sh
1000 LC_ALL=C od -c -tx1 hooks/useEditorScrollManager.ts | head -n 20`;

      const result = parseTerminalHistory(input);

      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(16); // All items should be parsed
      
      // Check that duplicate commands are present
      const viCommands = result.items.filter(item => item.content === 'vi inspect_folder.sh');
      const chmodCommands = result.items.filter(item => item.content === 'chmod +x inspect_folder.sh');
      const inspectCommands = result.items.filter(item => item.content === './inspect_folder.sh');
      const rmCommands = result.items.filter(item => item.content === 'rm inspect_folder.sh');
      
      expect(viCommands).toHaveLength(2);
      expect(chmodCommands).toHaveLength(2);
      expect(inspectCommands).toHaveLength(3);
      expect(rmCommands).toHaveLength(2);
    });

    it('should handle empty input', () => {
      const result = parseTerminalHistory('');
      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(0);
    });

    it('should handle non-history format lines', () => {
      const input = `ls -la
pwd
echo "hello world"`;

      const result = parseTerminalHistory(input);

      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(3);
      expect(result.items[0].content).toBe('ls -la');
      expect(result.items[0].labels).toEqual(['terminal-history']);
    });
  });

  describe('parseVscodeSnippets', () => {
    it('should parse VS Code snippets JSON correctly', () => {
      const input = `{
        "Console log": {
          "body": "console.log($1);",
          "description": "Console log"
        },
        "Function": {
          "body": ["function $1($2) {", "  $3", "}"],
          "description": "Function"
        }
      }`;

      const result = parseVscodeSnippets(input);

      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        title: 'Console log',
        content: 'console.log($1);',
        contentType: 'code',
        labels: ['vscode-snippet']
      });
      expect(result.items[1]).toEqual({
        title: 'Function',
        content: 'function $1($2) {\n  $3\n}',
        contentType: 'code',
        labels: ['vscode-snippet']
      });
    });

    it('should handle invalid JSON', () => {
      const input = `{ invalid json }`;
      const result = parseVscodeSnippets(input);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.items).toHaveLength(0);
    });

    it('should handle empty snippets', () => {
      const input = `{}`;
      const result = parseVscodeSnippets(input);
      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('parseMarkdownNotes', () => {
    it('should parse markdown notes separated by horizontal rules', () => {
      const input = `# Note 1
This is the first note content.

---

# Note 2
This is the second note content.

---

Note 3
This note has no header.`;

      const result = parseMarkdownNotes(input);

      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toEqual({
        title: 'Note 1',
        content: 'This is the first note content.',
        contentType: 'plaintext',
        labels: ['markdown-import']
      });
      expect(result.items[1]).toEqual({
        title: 'Note 2',
        content: 'This is the second note content.',
        contentType: 'plaintext',
        labels: ['markdown-import']
      });
      expect(result.items[2].title).toBe('Note 3');
      expect(result.items[2].content).toBe('This note has no header.');
    });

    it('should handle single note without separators', () => {
      const input = `# Single Note
This is a single note without separators.`;

      const result = parseMarkdownNotes(input);

      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Single Note');
    });

    it('should handle empty input', () => {
      const result = parseMarkdownNotes('');
      expect(result.errors).toHaveLength(0);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('parseImportData', () => {
    it('should route to correct parser based on source', () => {
      const terminalInput = '998 ls -la';
      const terminalResult = parseImportData('terminal-history', terminalInput);
      expect(terminalResult.items).toHaveLength(1);
      expect(terminalResult.items[0].contentType).toBe('script');

      const vscodeInput = '{"test": {"body": "test"}}';
      const vscodeResult = parseImportData('vscode-snippets', vscodeInput);
      expect(vscodeResult.items).toHaveLength(1);
      expect(vscodeResult.items[0].contentType).toBe('code');

      const markdownInput = '# Test\nContent\n---\n# Test2\nContent2';
      const markdownResult = parseImportData('markdown-notes', markdownInput);
      expect(markdownResult.items).toHaveLength(2);
      expect(markdownResult.items[0].contentType).toBe('plaintext');
    });

    it('should handle unknown source', () => {
      const result = parseImportData('unknown-source' as any, 'test');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unknown import source');
      expect(result.items).toHaveLength(0);
    });
  });
}); 