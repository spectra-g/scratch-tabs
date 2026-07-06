import React from "react";

interface ImagePreviewProps {
  content: string; // data URI
  fileName: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ content, fileName }) => (
  <div
    className="flex-1 min-h-0 flex items-center justify-center overflow-auto custom-scrollbar p-4"
    style={{
      backgroundImage:
        "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 0 0 / 16px 16px",
      backgroundSize: "20px 20px",
    }}
  >
    <img
      src={content}
      alt={fileName}
      className="max-w-full max-h-full object-contain shadow-lg"
    />
  </div>
);
