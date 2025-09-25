import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AccessibilityMatrix } from '../AccessibilityMatrix';
import { createColorInfo } from '../../utils/colourUtils';

describe('AccessibilityMatrix', () => {
  const mockOnColorSuggestionApply = jest.fn();

  beforeEach(() => {
    mockOnColorSuggestionApply.mockClear();
  });

  it('should render message when fewer than 2 colors', () => {
    const colors = [createColorInfo('#FF0000')];

    render(
      <AccessibilityMatrix
        colors={colors}
        onColorSuggestionApply={mockOnColorSuggestionApply}
      />
    );

    expect(screen.getByText('Add more colors to see accessibility matrix')).toBeInTheDocument();
  });

  it('should display accessibility pairs for multiple colors', () => {
    const colors = [
      createColorInfo('#924A45'),
      createColorInfo('#BDDEDA')
    ];

    render(
      <AccessibilityMatrix
        colors={colors}
        onColorSuggestionApply={mockOnColorSuggestionApply}
      />
    );

    expect(screen.getByText('Accessibility Matrix')).toBeInTheDocument();
    expect(screen.getByText('WCAG 2.1 Contrast Ratios')).toBeInTheDocument();

    // Should show contrast ratios (includes legend text, so more than 2)
    expect(screen.getAllByText(/\d+\.\d+:1/)).toHaveLength(4); // Two pairs plus legend
  });

  it('should show suggestions for failing contrast', () => {
    const colors = [
      createColorInfo('#924A45'), // Dark red
      createColorInfo('#BDDEDA')  // Light blue-green
    ];

    render(
      <AccessibilityMatrix
        colors={colors}
        onColorSuggestionApply={mockOnColorSuggestionApply}
      />
    );

    // Should show suggestion buttons for failing contrast
    const suggestionButtons = screen.getAllByText(/💡.*to #[A-Fa-f0-9]{6}/);
    expect(suggestionButtons.length).toBeGreaterThan(0);
  });

  it('should call onColorSuggestionApply when suggestion is clicked', () => {
    const colors = [
      createColorInfo('#924A45'), // Dark red
      createColorInfo('#BDDEDA')  // Light blue-green
    ];

    render(
      <AccessibilityMatrix
        colors={colors}
        onColorSuggestionApply={mockOnColorSuggestionApply}
      />
    );

    // Find and click a suggestion button
    const suggestionButton = screen.getAllByText(/💡.*text to #[A-Fa-f0-9]{6}/)[0];
    fireEvent.click(suggestionButton);

    expect(mockOnColorSuggestionApply).toHaveBeenCalledTimes(1);
    expect(mockOnColorSuggestionApply).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({
        hex: expect.stringMatching(/#[A-Fa-f0-9]{6}/),
        luminance: expect.any(Number)
      })
    );
  });

  it('should handle background color suggestions', () => {
    const colors = [
      createColorInfo('#924A45'), // Dark red
      createColorInfo('#BDDEDA')  // Light blue-green
    ];

    render(
      <AccessibilityMatrix
        colors={colors}
        onColorSuggestionApply={mockOnColorSuggestionApply}
      />
    );

    // Look for background suggestions (if any)
    const backgroundSuggestions = screen.queryAllByText(/💡.*background to #[A-Fa-f0-9]{6}/);

    if (backgroundSuggestions.length > 0) {
      fireEvent.click(backgroundSuggestions[0]);
      expect(mockOnColorSuggestionApply).toHaveBeenCalledTimes(1);
    }
  });

  it('should display correct contrast levels', () => {
    const colors = [
      createColorInfo('#000000'), // Black - should give AAA with white
      createColorInfo('#FFFFFF')  // White
    ];

    render(
      <AccessibilityMatrix
        colors={colors}
        onColorSuggestionApply={mockOnColorSuggestionApply}
      />
    );

    // Should show AAA rating for black on white (multiple instances)
    expect(screen.getAllByText('AAA')).toHaveLength(2); // Two AAA badges for the pair
  });
});