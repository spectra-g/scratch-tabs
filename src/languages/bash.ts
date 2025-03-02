export const registerBashProvider = (monaco: any) => {
  // Register Bash language if not already registered
  if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'shell')) {
    monaco.languages.register({ id: 'shell' });
  }

  // Configure Bash formatting provider
  monaco.languages.registerDocumentFormattingEditProvider('shell', {
    provideDocumentFormattingEdits(model: any) {
      const content = model.getValue();
      const lines = content.split('\n');
      
      // Track indentation level
      let indentLevel = 0;
      const indentSize = 2;
      
      const formattedLines = lines.map((line: string, index: number) => {
        const trimmedLine = line.trim();
        
        // Skip empty lines (but preserve them)
        if (!trimmedLine) {
          return '';
        }
        
        // Handle comments with current indentation
        if (trimmedLine.startsWith('#')) {
          return ' '.repeat(indentLevel * indentSize) + trimmedLine;
        }
        
        // Check for closing keywords that should decrease indent
        if (/^(fi|done|esac|\}|\))/.test(trimmedLine)) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        
        // Apply current indentation
        let formattedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine;
        
        // Check for function declarations with opening brace
        // This handles both "function name() {" and "name() {" formats
        if (/^(function\s+)?\w+\s*\(\)\s*\{/.test(trimmedLine)) {
          indentLevel++;
        }
        // Check for function declarations without opening brace
        // This handles both "function name()" and "name()" formats
        else if (/^(function\s+)?\w+\s*\(\)\s*$/.test(trimmedLine)) {
          indentLevel++;
        }
        // Check for opening keywords that should increase indent for the next line
        else if (/\b(then|do|else|elif|case|in)\s*$/.test(trimmedLine) || 
            /\{\s*$/.test(trimmedLine) ||
            trimmedLine.endsWith('(') ||
            /\bfor\s+.*\s+in\s+.*;\s*do$/.test(trimmedLine) ||
            /\bwhile\s+.*;\s*do$/.test(trimmedLine)) {
          indentLevel++;
        }
        
        return formattedLine;
      });

      return [{
        range: model.getFullModelRange(),
        text: formattedLines.join('\n')
      }];
    }
  });

  // Add command for formatting shell scripts
  monaco.editor.registerCommand('shell.format', (accessor: any) => {
    const editor = accessor.get(monaco.editor.ICodeEditorService).getFocusedCodeEditor();
    if (editor) {
      editor.getAction('editor.action.formatDocument').run();
    }
  });
};