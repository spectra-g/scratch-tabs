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
  <div className="flex items-center justify-center h-full text-secondary">
    <span>Loading Tree View...</span>
  </div>
);

const JsonTreeViewModal: React.FC<JsonTreeViewModalProps> = ({
  jsonString,
  onClose,
}) => {
  // Use a stable ID for the modal's tree view state
  const modalTabId = React.useMemo(() => 'json-tree-view-modal', []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-base">
        <div className="flex-none flex items-center justify-between p-3 border-b border-base">
          <h2 className="text-lg font-medium text-main">JSON Tree View</h2>
          <button
            onClick={onClose}
            className="p-1 text-secondary hover:text-main hover:bg-element-hover rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {/* --- Suspense Boundary --- */}
          <Suspense fallback={<LoadingIndicator />}>
            <JsonTreeView jsonString={jsonString} tabId={modalTabId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default JsonTreeViewModal;
