import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { useRootStore } from '../stores';
import { useSplitViewStore } from '../stores/splitViewStore';

const DragDropOverlay: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { handleNewPopulatedTab } = useRootStore();
  const { splitView } = useSplitViewStore();

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only set dragging to false if we're leaving the document
      if (e.relatedTarget === null || (e.relatedTarget as Node).nodeName === 'HTML') {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      if (!e.dataTransfer?.files.length) return;
      
      setIsUploading(true);
      
      try {
        const file = e.dataTransfer.files[0]; // Take only the first file for now
        const fileContent = await readFileAsText(file);
        
        // Get file name without extension for the tab title
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        
        // Determine if we should open in right side
        const toRightSide = splitView?.activeSide === 'right' || false;
        
        // Create and open the new tab
        handleNewPopulatedTab({
          id: crypto.randomUUID(),
          title: fileName,
          content: fileContent,
          language: 'plaintext',
          languageLocked: false,
          cursorPosition: { lineNumber: 1, column: 1 },
          dateCreated: Date.now(),
          lastModified: Date.now(),
        }, toRightSide);
      } catch (error) {
        console.error('Error reading dropped file:', error);
        // Could add error notification here
      } finally {
        setIsUploading(false);
      }
    };

    // Helper function to read file content
    const readFileAsText = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
      });
    };

    // Add event listeners to the document
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    // Clean up
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [handleNewPopulatedTab, splitView?.activeSide]);

  if (!isDragging && !isUploading) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-gray-800 border-2 border-dashed border-blue-500 rounded-lg p-8 max-w-md w-full text-center">
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-200 text-lg font-medium">Uploading file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload size={48} className="text-blue-400 mb-4" />
            <p className="text-gray-200 text-lg font-medium">Drop file to open</p>
            <p className="text-gray-400 mt-2">The file will be opened in a new tab</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropOverlay;