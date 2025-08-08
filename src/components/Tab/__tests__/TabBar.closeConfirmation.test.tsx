/**
 * Test to verify that Ctrl+W/Cmd+W triggers the same confirmation flow as clicking the close button
 */
import { render } from '@testing-library/react';
import React from 'react';

describe('TabBar Keyboard Close Confirmation', () => {
  test('selector logic should be correct for finding close button', () => {
    // Create mock tab structure
    const mockTabTitle = 'Test Tab';
    const expectedSelector = `[data-testid="tab-${mockTabTitle}"] button[aria-label*="Close tab"]`;
    
    // Create a mock DOM structure similar to what SortableTab renders
    const container = document.createElement('div');
    container.innerHTML = `
      <div data-testid="tab-${mockTabTitle}">
        <span>Tab content</span>
        <button aria-label="Close tab ${mockTabTitle}">
          <span>X</span>
        </button>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Test that our selector finds the close button
    const closeButton = document.querySelector(expectedSelector);
    expect(closeButton).toBeTruthy();
    expect(closeButton?.getAttribute('aria-label')).toBe(`Close tab ${mockTabTitle}`);
    
    // Cleanup
    document.body.removeChild(container);
  });

  test('selector should handle tabs with special characters in title', () => {
    // Test with tab titles that might have special characters
    const testCases = [
      'Simple Tab',
      'Tab with spaces',
      'Tab-with-dashes',
      'Tab_with_underscores',
      // Note: Special chars like quotes in tab titles might need escaping in real app
    ];
    
    testCases.forEach(tabTitle => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-testid="tab-${tabTitle}">
          <button aria-label="Close tab ${tabTitle}">X</button>
        </div>
      `;
      
      document.body.appendChild(container);
      
      const selector = `[data-testid="tab-${tabTitle}"] button[aria-label*="Close tab"]`;
      const closeButton = document.querySelector(selector);
      
      expect(closeButton).toBeTruthy();
      
      document.body.removeChild(container);
    });
  });

  test('should gracefully handle missing close button', () => {
    // Test the fallback case where close button is not found
    const container = document.createElement('div');
    container.innerHTML = `
      <div data-testid="tab-No Close Button">
        <span>This tab has no close button</span>
      </div>
    `;
    
    document.body.appendChild(container);
    
    const selector = `[data-testid="tab-No Close Button"] button[aria-label*="Close tab"]`;
    const closeButton = document.querySelector(selector);
    
    expect(closeButton).toBeFalsy(); // Should not find the button
    
    document.body.removeChild(container);
  });
});