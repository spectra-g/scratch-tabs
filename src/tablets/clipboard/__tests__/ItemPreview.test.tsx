import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ItemPreview } from '../components/ItemPreview';
import { ClipboardItem } from '../types';

describe('ItemPreview', () => {
  const mockImageItem: ClipboardItem = {
    id: '1',
    content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    type: 'image',
    timestamp: Date.now(),
    expiresAt: Date.now() + 1000,
    isPinned: false,
    isFavorite: false,
    title: 'Test Image',
  };

  const mockColorItem: ClipboardItem = {
    id: '2',
    content: '#FF0000',
    type: 'color',
    timestamp: Date.now(),
    expiresAt: Date.now() + 1000,
    isPinned: false,
    isFavorite: false,
    title: 'Red Color',
  };

  const mockLinkItem: ClipboardItem = {
    id: '3',
    content: 'https://example.com',
    type: 'link',
    timestamp: Date.now(),
    expiresAt: Date.now() + 1000,
    isPinned: false,
    isFavorite: false,
    title: 'Example Link',
  };

  const mockTextItem: ClipboardItem = {
    id: '4',
    content: 'Hello world',
    type: 'text',
    timestamp: Date.now(),
    expiresAt: Date.now() + 1000,
    isPinned: false,
    isFavorite: false,
    title: 'Hello world',
  };

  it('should render image preview', () => {
    render(<ItemPreview item={mockImageItem} viewMode="list" />);
    
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockImageItem.content);
    expect(img).toHaveAttribute('alt', 'Test Image');
  });

  it('should render color preview', () => {
    render(<ItemPreview item={mockColorItem} viewMode="list" />);
    
    const colorDiv = screen.getByTitle('#FF0000');
    expect(colorDiv).toBeInTheDocument();
    expect(colorDiv).toHaveStyle('background-color: #FF0000');
  });

  it('should render link preview', () => {
    render(<ItemPreview item={mockLinkItem} viewMode="list" />);
    
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render text preview', () => {
    render(<ItemPreview item={mockTextItem} viewMode="list" />);
    
    const text = screen.getByText('Hello world');
    expect(text).toBeInTheDocument();
    expect(text.tagName).toBe('PRE');
  });

  it('should apply card view styles for images', () => {
    render(<ItemPreview item={mockImageItem} viewMode="card" />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveClass('max-h-24');
    expect(img).toHaveClass('mx-auto');
  });

  it('should apply list view styles for images', () => {
    render(<ItemPreview item={mockImageItem} viewMode="list" />);
    
    const img = screen.getByRole('img');
    expect(img).toHaveClass('max-h-48');
    expect(img).not.toHaveClass('mx-auto');
  });

  it('should handle image load errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<ItemPreview item={mockImageItem} viewMode="list" />);
    
    const img = screen.getByRole('img');
    
    // Simulate image load error
    img.dispatchEvent(new Event('error', { bubbles: true }));
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load image:', mockImageItem.content);
    expect(img.style.display).toBe('none');
    
    consoleSpy.mockRestore();
  });
});