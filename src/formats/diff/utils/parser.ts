/**
 * Robust diff parser for handling unified diff format
 * Supports multi-file diffs, git format, and various diff styles
 */

export type LineType = 'context' | 'addition' | 'deletion';

export interface DiffLine {
  type: LineType;
  content: string;
  originalLineNumber?: number;
  newLineNumber?: number;
  isWhitespaceOnly?: boolean; // For whitespace filtering
}

export interface Hunk {
  id: string; // Unique identifier for React keys
  header: string; // The "@@ -1,3 +1,4 @@" part
  lines: DiffLine[];
  originalStartLine: number;
  originalLineCount: number;
  newStartLine: number;
  newLineCount: number;
  isCollapsed?: boolean; // For UI state
}

export interface FileDiff {
  id: string; // Unique identifier for React keys
  fileName: string;
  isNewFile: boolean;
  isDeletedFile: boolean;
  isRename: boolean;
  isBinary: boolean;
  originalPath: string;
  newPath: string;
  headerLines: string[]; // e.g., "index ...", "--- a/...", "+++ b/..."
  hunks: Hunk[];
  stats: {
    additions: number;
    deletions: number;
    changes: number;
  };
}

export interface ParsedDiff {
  files: FileDiff[];
  preamble: string[]; // Any text before the first "diff --git"
  stats: {
    totalFiles: number;
    totalAdditions: number;
    totalDeletions: number;
  };
}

/**
 * Parse a unified diff string into structured data
 */
export function parseDiff(text: string): ParsedDiff {
  if (!text || !text.trim()) {
    return {
      files: [],
      preamble: [],
      stats: { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 }
    };
  }

  const lines = text.split('\n');
  const files: FileDiff[] = [];
  const preamble: string[] = [];
  let currentFileIndex = -1;
  let currentHunkIndex = -1;
  let inPreamble = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for git diff header
    const gitDiffMatch = line.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (gitDiffMatch) {
      inPreamble = false;
      currentFileIndex++;
      currentHunkIndex = -1;

      const [, originalPath, newPath] = gitDiffMatch;
      
      files.push({
        id: `file-${currentFileIndex}`,
        fileName: newPath,
        isNewFile: false,
        isDeletedFile: false,
        isRename: originalPath !== newPath,
        isBinary: false,
        originalPath,
        newPath,
        headerLines: [line],
        hunks: [],
        stats: { additions: 0, deletions: 0, changes: 0 }
      });
      continue;
    }

    // If we're still in preamble, collect lines
    if (inPreamble) {
      preamble.push(line);
      continue;
    }

    // If no current file, skip
    if (currentFileIndex === -1) continue;

    const currentFile = files[currentFileIndex];

    // Check for file status indicators
    if (line.startsWith('new file mode')) {
      currentFile.isNewFile = true;
      currentFile.headerLines.push(line);
      continue;
    }

    if (line.startsWith('deleted file mode')) {
      currentFile.isDeletedFile = true;
      currentFile.headerLines.push(line);
      continue;
    }

    if (line.startsWith('Binary files')) {
      currentFile.isBinary = true;
      currentFile.headerLines.push(line);
      continue;
    }

    // Check for index, ---, +++ lines
    if (line.startsWith('index ') || 
        line.startsWith('--- ') || 
        line.startsWith('+++ ')) {
      currentFile.headerLines.push(line);
      continue;
    }

    // Check for hunk header
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch) {
      currentHunkIndex++;
      const [, origStart, origCount, newStart, newCount, context] = hunkMatch;
      
      currentFile.hunks.push({
        id: `hunk-${currentFileIndex}-${currentHunkIndex}`,
        header: line,
        lines: [],
        originalStartLine: parseInt(origStart, 10),
        originalLineCount: parseInt(origCount || '1', 10),
        newStartLine: parseInt(newStart, 10),
        newLineCount: parseInt(newCount || '1', 10),
        isCollapsed: false
      });
      continue;
    }

    // Parse diff lines within hunks
    if (currentHunkIndex >= 0) {
      const currentHunk = currentFile.hunks[currentHunkIndex];
      let lineType: LineType = 'context';
      let content = line;

      if (line.startsWith('+')) {
        lineType = 'addition';
        content = line.substring(1);
        currentFile.stats.additions++;
      } else if (line.startsWith('-')) {
        lineType = 'deletion';
        content = line.substring(1);
        currentFile.stats.deletions++;
      } else if (line.startsWith(' ')) {
        lineType = 'context';
        content = line.substring(1);
      } else if (line.startsWith('\\')) {
        // Handle "\ No newline at end of file"
        lineType = 'context';
        content = line;
      }

      // Calculate line numbers
      const linesBeforeThis = currentHunk.lines.length;
      const contextAndDeletions = currentHunk.lines.filter(l => 
        l.type === 'context' || l.type === 'deletion'
      ).length;
      const contextAndAdditions = currentHunk.lines.filter(l => 
        l.type === 'context' || l.type === 'addition'
      ).length;

      let originalLineNumber: number | undefined;
      let newLineNumber: number | undefined;

      if (lineType === 'deletion' || lineType === 'context') {
        originalLineNumber = currentHunk.originalStartLine + contextAndDeletions;
      }
      if (lineType === 'addition' || lineType === 'context') {
        newLineNumber = currentHunk.newStartLine + contextAndAdditions;
      }

      // Check if this is a whitespace-only change
      const isWhitespaceOnly = lineType !== 'context' && 
        content.trim() === currentHunk.lines
          .filter(l => l.type !== lineType && l.content.trim() === content.trim())
          .map(l => l.content)[0]?.trim();

      currentHunk.lines.push({
        type: lineType,
        content,
        originalLineNumber,
        newLineNumber,
        isWhitespaceOnly: isWhitespaceOnly || false
      });

      if (lineType !== 'context') {
        currentFile.stats.changes++;
      }
    }
  }

  // Calculate total stats
  const totalStats = files.reduce(
    (acc, file) => ({
      totalFiles: acc.totalFiles + 1,
      totalAdditions: acc.totalAdditions + file.stats.additions,
      totalDeletions: acc.totalDeletions + file.stats.deletions
    }),
    { totalFiles: 0, totalAdditions: 0, totalDeletions: 0 }
  );

  return {
    files,
    preamble,
    stats: totalStats
  };
}

