export const registerYamlProvider = (monaco: any) => {
  // Register YAML language if not already registered
  if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'yaml')) {
    monaco.languages.register({ id: 'yaml' });
  }

  // Configure YAML formatting provider
  monaco.languages.registerDocumentFormattingEditProvider('yaml', {
    provideDocumentFormattingEdits(model: any) {
      const content = model.getValue();
      const lines = content.split('\n');
      let indentLevel = 0;
      const formattedLines = lines.map((line: string) => {
        const trimmedLine = line.trim();
        
        // Decrease indent for closing indicators
        if (trimmedLine.startsWith(']') || trimmedLine.startsWith('}')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        // Calculate the current line's indentation
        const indent = '  '.repeat(indentLevel);
        
        // Increase indent after opening indicators
        if (trimmedLine.endsWith(':') || trimmedLine.endsWith('[') || trimmedLine.endsWith('{')) {
          indentLevel++;
        }

        // Skip empty lines
        if (!trimmedLine) return '';
        
        return indent + trimmedLine;
      });

      return [{
        range: model.getFullModelRange(),
        text: formattedLines.join('\n')
      }];
    }
  });
};