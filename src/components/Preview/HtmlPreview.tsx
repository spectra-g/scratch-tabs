import React, { useRef, useEffect } from 'react';

interface HtmlPreviewProps {
  content: string;
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ content }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && content) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      
      if (iframeDoc) {
        // Clear existing content
        iframeDoc.open();
        
        // Write the HTML content
        iframeDoc.write(content);
        iframeDoc.close();
      }
    }
  }, [content]);

  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>No HTML content to preview</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        title="HTML Preview"
      />
    </div>
  );
};

export default HtmlPreview; 