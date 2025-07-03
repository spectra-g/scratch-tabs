import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({content}) => {
  return (
    // Apply Tailwind's typography plugin classes for nice default styling.
    // 'prose-invert' is for dark mode themes.
    // Added text-sm for smaller font size and custom header spacing for tighter layout
    <div className="prose prose-invert max-w-none p-0.5 text-sm [&>h1]:mb-2 [&>h2]:mb-2 [&>h3]:mb-2 [&>h4]:mb-2 [&>h5]:mb-2 [&>h6]:mb-2 [&>h1]:mt-4 [&>h2]:mt-3 [&>h3]:mt-3 [&>h4]:mt-2 [&>h5]:mt-2 [&>h6]:mt-2 [&>h1]:text-gray-200 [&>h2]:text-gray-200 [&>h3]:text-gray-200 [&>h4]:text-gray-200 [&>h5]:text-gray-200 [&>h6]:text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
export default MarkdownPreview;