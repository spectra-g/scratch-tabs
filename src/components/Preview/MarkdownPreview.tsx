import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  return (
    // Apply Tailwind's typography plugin classes for nice default styling.
    // 'prose-invert' is for dark mode themes.
    // Enhanced with Word Count tablet's superior table styling
    <div className="prose prose-invert max-w-none p-0.5 text-sm [&>h1]:mb-2 [&>h2]:mb-2 [&>h3]:mb-2 [&>h4]:mb-2 [&>h5]:mb-2 [&>h6]:mb-2 [&>h1]:mt-4 [&>h2]:mt-3 [&>h3]:mt-3 [&>h4]:mt-2 [&>h5]:mt-2 [&>h6]:mt-2 [&>h1]:text-gray-200 [&>h2]:text-gray-200 [&>h3]:text-gray-200 [&>h4]:text-gray-200 [&>h5]:text-gray-200 [&>h6]:text-gray-200">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Enhanced table styling from Word Count tablet
          table: ({ children }) => (
            <div className="overflow-x-auto custom-scrollbar my-4">
              <table className="w-full text-xs border-collapse border border-gray-600">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-700/50">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="border border-gray-600 px-2 py-1 text-left text-gray-300 font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-600 px-2 py-1 text-gray-300">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-800/30 transition-colors">
              {children}
            </tr>
          ),
          // Enhanced status icon rendering
          p: ({ children }) => {
            if (typeof children === 'string') {
              const processedContent = children
                .replace(/✅/g, '<span class="text-green-400">✅</span>')
                .replace(/⚠️/g, '<span class="text-yellow-400">⚠️</span>')
                .replace(/❌/g, '<span class="text-red-400">❌</span>');
              
              if (processedContent !== children) {
                return <p dangerouslySetInnerHTML={{ __html: processedContent }} />;
              }
            }
            return <p>{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
export default MarkdownPreview;
