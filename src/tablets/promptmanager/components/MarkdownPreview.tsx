import React from 'react';

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  // For now, we'll use a simple implementation
  // In a real app, you'd use a library like react-markdown
  
  // Convert markdown to HTML (very basic implementation)
  const renderMarkdown = (markdown: string) => {
    if (!markdown) {
      return <div className="text-gray-500 italic p-4">No content to preview</div>;
    }
    
    // Process the markdown
    let html = markdown;
    
    // Headers
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Lists
    html = html.replace(/^\s*\*\s+(.*$)/gm, '<li>$1</li>');
    html = html.replace(/^\s*-\s+(.*$)/gm, '<li>$1</li>');
    html = html.replace(/^\s*\d+\.\s+(.*$)/gm, '<li>$1</li>');
    
    // Wrap lists in ul/ol (simplified)
    html = html.replace(/<li>.*?<\/li>/g, match => {
      return `<ul>${match}</ul>`;
    });
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Blockquotes
    html = html.replace(/^\s*>\s+(.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Horizontal rule
    html = html.replace(/^\s*---\s*$/gm, '<hr />');
    
    // Paragraphs (simplified)
    html = html.replace(/^([^<].*?)$/gm, '<p>$1</p>');
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    
    return (
      <div 
        className="prose prose-invert max-w-none p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };
  
  return (
    <div className="h-full bg-gray-800/30">
      {renderMarkdown(content)}
    </div>
  );
};