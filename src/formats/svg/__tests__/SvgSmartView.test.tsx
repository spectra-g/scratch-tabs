import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SvgSmartView } from '../views/components/SvgSmartView';
import { SmartViewProps } from '../../../views/registry';

// Mock the SvgViewer component
jest.mock('../views/components/SvgViewer', () => ({
  SvgViewer: ({ content, onContentChange, tabId, side }: SmartViewProps) => (
    <div data-testid="svg-viewer">
      <div>Content: {content}</div>
      <div>Tab ID: {tabId}</div>
      <div>Side: {side}</div>
      <button onClick={() => onContentChange('modified content')}>
        Modify Content
      </button>
    </div>
  ),
}));

describe('SvgSmartView', () => {
  const defaultProps: SmartViewProps = {
    content: '<svg><rect /></svg>',
    onContentChange: jest.fn(),
    tabId: 'test-tab',
    isActive: true,
    side: 'left',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render SvgViewer with correct props', () => {
    render(<SvgSmartView {...defaultProps} />);
    
    expect(screen.getByTestId('svg-viewer')).toBeInTheDocument();
    expect(screen.getByText('Content: <svg><rect /></svg>')).toBeInTheDocument();
    expect(screen.getByText('Tab ID: test-tab')).toBeInTheDocument();
    expect(screen.getByText('Side: left')).toBeInTheDocument();
  });

  it('should pass through onContentChange correctly', () => {
    const mockOnContentChange = jest.fn();
    render(<SvgSmartView {...defaultProps} onContentChange={mockOnContentChange} />);
    
    const modifyButton = screen.getByText('Modify Content');
    fireEvent.click(modifyButton);
    
    expect(mockOnContentChange).toHaveBeenCalledWith('modified content');
  });

  it('should handle different sides correctly', () => {
    const { rerender } = render(<SvgSmartView {...defaultProps} side="left" />);
    expect(screen.getByText('Side: left')).toBeInTheDocument();
    
    rerender(<SvgSmartView {...defaultProps} side="right" />);
    expect(screen.getByText('Side: right')).toBeInTheDocument();
  });

  it('should handle empty content', () => {
    render(<SvgSmartView {...defaultProps} content="" />);
    
    expect(screen.getByTestId('svg-viewer')).toBeInTheDocument();
    expect(screen.getByText('Content:')).toBeInTheDocument();
  });

  it('should handle complex SVG content', () => {
    const complexSvg = `
      <svg viewBox="0 0 200 200">
        <defs>
          <linearGradient id="grad1">
            <stop offset="0%" stop-color="red" />
            <stop offset="100%" stop-color="blue" />
          </linearGradient>
        </defs>
        <g transform="translate(10,10)">
          <rect width="50" height="50" fill="url(#grad1)" />
          <circle cx="100" cy="100" r="30" fill="green" />
        </g>
      </svg>
    `;
    
    render(<SvgSmartView {...defaultProps} content={complexSvg} />);
    
    expect(screen.getByTestId('svg-viewer')).toBeInTheDocument();
    expect(screen.getByText(/Content:/)).toBeInTheDocument();
  });
});