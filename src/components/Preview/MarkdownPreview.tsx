import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // Example: GitHub Flavored Markdown

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({content}) => {
  return (
    // Apply Tailwind's typography plugin classes for nice default styling.
    // 'prose-invert' is for dark mode themes.
    <div className="prose prose-invert max-w-none p-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
