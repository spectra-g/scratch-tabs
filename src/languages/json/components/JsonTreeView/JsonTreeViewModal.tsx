import React, { Suspense } from "react";
import { X } from "lucide-react";

// --- Lazy Load JsonTreeView ---
const JsonTreeView = React.lazy(() => import("./JsonTreeView"));

interface JsonTreeViewModalProps {
  jsonString: string;
  onClose: () => void;
}

// --- Loading Fallback Component ---
const LoadingIndicator: React.FC = () => (
  <div className="flex items-center justify-center h-full text-gray-400">
    <span>Loading Tree View...</span>
  </div>
);

const JsonTreeViewModal: React.FC<JsonTreeViewModalProps> = ({
  jsonString,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-700/50">
        <div className="flex-none flex items-center justify-between p-3 border-b border-gray-700/50">
          <h2 className="text-lg font-medium text-gray-100">JSON Tree View</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* --- Suspense Boundary --- */}
          <Suspense fallback={<LoadingIndicator />}>
            <JsonTreeView jsonString={jsonString} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default JsonTreeViewModal;
