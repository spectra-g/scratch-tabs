import React from 'react';
import { X } from '../../../components/Icons';

interface SidePanelProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const SidePanel: React.FC<SidePanelProps> = ({ title, isOpen, onClose, children }) => {
    return (
        <>
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`absolute top-4 bottom-24 right-4 w-[400px] max-w-[90vw] bg-surface border border-base rounded-2xl shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}>
                <div className="flex items-center justify-between p-4 border-b border-base bg-surface-secondary/50 rounded-t-2xl">
                    <h3 className="font-bold text-main">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-element-hover rounded-full text-secondary transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {children}
                </div>
            </div>
        </>
    );
};