/**
 * Reconstruct diff text from parsed data
 * Useful for copying filtered/modified diffs
 */
export function reconstructDiff(
  parsedDiff: ParsedDiff,
  options: {
    includeFile?: (file: FileDiff) => boolean;
    includeHunk?: (hunk: Hunk) => boolean;
    hideWhitespaceChanges?: boolean;
  } = {}
): string {
  const { includeFile = () => true, includeHunk = () => true, hideWhitespaceChanges = false } = options;
  
  const lines: string[] = [];
  
  // Add preamble
  lines.push(...parsedDiff.preamble);
  
  // Add files
  parsedDiff.files.forEach(file => {
    if (!includeFile(file)) return;
    
    // Add git diff header
    lines.push(`diff --git a/${file.originalPath} b/${file.newPath}`);
    
    // Add file headers
    lines.push(...file.headerLines);
    
    // Add hunks
    file.hunks.forEach(hunk => {
      if (!includeHunk(hunk)) return;
      
      lines.push(hunk.header);
      
      hunk.lines.forEach(diffLine => {
        // Skip whitespace-only changes if option is enabled
        if (hideWhitespaceChanges && diffLine.isWhitespaceOnly) {
          return;
        }
        
        let prefix = ' ';
        if (diffLine.type === 'addition') prefix = '+';
        else if (diffLine.type === 'deletion') prefix = '-';
        
        lines.push(prefix + diffLine.content);
      });
    });
  });
  
  return lines.join('\n');
}

/**
 * Get summary statistics for a parsed diff
 */
export function getDiffSummary(parsedDiff: ParsedDiff): {
  totalFiles: number;
  newFiles: number;
  deletedFiles: number;
  modifiedFiles: number;
  renamedFiles: number;
  binaryFiles: number;
  totalAdditions: number;
  totalDeletions: number;
} {
  const summary = {
    totalFiles: parsedDiff.files.length,
    newFiles: 0,
    deletedFiles: 0,
    modifiedFiles: 0,
    renamedFiles: 0,
    binaryFiles: 0,
    totalAdditions: parsedDiff.stats.totalAdditions,
    totalDeletions: parsedDiff.stats.totalDeletions
  };

  parsedDiff.files.forEach(file => {
    if (file.isNewFile) summary.newFiles++;
    else if (file.isDeletedFile) summary.deletedFiles++;
    else if (file.isRename) summary.renamedFiles++;
    else summary.modifiedFiles++;
    
    if (file.isBinary) summary.binaryFiles++;
  });

  return summary;
}

/**
 * Filter diff lines based on whitespace changes
 */
export function filterWhitespaceChanges(lines: DiffLine[]): DiffLine[] {
  return lines.filter(line => !line.isWhitespaceOnly);
}

/**
 * Get the display name for a file based on its status
 */
export function getFileDisplayName(file: FileDiff): string {
  if (file.isRename) {
    return `${file.originalPath} → ${file.newPath}`;
  }
  return file.fileName;
}

/**
 * Get the status badge text for a file
 */
export function getFileStatusBadge(file: FileDiff): string {
  if (file.isNewFile) return 'ADDED';
  if (file.isDeletedFile) return 'DELETED';
  if (file.isRename) return 'RENAMED';
  if (file.isBinary) return 'BINARY';
  return 'MODIFIED';
}

/**
 * Get the status color for a file
 */
export function getFileStatusColor(file: FileDiff): string {
  if (file.isNewFile) return 'text-green-400 bg-green-500/20';
  if (file.isDeletedFile) return 'text-red-400 bg-red-500/20';
  if (file.isRename) return 'text-blue-400 bg-blue-500/20';
  if (file.isBinary) return 'text-purple-400 bg-purple-500/20';
  return 'text-yellow-400 bg-yellow-500/20';
}