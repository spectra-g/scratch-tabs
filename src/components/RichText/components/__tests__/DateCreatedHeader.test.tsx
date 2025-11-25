import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DateCreatedHeader } from '../DateCreatedHeader';

describe('DateCreatedHeader', () => {
  describe('Rendering', () => {
    it('should render the date created header', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      render(<DateCreatedHeader dateCreated={timestamp} />);

      const header = screen.getByTestId('rich-text-date-created');
      expect(header).toBeInTheDocument();
    });

    it('should display formatted date with weekday, full date, and time', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      render(<DateCreatedHeader dateCreated={timestamp} />);

      const header = screen.getByTestId('rich-text-date-created');
      // Should contain "Created" text
      expect(header.textContent).toContain('Created');

      // Should contain date parts (format may vary by locale, but should include year and month name)
      expect(header.textContent).toMatch(/2024/);
      expect(header.textContent).toMatch(/January|Jan/);
    });

    it('should handle different timestamps correctly', () => {
      const timestamp1 = new Date('2023-12-25T15:45:00').getTime();
      const { rerender } = render(<DateCreatedHeader dateCreated={timestamp1} />);

      let header = screen.getByTestId('rich-text-date-created');
      expect(header.textContent).toMatch(/2023/);
      expect(header.textContent).toMatch(/December|Dec/);

      // Change timestamp
      const timestamp2 = new Date('2024-06-30T08:00:00').getTime();
      rerender(<DateCreatedHeader dateCreated={timestamp2} />);

      header = screen.getByTestId('rich-text-date-created');
      expect(header.textContent).toMatch(/2024/);
      expect(header.textContent).toMatch(/June|Jun/);
    });

    it('should apply custom className', () => {
      const timestamp = Date.now();
      render(<DateCreatedHeader dateCreated={timestamp} className="custom-class" />);

      const header = screen.getByTestId('rich-text-date-created');
      expect(header).toHaveClass('custom-class');
    });

    it('should have default styling classes', () => {
      const timestamp = Date.now();
      render(<DateCreatedHeader dateCreated={timestamp} />);

      const header = screen.getByTestId('rich-text-date-created');
      expect(header).toHaveClass('text-xs');
      expect(header).toHaveClass('text-muted');
      expect(header).toHaveClass('text-center');
      expect(header).toHaveClass('border-base');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      render(<DateCreatedHeader dateCreated={timestamp} />);

      const header = screen.getByTestId('rich-text-date-created');
      expect(header).toHaveAttribute('role', 'heading');
      expect(header).toHaveAttribute('aria-label');
    });

    it('should have descriptive aria-label', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime();
      render(<DateCreatedHeader dateCreated={timestamp} />);

      const header = screen.getByTestId('rich-text-date-created');
      const ariaLabel = header.getAttribute('aria-label');

      expect(ariaLabel).toContain('Document created on');
      expect(ariaLabel).toMatch(/2024/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very old timestamps', () => {
      const oldTimestamp = new Date('1990-01-01T00:00:00').getTime();
      render(<DateCreatedHeader dateCreated={oldTimestamp} />);

      const header = screen.getByTestId('rich-text-date-created');
      expect(header.textContent).toContain('Created');
      expect(header.textContent).toMatch(/1990/);
    });

    it('should handle future timestamps', () => {
      const futureTimestamp = new Date('2030-12-31T23:59:59').getTime();
      render(<DateCreatedHeader dateCreated={futureTimestamp} />);

      const header = screen.getByTestId('rich-text-date-created');
      expect(header.textContent).toContain('Created');
      expect(header.textContent).toMatch(/2030/);
    });

    it('should handle current timestamp', () => {
      const now = Date.now();
      render(<DateCreatedHeader dateCreated={now} />);

      const header = screen.getByTestId('rich-text-date-created');
      expect(header).toBeInTheDocument();
      expect(header.textContent).toContain('Created');
    });
  });
});
