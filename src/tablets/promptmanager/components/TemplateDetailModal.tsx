import React from "react";
import { X } from "lucide-react";
import { Template } from "../types";
import { MarkdownPreview } from "./MarkdownPreview";

interface TemplateDetailModalProps {
  template: Template;
  onClose: () => void;
}

export const TemplateDetailModal: React.FC<TemplateDetailModalProps> = ({
  template,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">{template.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {template.description && (
            <p className="text-lg text-gray-300 mb-6 italic">
              {template.description}
            </p>
          )}
          <MarkdownPreview content={template.content} />
        </div>
      </div>
    </div>
  );
};
