import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { calculateLineNumbers } from "../syncUtils";

interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  // Calculate line numbers for sync
  const lineNumbers = useMemo(() => calculateLineNumbers(content), [content]);

  // Counter for elements as they're rendered
  const elementCounterRef = React.useRef(0);

  // Reset counter when content changes
  React.useEffect(() => {
    elementCounterRef.current = 0;
  }, [content]);

  return (
    // Apply Tailwind's typography plugin classes for nice default styling.
    // 'prose-invert' is for dark mode themes.
    // Enhanced with Word Count tablet's superior table styling
    // Remove default backticks from inline code
    <div className="prose dark:prose-invert max-w-none p-0.5 text-sm [&>h1]:mb-2 [&>h2]:mb-2 [&>h3]:mb-2 [&>h4]:mb-2 [&>h5]:mb-2 [&>h6]:mb-2 [&>h1]:mt-4 [&>h2]:mt-3 [&>h3]:mt-3 [&>h4]:mt-2 [&>h5]:mt-2 [&>h6]:mt-2 [&_code]:before:content-none [&_code]:after:content-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Enhanced table styling from Word Count tablet
          table: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return (
              <div className="overflow-x-auto custom-scrollbar my-4" data-source-line={lineNum}>
                <table className="w-full text-xs border-collapse border border-base">
                  {children}
                </table>
              </div>
            );
          },
          thead: ({ children }) => (
            <thead className="bg-surface/50">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="border border-base px-2 py-1 text-left text-main font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-base px-2 py-1 text-main">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-element-hover transition-colors">
              {children}
            </tr>
          ),
          // Headers with line numbers
          h1: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <h1 data-source-line={lineNum}>{children}</h1>;
          },
          h2: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <h2 data-source-line={lineNum}>{children}</h2>;
          },
          h3: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <h3 data-source-line={lineNum}>{children}</h3>;
          },
          h4: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <h4 data-source-line={lineNum}>{children}</h4>;
          },
          h5: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <h5 data-source-line={lineNum}>{children}</h5>;
          },
          h6: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <h6 data-source-line={lineNum}>{children}</h6>;
          },
          // Code blocks
          pre: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <pre data-source-line={lineNum}>{children}</pre>;
          },
          // Blockquotes
          blockquote: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <blockquote data-source-line={lineNum}>{children}</blockquote>;
          },
          // Horizontal rules
          hr: () => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <hr data-source-line={lineNum} />;
          },
          // List items
          li: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            return <li data-source-line={lineNum}>{children}</li>;
          },
          // Inline code and code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);

            if (inline) {
              // Inline code - render without backticks
              return (
                <code
                  className="px-1.5 py-0.5 bg-element text-info rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // Code block
            return (
              <code className={className} data-source-line={lineNum} {...props}>
                {children}
              </code>
            );
          },
          // Enhanced status icon rendering
          p: ({ children }) => {
            const lineNum = lineNumbers.get(elementCounterRef.current++);
            if (typeof children === 'string') {
              const processedContent = children
                .replace(/✅/g, '<span class="text-success">✅</span>')
                .replace(/⚠️/g, '<span class="text-warning">⚠️</span>')
                .replace(/❌/g, '<span class="text-danger">❌</span>');

              if (processedContent !== children) {
                return <p data-source-line={lineNum} dangerouslySetInnerHTML={{ __html: processedContent }} />;
              }
            }
            return <p data-source-line={lineNum}>{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
export default MarkdownPreview;
