import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SmartInput } from '../SmartInput';

describe('SmartInput Component', () => {
    const mockOnUpdate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with inputValue prop', () => {
        render(
            <SmartInput
                inputValue="2025-12-22"
                parsedDate={new Date('2025-12-22')}
                onUpdate={mockOnUpdate}
            />
        );
        expect(screen.getByDisplayValue('2025-12-22')).toBeInTheDocument();
    });

    it('calls onUpdate when user types', () => {
        render(
            <SmartInput
                inputValue=""
                parsedDate={null}
                onUpdate={mockOnUpdate}
            />
        );
        const input = screen.getByPlaceholderText(/e.g., now \+ 5d/);
        fireEvent.change(input, { target: { value: 'now' } });

        expect(mockOnUpdate).toHaveBeenCalledWith('now', expect.any(Date), null);
    });

    it('clears input when clear button is clicked', () => {
        render(
            <SmartInput
                inputValue="something"
                parsedDate={new Date()}
                onUpdate={mockOnUpdate}
            />
        );
        const clearBtn = screen.getByTitle('Clear input');
        fireEvent.click(clearBtn);

        expect(mockOnUpdate).toHaveBeenCalledWith('', null, null);
    });

    it('does not crash if inputValue is undefined', () => {
        render(
            <SmartInput
                // @ts-ignore
                inputValue={undefined}
                parsedDate={null}
                onUpdate={mockOnUpdate}
            />
        );
        expect(screen.getByPlaceholderText(/e.g., now \+ 5d/)).toBeInTheDocument();
    });

    it('resets to "now" when reset button is clicked', () => {
        render(
            <SmartInput
                inputValue="2020-01-01"
                parsedDate={new Date('2020-01-01')}
                onUpdate={mockOnUpdate}
            />
        );
        const resetBtn = screen.getByTitle("Reset to 'now'");
        fireEvent.click(resetBtn);

        expect(mockOnUpdate).toHaveBeenCalledWith('now', expect.any(Date), null);
    });
});
