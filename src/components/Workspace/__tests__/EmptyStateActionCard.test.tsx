import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmptyStateActionCard } from '../EmptyStateActionCard';

describe('EmptyStateActionCard', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with primary color scheme', () => {
      render(
        <EmptyStateActionCard
          label="Test Action"
          description="Test Description"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
          testId="test-action"
        />
      );

      expect(screen.getByTestId('test-action')).toBeInTheDocument();
      expect(screen.getByText('Test Action')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('should render with info color scheme', () => {
      render(
        <EmptyStateActionCard
          label="Info Action"
          description="Info Description"
          icon="upload"
          colorScheme="info"
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Info Action')).toBeInTheDocument();
    });

    it('should render with warning color scheme', () => {
      render(
        <EmptyStateActionCard
          label="Warning Action"
          description="Warning Description"
          icon="file"
          colorScheme="warning"
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Warning Action')).toBeInTheDocument();
    });

    it('should render all icon types', () => {
      const { rerender } = render(
        <EmptyStateActionCard
          label="Plus Icon"
          description="Description"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
        />
      );
      expect(screen.getByText('Plus Icon')).toBeInTheDocument();

      rerender(
        <EmptyStateActionCard
          label="Upload Icon"
          description="Description"
          icon="upload"
          colorScheme="info"
          onClick={mockOnClick}
        />
      );
      expect(screen.getByText('Upload Icon')).toBeInTheDocument();

      rerender(
        <EmptyStateActionCard
          label="File Icon"
          description="Description"
          icon="file"
          colorScheme="warning"
          onClick={mockOnClick}
        />
      );
      expect(screen.getByText('File Icon')).toBeInTheDocument();
    });

    it('should render without testId when not provided', () => {
      const { container } = render(
        <EmptyStateActionCard
          label="Test Action"
          description="Test Description"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
        />
      );

      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveAttribute('data-testid');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      render(
        <EmptyStateActionCard
          label="Clickable Action"
          description="Click me"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
          testId="clickable-action"
        />
      );

      const button = screen.getByTestId('clickable-action');
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should be clickable multiple times', () => {
      render(
        <EmptyStateActionCard
          label="Multi Click"
          description="Click multiple times"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
          testId="multi-click"
        />
      );

      const button = screen.getByTestId('multi-click');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Styling', () => {
    it('should have correct base classes', () => {
      render(
        <EmptyStateActionCard
          label="Styled Action"
          description="Styled Description"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
          testId="styled-action"
        />
      );

      const button = screen.getByTestId('styled-action');
      expect(button).toHaveClass('group');
      expect(button).toHaveClass('flex');
      expect(button).toHaveClass('flex-col');
      expect(button).toHaveClass('items-center');
      expect(button).toHaveClass('justify-center');
    });

    it('should apply primary color scheme classes', () => {
      render(
        <EmptyStateActionCard
          label="Primary"
          description="Primary colors"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
          testId="primary-card"
        />
      );

      const button = screen.getByTestId('primary-card');
      expect(button).toHaveClass('bg-surface');
      expect(button).toHaveClass('hover:bg-surface-highlight');
      expect(button).toHaveClass('hover:border-primary/50');
    });

    it('should apply info color scheme classes', () => {
      render(
        <EmptyStateActionCard
          label="Info"
          description="Info colors"
          icon="upload"
          colorScheme="info"
          onClick={mockOnClick}
          testId="info-card"
        />
      );

      const button = screen.getByTestId('info-card');
      expect(button).toHaveClass('bg-surface');
      expect(button).toHaveClass('hover:border-info/50');
    });

    it('should apply warning color scheme classes', () => {
      render(
        <EmptyStateActionCard
          label="Warning"
          description="Warning colors"
          icon="file"
          colorScheme="warning"
          onClick={mockOnClick}
          testId="warning-card"
        />
      );

      const button = screen.getByTestId('warning-card');
      expect(button).toHaveClass('bg-surface');
      expect(button).toHaveClass('hover:border-warning/50');
    });
  });

  describe('Accessibility', () => {
    it('should be a button element', () => {
      render(
        <EmptyStateActionCard
          label="Accessible Action"
          description="Accessible"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
          testId="accessible-action"
        />
      );

      const button = screen.getByTestId('accessible-action');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should have visible text content', () => {
      render(
        <EmptyStateActionCard
          label="Visible Label"
          description="Visible Description"
          icon="plus"
          colorScheme="primary"
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Visible Label')).toBeVisible();
      expect(screen.getByText('Visible Description')).toBeVisible();
    });
  });
});
