import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimezoneExplorer } from '../TimezoneExplorer';

// Mock the Icons
jest.mock('../../../../components/Icons', () => ({
    Globe: () => <div data-testid="globe-icon">Globe</div>,
    X: () => <div data-testid="x-icon">X</div>,
    Plus: () => <div data-testid="plus-icon">Plus</div>,
    Clock: () => <div data-testid="clock-icon">Clock</div>,
}));

describe('TimezoneExplorer', () => {
    const mockDate = new Date('2023-01-01T12:00:00.000Z');

    it('renders with pinned timezones', () => {
        render(
            <TimezoneExplorer
                parsedDate={mockDate}
                selectedTimezones={['UTC', 'America/New_York']}
                onTimezonesChange={jest.fn()}
            />
        );

        expect(screen.getByText('Timezone Explorer')).toBeInTheDocument();
        expect(screen.getByText('UTC')).toBeInTheDocument();
        expect(screen.getByText('America/New_York')).toBeInTheDocument();
    });

    it('shows empty state when no timezones are pinned', () => {
        render(
            <TimezoneExplorer
                parsedDate={mockDate}
                selectedTimezones={[]}
                onTimezonesChange={jest.fn()}
            />
        );

        expect(screen.getByText(/Add timezones to compare times/i)).toBeInTheDocument();
    });
});
