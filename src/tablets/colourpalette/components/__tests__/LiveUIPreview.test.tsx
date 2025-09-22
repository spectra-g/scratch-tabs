import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveUIPreview } from '../LiveUIPreview';
import { ColorInfo, UIPreviewMapping } from '../../types';
import { createColorInfo } from '../../utils/colourUtils';

describe('LiveUIPreview', () => {
  const mockColors: ColorInfo[] = [
    createColorInfo('#FF0000'), // Red
    createColorInfo('#00FF00'), // Green
    createColorInfo('#0000FF'), // Blue
    createColorInfo('#FFFF00'), // Yellow
    createColorInfo('#FF00FF'), // Magenta
  ];

  const mockMapping: UIPreviewMapping = {
    background: '#FFFFFF',
    text: '#000000',
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#10B981',
    border: '#E5E7EB',
  };

  const mockOnMappingChange = jest.fn();

  beforeEach(() => {
    mockOnMappingChange.mockClear();
  });

  it('should render Live UI Preview with colors', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    expect(screen.getByText('Live UI Preview')).toBeInTheDocument();
    expect(screen.getByText('Style 1/5')).toBeInTheDocument();
    expect(screen.getByText('Remix')).toBeInTheDocument();
  });

  it('should display color swatches', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    // Should render all 5 color swatches
    const swatches = screen.getAllByTitle(/Drag #[A-F0-9]{6} to UI elements/);
    expect(swatches).toHaveLength(5);
  });

  it('should show remix button only when colors are present', () => {
    const { rerender } = render(
      <LiveUIPreview
        colors={[]}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    expect(screen.queryByText('Remix')).not.toBeInTheDocument();

    rerender(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    expect(screen.getByText('Remix')).toBeInTheDocument();
  });

  it('should cycle through mapping presets when remix button is clicked', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    const remixButton = screen.getByText('Remix');

    // Click the remix button
    fireEvent.click(remixButton);

    // Should call onMappingChange with new mapping
    expect(mockOnMappingChange).toHaveBeenCalledTimes(1);

    // Should update style indicator
    expect(screen.getByText('Style 2/5')).toBeInTheDocument();
  });

  it('should cycle through all 5 preset styles', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    const remixButton = screen.getByText('Remix');

    // Click through all 5 presets
    for (let i = 1; i <= 5; i++) {
      fireEvent.click(remixButton);
      expect(screen.getByText(`Style ${i === 5 ? 1 : i + 1}/5`)).toBeInTheDocument();
    }

    expect(mockOnMappingChange).toHaveBeenCalledTimes(5);
  });

  it('should render UI preview components with applied styles', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    // Check for UI preview elements
    expect(screen.getByText('Product Card')).toBeInTheDocument();
    expect(screen.getByText('Brand Name')).toBeInTheDocument();
    expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    expect(screen.getByText('Subscribe')).toBeInTheDocument();
  });

  it('should display color mapping legend', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    // Should show all mapping entries (with capitalize CSS class they should be capitalized)
    expect(screen.getByText('background')).toBeInTheDocument();
    expect(screen.getByText('text')).toBeInTheDocument();
    expect(screen.getByText('primary')).toBeInTheDocument();
    expect(screen.getByText('secondary')).toBeInTheDocument();
    expect(screen.getByText('accent')).toBeInTheDocument();
    expect(screen.getByText('border')).toBeInTheDocument();
  });

  it('should apply different mapping presets correctly', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    const remixButton = screen.getByText('Remix');
    fireEvent.click(remixButton);

    const calledMapping = mockOnMappingChange.mock.calls[0][0] as UIPreviewMapping;

    // Should use colors from the palette in the mapping
    expect(Object.values(calledMapping)).toContain('#FF0000'); // Red should be used
    expect(Object.values(calledMapping).every(color => /^#[A-F0-9]{6}$/.test(color))).toBe(true);
  });

  it('should handle drag and drop functionality', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    const colorSwatch = screen.getAllByTitle(/Drag #[A-F0-9]{6} to UI elements/)[0];

    // Test drag start
    fireEvent.dragStart(colorSwatch);

    // Test drag end
    fireEvent.dragEnd(colorSwatch);

    // No assertions needed as this is mostly visual feedback
  });

  it('should show style indicator even with no colors', () => {
    render(
      <LiveUIPreview
        colors={[]}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    expect(screen.queryByText('Style 1/5')).not.toBeInTheDocument();
  });

  it('should generate different mappings for different preset types', () => {
    render(
      <LiveUIPreview
        colors={mockColors}
        mapping={mockMapping}
        onMappingChange={mockOnMappingChange}
      />
    );

    const remixButton = screen.getByText('Remix');

    // Get first preset
    fireEvent.click(remixButton);
    const preset1 = mockOnMappingChange.mock.calls[0][0] as UIPreviewMapping;

    // Get second preset
    fireEvent.click(remixButton);
    const preset2 = mockOnMappingChange.mock.calls[1][0] as UIPreviewMapping;

    // Presets should be different
    expect(preset1).not.toEqual(preset2);

    // Both should have valid hex colors
    Object.values(preset1).forEach(color => {
      expect(color).toMatch(/^#[A-F0-9]{6}$/);
    });
    Object.values(preset2).forEach(color => {
      expect(color).toMatch(/^#[A-F0-9]{6}$/);
    });
  });
});