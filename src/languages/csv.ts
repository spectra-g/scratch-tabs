export const registerCsvProvider = (monaco: any) => {
  // Register CSV language if not already registered
  if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'csv')) {
    monaco.languages.register({ id: 'csv' });
  }

  // Configure CSV formatting provider
  monaco.languages.registerDocumentFormattingEditProvider('csv', {
    provideDocumentFormattingEdits(model: any) {
      const content = model.getValue();
      const lines = content.split('\n');
      
      // Format CSV by aligning columns
      const formattedLines = formatCsvColumns(lines);

      return [{
        range: model.getFullModelRange(),
        text: formattedLines.join('\n')
      }];
    }
  });
};

// Helper function to format CSV by aligning columns
function formatCsvColumns(lines: string[]): string[] {
  if (lines.length === 0) return lines;
  
  // Determine the delimiter (comma, semicolon, or tab)
  const firstLine = lines[0];
  let delimiter = ',';
  
  if (firstLine.includes(';') && !firstLine.includes(',')) {
    delimiter = ';';
  } else if (firstLine.includes('\t') && !firstLine.includes(',')) {
    delimiter = '\t';
  }
  
  // Parse all lines into cells
  const rows = lines.map(line => {
    // Handle quoted fields correctly
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
        currentCell += char;
      } else if (char === delimiter && !inQuotes) {
        // End of cell
        cells.push(currentCell);
        currentCell = '';
      } else {
        // Add character to current cell
        currentCell += char;
      }
    }
    
    // Add the last cell
    cells.push(currentCell);
    return cells;
  });
  
  // Find the maximum width for each column
  const columnWidths: number[] = [];
  
  rows.forEach(row => {
    row.forEach((cell, columnIndex) => {
      // Remove quotes for width calculation
      const cellContent = cell.replace(/^"(.*)"$/, '$1');
      const cellWidth = cellContent.length;
      
      if (!columnWidths[columnIndex] || cellWidth > columnWidths[columnIndex]) {
        columnWidths[columnIndex] = cellWidth;
      }
    });
  });
  
  // Format each row with proper padding
  return rows.map(row => {
    return row.map((cell, columnIndex) => {
      // Don't pad the last column
      if (columnIndex === row.length - 1) {
        return cell;
      }
      
      // If cell is quoted, pad the content inside quotes
      if (cell.startsWith('"') && cell.endsWith('"')) {
        const content = cell.substring(1, cell.length - 1);
        const paddedContent = content.padEnd(columnWidths[columnIndex], ' ');
        return `"${paddedContent}"`;
      }
      
      // Otherwise pad the whole cell
      return cell.padEnd(columnWidths[columnIndex], ' ');
    }).join(delimiter);
  });
}