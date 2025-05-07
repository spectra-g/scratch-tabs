import React from 'react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    message: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    message
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-850 p-4 rounded-lg shadow-2xl max-w-md w-full border border-gray-700/50">
                <p className="text-white mb-6 font-medium">{message}</p>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm text-blue-500 bg-transparent hover:bg-blue-500/10 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-3 py-1.5 text-sm bg-gray-850 hover:bg-gray-700 rounded-md transition-colors text-gray-200"
                    >
                        Close Tab
                    </button>
                </div>
            </div>
        </div>
    );
}; 