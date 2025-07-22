import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ContentTypeIcon } from '../components/ContentTypeIcon';

describe('ContentTypeIcon', () => {
  it('should render image icon for image type', () => {
    const { container } = render(<ContentTypeIcon type="image" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-purple-400');
  });

  it('should render link icon for link type', () => {
    const { container } = render(<ContentTypeIcon type="link" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-blue-400');
  });

  it('should render color icon for color type', () => {
    const { container } = render(<ContentTypeIcon type="color" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-pink-400');
  });

  it('should render text icon for text type', () => {
    const { container } = render(<ContentTypeIcon type="text" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('text-gray-400');
  });

  it('should use custom size', () => {
    const { container } = render(<ContentTypeIcon type="text" size={20} />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('width', '20');
    expect(icon).toHaveAttribute('height', '20');
  });

  it('should use default size when not specified', () => {
    const { container } = render(<ContentTypeIcon type="text" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('width', '14');
    expect(icon).toHaveAttribute('height', '14');
  });
});