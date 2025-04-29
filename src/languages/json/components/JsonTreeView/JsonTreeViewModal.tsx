import React from 'react';
import { X } from 'lucide-react';
import JsonTreeView from './JsonTreeView';

interface JsonTreeViewModalProps {
    jsonString: string;
    onClose: () => void;
}

const JsonTreeViewModal: React.FC<JsonTreeViewModalProps> = ({ jsonString, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"> {/* Added padding for smaller screens */}
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-700/50"> {/* Dark bg, flex column, max height, overflow hidden */}
                <div className="flex-none flex items-center justify-between p-3 border-b border-gray-700/50"> {/* Reduced padding, flex-none */}
                    <h2 className="text-lg font-medium text-gray-100">JSON Tree View</h2> {/* Adjusted text color */}
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-100 hover:bg-gray-700/50 rounded-full transition-colors" // Added hover bg, rounded
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1">
                    <JsonTreeView jsonString={jsonString} onClose={onClose} />
                </div>

            </div>
        </div>
    );
};

export default JsonTreeViewModal;