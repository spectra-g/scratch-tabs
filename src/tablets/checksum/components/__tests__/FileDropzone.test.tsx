import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FileDropzone } from '../FileDropzone';
import { FileInfo } from '../../types';

// Mock the hashing utilities
jest.mock('../../utils/hashing', () => ({
  formatFileSize: jest.fn().mockImplementation((size) => `${size} bytes`),
}));

describe('FileDropzone', () => {
  const mockOnFileSelected = jest.fn();
  const mockFileInfo: FileInfo = {
    name: 'test-file.txt',
    size: 1024,
    type: 'text/plain',
    lastModified: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the dropzone interface', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      expect(screen.getByText('Drop file or click to select')).toBeInTheDocument();
      expect(screen.getByText('All processing happens locally in your browser')).toBeInTheDocument();
    });

    it('should show processing state when processing', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={true}
          currentFile={mockFileInfo}
        />
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we calculate checksums')).toBeInTheDocument();
    });

    it('should display current file info when provided', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={mockFileInfo}
        />
      );

      expect(screen.getByText('test-file.txt')).toBeInTheDocument();
      expect(screen.getByText('1024 bytes')).toBeInTheDocument();
      expect(screen.getByText('text/plain')).toBeInTheDocument();
    });
  });

  describe('drag and drop functionality', () => {
    it('should handle drag over events', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      const dropzone = screen.getByText('Drop file or click to select').closest('div');
      
      fireEvent.dragOver(dropzone!, {
        dataTransfer: {
          files: [new File(['test'], 'test.txt', { type: 'text/plain' })],
        },
      });

      expect(screen.getByText('Drop file here')).toBeInTheDocument();
    });

    it('should handle drag leave events', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      const dropzone = screen.getByText('Drop file or click to select').closest('div');
      
      // First drag over
      fireEvent.dragOver(dropzone!, {
        dataTransfer: {
          files: [new File(['test'], 'test.txt', { type: 'text/plain' })],
        },
      });

      expect(screen.getByText('Drop file here')).toBeInTheDocument();

      // Then drag leave
      fireEvent.dragLeave(dropzone!);

      expect(screen.getByText('Drop file or click to select')).toBeInTheDocument();
    });

    it('should handle file drop with single file', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      const testFile = new File(['test content'], 'test.txt', { 
        type: 'text/plain',
        lastModified: Date.now(),
      });

      const dropzone = screen.getByText('Drop file or click to select').closest('div');
      
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [testFile],
        },
      });

      expect(mockOnFileSelected).toHaveBeenCalledWith(
        testFile,
        expect.objectContaining({
          name: 'test.txt',
          size: testFile.size,
          type: 'text/plain',
          lastModified: testFile.lastModified,
        })
      );
    });

    it('should show error for multiple files', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      const file1 = new File(['test1'], 'test1.txt');
      const file2 = new File(['test2'], 'test2.txt');

      const dropzone = screen.getByText('Drop file or click to select').closest('div');
      
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [file1, file2],
        },
      });

      expect(screen.getByText('Please drop only one file at a time')).toBeInTheDocument();
      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });

    it('should show error for no files', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      const dropzone = screen.getByText('Drop file or click to select').closest('div');
      
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [],
        },
      });

      expect(screen.getByText('No files detected')).toBeInTheDocument();
      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });
  });

  describe('file input functionality', () => {
    it('should handle file selection via input', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      const testFile = new File(['test content'], 'test.txt', { 
        type: 'text/plain',
        lastModified: Date.now(),
      });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      fireEvent.change(fileInput, {
        target: { files: [testFile] },
      });

      expect(mockOnFileSelected).toHaveBeenCalledWith(
        testFile,
        expect.objectContaining({
          name: 'test.txt',
          type: 'text/plain',
        })
      );
    });
  });

  describe('large file handling', () => {
    it('should warn about very large files but still allow processing', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      // Create a file larger than 5GB
      const largeFile = new File([''], 'large.bin', { 
        type: 'application/octet-stream',
      });
      
      // Mock the file size
      Object.defineProperty(largeFile, 'size', {
        value: 6 * 1024 * 1024 * 1024, // 6GB
        writable: false,
      });

      const dropzone = screen.getByText('Drop file or click to select').closest('div');
      
      fireEvent.drop(dropzone!, {
        dataTransfer: {
          files: [largeFile],
        },
      });

      expect(screen.getByText(/File is very large.*Processing may take a long time/)).toBeInTheDocument();
      expect(mockOnFileSelected).toHaveBeenCalled(); // Should still process
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={false}
          currentFile={null}
        />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveAttribute('type', 'file');
    });

    it('should disable input when processing', () => {
      render(
        <FileDropzone
          onFileSelected={mockOnFileSelected}
          isProcessing={true}
          currentFile={mockFileInfo}
        />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeDisabled();
    });
  });
});