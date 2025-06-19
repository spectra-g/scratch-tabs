import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileUp } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { handleFileDrop } from '../utils/base64Utils';

interface Base64InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error: string | null;
  mode: 'encode' | 'decode' | 'line-by-line';
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
}

export const Base64Input: React.FC<Base64InputProps> = ({
  value,
  onChange,
  placeholder,
  error,
  mode,
  isDragging,
  setIsDragging
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        try {
          const fileContent = await handleFileDrop(acceptedFiles[0]);
          onChange(fileContent);
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
      setIsDragging(false);
    },
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    noClick: true,
    noKeyboard: true
  });

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div 
      {...getRootProps()} 
      className={`relative flex-1 min-h-[200px] ${isDragActive ? 'bg-blue-500/10 border-blue-500/50' : ''}`}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        placeholder={placeholder}
        className={`w-full h-full min-h-[200px] bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition-colors resize-none font-mono ${
          error ? 'border-red-500/50 focus:border-red-500' : 'focus:border-blue-500/50'
        } ${isFocused ? 'border-blue-500/50' : ''}`}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        spellCheck={false}
      />
      <input {...getInputProps()} />
      
      {/* Drag overlay */}
      {isDragActive && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10"
        >
          <div className="text-center">
            <FileUp size={48} className="mx-auto mb-2 text-blue-400" />
            <p className="text-gray-200 text-lg font-medium">Drop file to {mode === 'decode' ? 'decode' : 'encode'}</p>
            <p className="text-gray-400 text-sm mt-1">The file content will replace the current input</p>
          </div>
        </motion.div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute bottom-3 right-3 left-3 bg-red-900/80 text-red-200 text-xs p-2 rounded">
          {error}
        </div>
      )}
      
      {/* Upload hint */}
      {!isDragActive && !value && (
        <div className="absolute bottom-3 right-3 text-gray-500 text-xs flex items-center">
          <Upload size={12} className="mr-1" />
          <span>Drag & drop a file</span>
        </div>
      )}
    </div>
  );
};