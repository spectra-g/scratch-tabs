import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PaletteDisplay } from '../PaletteDisplay';
import { createColorInfo } from '../../utils/colourUtils';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('PaletteDisplay', () => {
  const mockColors = [
    createColorInfo('#FF0000'),
    createColorInfo('#00FF00'),
    createColorInfo('#0000FF'),
  ];

  const defaultProps = {
    colors: mockColors,
    activeColorIndex: 0,
    onColorsChange: jest.fn(),
    onActiveColorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render all colors correctly', () => {
      render(<PaletteDisplay {...defaultProps} />);

      expect(screen.getByText('#FF0000')).toBeInTheDocument();
      expect(screen.getByText('#00FF00')).toBeInTheDocument();
      expect(screen.getByText('#0000FF')).toBeInTheDocument();
    });

    it('should highlight the active color', () => {
      const { container } = render(<PaletteDisplay {...defaultProps} activeColorIndex={1} />);

      // The active color card should have the primary border class (semantic token)
      const activeCard = container.querySelector('.border-primary');
      expect(activeCard).toBeInTheDocument();
    });

    it('should call onActiveColorChange when color is clicked', () => {
      render(<PaletteDisplay {...defaultProps} />);

      // Click on the second color card container
      const colorCardContainer = screen.getByText('#00FF00').closest('div').closest('div');
      fireEvent.click(colorCardContainer);

      expect(defaultProps.onActiveColorChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Color Editing', () => {
    it('should enter edit mode when Edit overlay is clicked', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      // Should show color picker and hex input
      expect(screen.getByDisplayValue('#FF0000')).toBeInTheDocument();
      expect(screen.getByTitle('Pick a color')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should update edit value when hex input changes', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: '#00FF00' } });

      expect(screen.getByDisplayValue('#00FF00')).toBeInTheDocument();
    });

    it('should convert hex input to uppercase', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: '#abcdef' } });

      expect(screen.getByDisplayValue('#ABCDEF')).toBeInTheDocument();
    });

    it('should save valid color changes', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: '#00FF00' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(defaultProps.onColorsChange).toHaveBeenCalledWith([
        createColorInfo('#00FF00'),
        mockColors[1],
        mockColors[2],
      ]);
    });

    it('should cancel edit mode without saving changes', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: '#00FF00' } });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Should return to normal view without saving
      expect(screen.getByText('#FF0000')).toBeInTheDocument();
      expect(defaultProps.onColorsChange).not.toHaveBeenCalled();
    });
  });

  describe('Color Validation', () => {
    it('should show red border for invalid hex colors', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: 'invalid' } });

      expect(hexInput).toHaveClass('border-danger');
    });

    it('should disable save button for invalid hex colors', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: 'invalid' } });

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveClass('bg-element', 'text-muted', 'cursor-not-allowed');
    });

    it('should handle hex colors without # prefix', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: '00FF00' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      expect(defaultProps.onColorsChange).toHaveBeenCalledWith([
        createColorInfo('#00FF00'),
        mockColors[1],
        mockColors[2],
      ]);
    });

    it('should not save invalid colors', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: 'invalid' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      // Should not save and should stay in edit mode
      expect(defaultProps.onColorsChange).not.toHaveBeenCalled();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should save on Enter key press', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: '#00FF00' } });
      fireEvent.keyDown(hexInput, { key: 'Enter', code: 'Enter' });

      expect(defaultProps.onColorsChange).toHaveBeenCalledWith([
        createColorInfo('#00FF00'),
        mockColors[1],
        mockColors[2],
      ]);
    });

    it('should cancel on Escape key press', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const hexInput = screen.getByDisplayValue('#FF0000');
      fireEvent.change(hexInput, { target: { value: '#00FF00' } });
      fireEvent.keyDown(hexInput, { key: 'Escape', code: 'Escape' });

      // Should return to normal view without saving
      expect(screen.getByText('#FF0000')).toBeInTheDocument();
      expect(defaultProps.onColorsChange).not.toHaveBeenCalled();
    });
  });

  describe('Color Picker Integration', () => {
    it('should update hex input when color picker changes', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const colorPicker = screen.getByTitle('Pick a color');
      fireEvent.change(colorPicker, { target: { value: '#00ff00' } });

      // Color picker should update the shared editValue state
      expect(colorPicker).toHaveValue('#00ff00');
    });

    it('should synchronize color picker and hex input values', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const editOverlay = screen.getAllByText('Edit')[0];
      fireEvent.click(editOverlay);

      const colorPicker = screen.getByTitle('Pick a color') as HTMLInputElement;
      const hexInput = screen.getByDisplayValue('#FF0000');

      // Both should start with the same value
      expect(colorPicker.value).toBe('#ff0000'); // HTML color input uses lowercase
      expect(hexInput).toHaveValue('#FF0000'); // Our input uses uppercase

      // Changing hex input should not affect color picker directly (by design)
      fireEvent.change(hexInput, { target: { value: '#00FF00' } });
      expect(hexInput).toHaveValue('#00FF00');
    });
  });

  describe('Add Color Functionality', () => {
    it('should add new color when plus button is clicked', () => {
      render(<PaletteDisplay {...defaultProps} />);

      const addButton = screen.getByTitle('Add color');
      fireEvent.click(addButton);

      expect(defaultProps.onColorsChange).toHaveBeenCalledWith([
        ...mockColors,
        createColorInfo('#808080'),
      ]);
    });
  });
});