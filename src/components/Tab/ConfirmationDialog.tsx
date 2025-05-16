import React from 'react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    message: string;
    confirmButtonText?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    message,
    confirmButtonText = 'Confirm'
}) => {

    console.log('[ConfirmationDialog] Component RENDERED. isOpen:', isOpen, 'Message:', message); // <<< ADD THIS

    if (!isOpen) return null;

    const handleModalContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleConfirmClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onConfirm();
    };

    const handleCancelClick = (e: React.MouseEvent) => {
        e.stopPropagation(); 
        onCancel();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
            onClick={onCancel}
        >
            <div 
                className="bg-gray-850 p-4 rounded-lg shadow-2xl max-w-md w-full border border-gray-700/50"
                onClick={handleModalContentClick} 
            >
                <p className="text-white mb-6 font-medium">{message}</p>
                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={handleCancelClick}
                        className="px-3 py-1.5 text-sm text-blue-500 bg-transparent hover:bg-blue-500/10 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmClick}
                        className="px-3 py-1.5 text-sm bg-gray-850 hover:bg-gray-700 rounded-md transition-colors text-gray-200" 
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};