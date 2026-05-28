import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const OpenApiMarkdown: React.FC<{ children: string }> = ({ children }) => (
  <div className="prose prose-sm max-w-none text-secondary prose-p:my-1 prose-code:text-main prose-a:text-primary">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
  </div>
);
