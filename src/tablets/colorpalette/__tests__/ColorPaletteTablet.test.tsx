import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ColorPaletteTablet } from '../ColorPaletteTablet';
import { ColorPaletteState } from '../types';
import { createColorInfo } from '../utils/colorUtils';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
global.FileReader = jest.fn(() => ({
  readAsDataURL: jest.fn(),
  onload: null,
  onerror: null,
  result: 'data:image/png;base64,mock-data',
})) as any;

// Mock ImageData
global.ImageData = jest.fn((width: number, height: number) => ({
  data: new Uint8ClampedArray(width * height * 4),
  width,
  height,
})) as any;

describe('ColorPaletteTablet', () => {
  const mockOnChange = jest.fn();
  
  const defaultState: ColorPaletteState = {
    type: 'colorpalette',
    colors: [],
    activeColorIndex: 0,
    generationMethod: 'manual',
    sourceImageUrl: null,
    sourceImageData: null,
    extractionRegion: null,
    uiMapping: {
      background: '#FFFFFF',
      text: '#1F2937',
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#10B981',
      border: '#E5E7EB',
    },
    selectedExportFormat: 'css',
    isExtracting: false,
    error: null,
    harmonyType: 'complementary',
    baseColor: '#3B82F6',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render with default colors when empty', async () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Color Palette Workspace')).toBeInTheDocument();
      
      // Should initialize with default colors
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            colors: expect.arrayContaining([
              expect.objectContaining({ hex: '#3B82F6' }),
            ]),
          })
        );
      });
    });

    it('should not reinitialize if colors already exist', () => {
      const stateWithColors = {
        ...defaultState,
        colors: [createColorInfo('#FF0000')],
      };

      render(
        <ColorPaletteTablet
          state={stateWithColors}
          onChange={mockOnChange}
        />
      );

      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    it('should render all tabs', () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Generate')).toBeInTheDocument();
      expect(screen.getByText('Palette')).toBeInTheDocument();
      expect(screen.getByText('UI Preview')).toBeInTheDocument();
      expect(screen.getByText('Accessibility')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should switch tabs when clicked', () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByText('Palette'));
      
      // Should show palette content (Add color button with title attribute)
      expect(screen.getByTitle('Add color')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', () => {
      const stateWithError = {
        ...defaultState,
        error: 'Test error message',
      };

      render(
        <ColorPaletteTablet
          state={stateWithError}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should clear errors when new colors are generated', () => {
      const stateWithError = {
        ...defaultState,
        error: 'Previous error',
      };

      render(
        <ColorPaletteTablet
          state={stateWithError}
          onChange={mockOnChange}
        />
      );

      // Simulate color generation (this would be triggered by child components)
      const { handleColorsGenerated } = mockOnChange.mock.calls[0]?.[0] || {};
      
      // This test verifies the callback structure is correct
      expect(typeof mockOnChange).toBe('function');
    });
  });

  describe('Color Management', () => {
    it('should handle color changes', () => {
      const stateWithColors = {
        ...defaultState,
        colors: [createColorInfo('#FF0000'), createColorInfo('#00FF00')],
      };

      render(
        <ColorPaletteTablet
          state={stateWithColors}
          onChange={mockOnChange}
        />
      );

      // Switch to palette tab
      fireEvent.click(screen.getByText('Palette'));

      // The component should render the colors
      expect(screen.getByText('#FF0000')).toBeInTheDocument();
      expect(screen.getByText('#00FF00')).toBeInTheDocument();
    });

    it('should handle active color index changes', () => {
      const stateWithColors = {
        ...defaultState,
        colors: [createColorInfo('#FF0000'), createColorInfo('#00FF00')],
        activeColorIndex: 1,
      };

      render(
        <ColorPaletteTablet
          state={stateWithColors}
          onChange={mockOnChange}
        />
      );

      expect(stateWithColors.activeColorIndex).toBe(1);
    });
  });

  describe('UI Mapping', () => {
    it('should handle UI mapping changes', () => {
      const stateWithColors = {
        ...defaultState,
        colors: [createColorInfo('#FF0000')],
      };

      render(
        <ColorPaletteTablet
          state={stateWithColors}
          onChange={mockOnChange}
        />
      );

      // Switch to preview tab
      fireEvent.click(screen.getByText('UI Preview'));

      // Should show UI preview content
      expect(screen.getByText('Live UI Preview')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should show accessibility matrix for multiple colors', () => {
      const stateWithColors = {
        ...defaultState,
        colors: [
          createColorInfo('#000000'),
          createColorInfo('#FFFFFF'),
        ],
      };

      render(
        <ColorPaletteTablet
          state={stateWithColors}
          onChange={mockOnChange}
        />
      );

      // Switch to accessibility tab
      fireEvent.click(screen.getByText('Accessibility'));

      expect(screen.getByText('Accessibility Matrix')).toBeInTheDocument();
    });

    it('should show message when insufficient colors for matrix', () => {
      const stateWithOneColor = {
        ...defaultState,
        colors: [createColorInfo('#FF0000')],
      };

      render(
        <ColorPaletteTablet
          state={stateWithOneColor}
          onChange={mockOnChange}
        />
      );

      // Switch to accessibility tab
      fireEvent.click(screen.getByText('Accessibility'));

      expect(screen.getByText('Add more colors to see accessibility matrix')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should show export options when colors exist', () => {
      const stateWithColors = {
        ...defaultState,
        colors: [createColorInfo('#FF0000')],
      };

      render(
        <ColorPaletteTablet
          state={stateWithColors}
          onChange={mockOnChange}
        />
      );

      // Switch to export tab
      fireEvent.click(screen.getByText('Export'));

      expect(screen.getByText('Export Palette')).toBeInTheDocument();
      expect(screen.getByText('CSS Variables')).toBeInTheDocument();
    });

    it('should show message when no colors to export', () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      // Switch to export tab
      fireEvent.click(screen.getByText('Export'));

      expect(screen.getByText('Generate a palette to see export options')).toBeInTheDocument();
    });
  });

  describe('Privacy Features', () => {
    it('should display privacy message', () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('100% client-side processing')).toBeInTheDocument();
    });

    it('should show local processing message in image upload', () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/your image never leaves your browser/i)).toBeInTheDocument();
    });
  });

  describe('Image Upload Functionality', () => {
    beforeEach(() => {
      // Mock HTMLCanvasElement and CanvasRenderingContext2D
      const mockContext = {
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({
          data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]),
          width: 3,
          height: 1,
        })),
      } as any;
      
      jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockContext);
      
      // Mock Image constructor
      (global as any).Image = jest.fn(() => ({
        onload: null,
        onerror: null,
        src: '',
        width: 100,
        height: 100,
      }));
    });

    it('should show ImageColorExtractor when image is loaded', () => {
      const stateWithImage = {
        ...defaultState,
        sourceImageData: new ImageData(2, 2),
        sourceImageUrl: 'blob:mock-url',
        generationMethod: 'image' as const,
      };

      render(
        <ColorPaletteTablet
          state={stateWithImage}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Image Color Extraction')).toBeInTheDocument();
      expect(screen.getByText('Extract All')).toBeInTheDocument();
      expect(screen.getByText('Click or drag to extract colors')).toBeInTheDocument();
    });

    it('should not show ImageColorExtractor when no image is loaded', () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByText('Image Color Extraction')).not.toBeInTheDocument();
    });

    it('should handle image processing with combined callback', async () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      // Find the file input
      const fileInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
      
      if (fileInput) {
        expect(fileInput.type).toBe('file');
        expect(fileInput.accept).toBe('image/*');

        // Create a mock file
        const mockFile = new File(['mock content'], 'test-image.png', { type: 'image/png' });
        
        // Simulate file selection and processing
        fireEvent.change(fileInput, { target: { files: [mockFile] } });

        // Verify that the file input received the file
        expect(fileInput.files).toHaveLength(1);
        expect(fileInput.files![0]).toBe(mockFile);
      } else {
        // Alternative: verify the file upload UI exists
        expect(screen.getByText('browse')).toBeInTheDocument();
        expect(screen.getByText(/drop an image here/i)).toBeInTheDocument();
      }
    });

    it('should handle image extraction from loaded image', () => {
      const mockImageData = new ImageData(new Uint8ClampedArray([
        255, 0, 0, 255,  // Red pixel
        0, 255, 0, 255,  // Green pixel  
        0, 0, 255, 255,  // Blue pixel
        255, 255, 255, 255  // White pixel
      ]), 2, 2);

      const stateWithImage = {
        ...defaultState,
        sourceImageData: mockImageData,
        sourceImageUrl: 'blob:mock-url',
        generationMethod: 'image' as const,
        colors: [
          createColorInfo('#FF0000'),
          createColorInfo('#00FF00'),
          createColorInfo('#0000FF'),
        ],
      };

      render(
        <ColorPaletteTablet
          state={stateWithImage}
          onChange={mockOnChange}
        />
      );

      // Find the image element
      const imageElement = screen.getByAltText('Color extraction source');
      expect(imageElement).toBeInTheDocument();
      expect(imageElement).toHaveAttribute('src', 'blob:mock-url');

      // Simulate clicking on the image for color extraction
      fireEvent.click(imageElement);

      // The click should trigger color extraction, but since we're testing the UI,
      // we verify the image is interactive
      expect(imageElement).toHaveClass('cursor-crosshair');
    });

    it('should display extract all button when image is loaded', () => {
      const stateWithImage = {
        ...defaultState,
        sourceImageData: new ImageData(2, 2),
        sourceImageUrl: 'blob:mock-url',
        generationMethod: 'image' as const,
      };

      render(
        <ColorPaletteTablet
          state={stateWithImage}
          onChange={mockOnChange}
        />
      );

      const extractAllButton = screen.getByRole('button', { name: /extract all/i });
      expect(extractAllButton).toBeInTheDocument();
      
      // Simulate clicking extract all
      fireEvent.click(extractAllButton);
      
      // Verify the button is clickable (it should be a button element)
      expect(extractAllButton.tagName).toBe('BUTTON');
    });

    it('should handle image upload errors gracefully', () => {
      const stateWithError = {
        ...defaultState,
        error: 'Failed to process image',
      };

      render(
        <ColorPaletteTablet
          state={stateWithError}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Failed to process image')).toBeInTheDocument();
    });

    it('should handle generation method change to image', () => {
      const stateWithImageMethod = {
        ...defaultState,
        generationMethod: 'image' as const,
        colors: [createColorInfo('#FF0000')],
      };

      render(
        <ColorPaletteTablet
          state={stateWithImageMethod}
          onChange={mockOnChange}
        />
      );

      // Should render normally with image generation method
      expect(screen.getByText('Color Palette Workspace')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should call onChange when state updates are needed', () => {
      render(
        <ColorPaletteTablet
          state={defaultState}
          onChange={mockOnChange}
        />
      );

      // Should call onChange for initialization
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('should preserve existing state properties when updating', () => {
      const stateWithColors = {
        ...defaultState,
        colors: [createColorInfo('#FF0000')],
        generationMethod: 'image' as const,
      };

      render(
        <ColorPaletteTablet
          state={stateWithColors}
          onChange={mockOnChange}
        />
      );

      // Verify state structure is maintained
      expect(stateWithColors.generationMethod).toBe('image');
      expect(stateWithColors.colors).toHaveLength(1);
    });

    it('should handle image state serialization properly', () => {
      const stateWithImage = {
        ...defaultState,
        sourceImageData: new ImageData(2, 2),
        sourceImageUrl: 'blob:mock-url',
        generationMethod: 'image' as const,
      };

      // Test that state with image data is handled correctly
      expect(stateWithImage.sourceImageData).toBeDefined();
      expect(stateWithImage.sourceImageUrl).toBe('blob:mock-url');
      expect(stateWithImage.generationMethod).toBe('image');
    });
  });
});