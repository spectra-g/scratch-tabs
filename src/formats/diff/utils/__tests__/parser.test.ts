import {
  parseDiff,
  reconstructDiff,
  getDiffSummary,
  getFileDisplayName,
  getFileStatusBadge,
  getFileStatusColor
} from '../parser';

describe('Diff Parser', () => {
  describe('parseDiff', () => {
    it('should parse a simple single-file diff', () => {
      const diffText = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,4 @@
 line 1
-line 2
+line 2 modified
+new line 3
 line 3`;

      const result = parseDiff(diffText);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].fileName).toBe('test.txt');
      expect(result.files[0].hunks).toHaveLength(1);
      expect(result.files[0].hunks[0].lines).toHaveLength(5);
      expect(result.stats.totalAdditions).toBe(2);
      expect(result.stats.totalDeletions).toBe(1);
    });

    it('should parse multi-file diff', () => {
      const diffText = `diff --git a/file1.txt b/file1.txt
index 1234567..abcdefg 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1,2 +1,3 @@
 line 1
+added line
 line 2
diff --git a/file2.txt b/file2.txt
index 2345678..bcdefgh 100644
--- a/file2.txt
+++ b/file2.txt
@@ -1,2 +1,1 @@
 keep this
-remove this`;

      const result = parseDiff(diffText);

      expect(result.files).toHaveLength(2);
      expect(result.files[0].fileName).toBe('file1.txt');
      expect(result.files[1].fileName).toBe('file2.txt');
      expect(result.stats.totalFiles).toBe(2);
    });

    it('should handle new file creation', () => {
      const diffText = `diff --git a/newfile.txt b/newfile.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/newfile.txt
@@ -0,0 +1,2 @@
+first line
+second line`;

      const result = parseDiff(diffText);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].isNewFile).toBe(true);
      expect(result.files[0].stats.additions).toBe(2);
    });

    it('should handle file deletion', () => {
      const diffText = `diff --git a/oldfile.txt b/oldfile.txt
deleted file mode 100644
index 1234567..0000000
--- a/oldfile.txt
+++ /dev/null
@@ -1,2 +0,0 @@
-first line
-second line`;

      const result = parseDiff(diffText);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].isDeletedFile).toBe(true);
      expect(result.files[0].stats.deletions).toBe(2);
    });

    it('should handle file rename', () => {
      const diffText = `diff --git a/oldname.txt b/newname.txt
similarity index 100%
rename from oldname.txt
rename to newname.txt`;

      const result = parseDiff(diffText);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].isRename).toBe(true);
      expect(result.files[0].originalPath).toBe('oldname.txt');
      expect(result.files[0].newPath).toBe('newname.txt');
    });

    it('should handle binary files', () => {
      const diffText = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;

      const result = parseDiff(diffText);

      expect(result.files).toHaveLength(1);
      expect(result.files[0].isBinary).toBe(true);
    });

    it('should detect whitespace-only changes', () => {
      const diffText = `diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,2 +1,2 @@
-  line with spaces  
+	line with spaces	
 normal line`;

      const result = parseDiff(diffText);

      const hunk = result.files[0].hunks[0];
      const deletionLine = hunk.lines.find(l => l.type === 'deletion');
      const additionLine = hunk.lines.find(l => l.type === 'addition');

      expect(deletionLine?.isWhitespaceOnly).toBe(true);
      expect(additionLine?.isWhitespaceOnly).toBe(true);
    });

    it('should handle empty diff', () => {
      const result = parseDiff('');

      expect(result.files).toHaveLength(0);
      expect(result.preamble).toHaveLength(0);
      expect(result.stats.totalFiles).toBe(0);
    });

    it('should handle malformed diff gracefully', () => {
      const diffText = `This is not a valid diff
Some random text
More random text`;

      const result = parseDiff(diffText);

      expect(result.files).toHaveLength(0);
      expect(result.preamble).toHaveLength(3);
    });
  });

  describe('reconstructDiff', () => {
    const sampleDiff = parseDiff(`diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,3 +1,3 @@
 line 1
-line 2
+line 2 modified
 line 3`);

    it('should reconstruct original diff', () => {
      const reconstructed = reconstructDiff(sampleDiff);

      expect(reconstructed).toContain('diff --git a/test.txt b/test.txt');
      expect(reconstructed).toContain('@@ -1,3 +1,3 @@');
      expect(reconstructed).toContain('-line 2');
      expect(reconstructed).toContain('+line 2 modified');
    });

    it('should filter files when reconstructing', () => {
      const reconstructed = reconstructDiff(sampleDiff, {
        includeFile: (file) => file.fileName !== 'test.txt'
      });

      expect(reconstructed).not.toContain('diff --git a/test.txt b/test.txt');
    });

    it('should hide whitespace changes when reconstructing', () => {
      const diffWithWhitespace = parseDiff(`diff --git a/test.txt b/test.txt
index 1234567..abcdefg 100644
--- a/test.txt
+++ b/test.txt
@@ -1,2 +1,2 @@
-  line with spaces  
+	line with spaces	
 normal`);

      const reconstructed = reconstructDiff(diffWithWhitespace, {
        hideWhitespaceChanges: true
      });

      expect(reconstructed).not.toContain('line with spaces');
      expect(reconstructed).toContain('normal');
    });
  });

  describe('getDiffSummary', () => {
    it('should calculate correct summary statistics', () => {
      const diffText = `diff --git a/new.txt b/new.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/new.txt
@@ -0,0 +1,1 @@
+new content
diff --git a/old.txt b/old.txt
deleted file mode 100644
index 1234567..0000000
--- a/old.txt
+++ /dev/null
@@ -1,1 +0,0 @@
-old content
diff --git a/modified.txt b/modified.txt
index 1234567..abcdefg 100644
--- a/modified.txt
+++ b/modified.txt
@@ -1,2 +1,2 @@
 keep
-change
+changed`;

      const parsed = parseDiff(diffText);
      const summary = getDiffSummary(parsed);

      expect(summary.totalFiles).toBe(3);
      expect(summary.newFiles).toBe(1);
      expect(summary.deletedFiles).toBe(1);
      expect(summary.modifiedFiles).toBe(1);
      expect(summary.totalAdditions).toBe(2);
      expect(summary.totalDeletions).toBe(2);
    });
  });

  describe('utility functions', () => {
    const mockFile = {
      id: 'test',
      fileName: 'test.txt',
      originalPath: 'old/test.txt',
      newPath: 'new/test.txt',
      isNewFile: false,
      isDeletedFile: false,
      isRename: true,
      isBinary: false,
      headerLines: [],
      hunks: [],
      stats: { additions: 0, deletions: 0, changes: 0 }
    };

    it('should get correct display name for renamed file', () => {
      const displayName = getFileDisplayName(mockFile);
      expect(displayName).toBe('old/test.txt → new/test.txt');
    });

    it('should get correct status badge', () => {
      expect(getFileStatusBadge(mockFile)).toBe('RENAMED');
      expect(getFileStatusBadge({ ...mockFile, isNewFile: true, isRename: false })).toBe('ADDED');
      expect(getFileStatusBadge({ ...mockFile, isDeletedFile: true, isRename: false })).toBe('DELETED');
    });

    it('should get correct status color', () => {
      expect(getFileStatusColor(mockFile)).toContain('text-info');
      expect(getFileStatusColor({ ...mockFile, isNewFile: true, isRename: false })).toContain('text-success');
    });
  });
});