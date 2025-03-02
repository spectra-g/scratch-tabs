export const registerMarkdownProvider = (monaco: any) => {
  // Configure Markdown formatting provider
  monaco.languages.registerDocumentFormattingEditProvider('markdown', {
    provideDocumentFormattingEdits(model: any) {
      const content = model.getValue();
      const lines = content.split('\n');
      
      const formattedLines = lines.map((line: string) => {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) return '';

        // Format headings (ensure space after #)
        if (trimmedLine.startsWith('#')) {
          const match = trimmedLine.match(/^(#+)(.*)$/);
          if (match) {
            return `${match[1]} ${match[2].trim()}`;
          }
        }

        // Format list items (ensure space after - * >)
        if (trimmedLine.match(/^[-*>]/)) {
          const match = trimmedLine.match(/^([-*>])(.*)$/);
          if (match) {
            return `${match[1]} ${match[2].trim()}`;
          }
        }

        // Format task lists
        if (trimmedLine.match(/^- \[[ x]\]/i)) {
          const match = trimmedLine.match(/^(- \[[ x]\])(.*)$/i);
          if (match) {
            return `${match[1]} ${match[2].trim()}`;
          }
        }

        return trimmedLine;
      });

      return [{
        range: model.getFullModelRange(),
        text: formattedLines.join('\n\n')
      }];
    }
  });
};