import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickAdjustPanel } from '../QuickAdjustPanel';

describe('QuickAdjustPanel', () => {
    const mockOnAdjust = jest.fn();

    it('renders all adjustment buttons', () => {
        render(<QuickAdjustPanel onAdjust={mockOnAdjust} />);

        expect(screen.getByText('Start of Day')).toBeInTheDocument();
        expect(screen.getByText('+1h')).toBeInTheDocument();
        expect(screen.getByText('-1h')).toBeInTheDocument();
        expect(screen.getByText('+1d')).toBeInTheDocument();
        expect(screen.getByText('-1d')).toBeInTheDocument();
    });

    it('calls onAdjust with correct value when a button is clicked', () => {
        render(<QuickAdjustPanel onAdjust={mockOnAdjust} />);

        fireEvent.click(screen.getByText('+1h'));
        expect(mockOnAdjust).toHaveBeenCalledWith('h', 1);

        fireEvent.click(screen.getByText('Start of Day'));
        expect(mockOnAdjust).toHaveBeenCalledWith('startOfDay', 0);
    });
});
