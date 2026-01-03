import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolSelectorModal } from '../ToolSelectorModal';
import { toolService } from '../../../services/toolService';

// Mock ToolService
jest.mock('../../../services/toolService', () => ({
    toolService: {
        getRecentItems: jest.fn().mockResolvedValue([
            { id: 'recent1', type: 'tablet', label: 'Recent Tablet', icon: () => null }
        ]),
        search: jest.fn().mockResolvedValue({
            tablets: [{ id: 'tablet1', type: 'tablet', label: 'Search Result', icon: () => null }],
            smartViews: [],
            formats: []
        }),
    }
}));

describe('ToolSelectorModal', () => {
    const mockOnSelect = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders recent items in grid by default', async () => {
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        await waitFor(() => {
            expect(screen.getByText(/recently used/i)).toBeDefined();
            expect(screen.getByText('Recent Tablet')).toBeDefined();
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);
        expect(input).toBe(document.activeElement);
    });

    it('switches to list view when searching', async () => {
        const user = userEvent.setup();
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        const input = await screen.findByPlaceholderText(/what do you want to do/i);

        await act(async () => {
            await user.type(input, 'search');
        });

        await waitFor(() => {
            expect(toolService.search).toHaveBeenCalledWith('search');
            expect(screen.getByText('Search Result')).toBeDefined();
            expect(screen.queryByText(/recently used/i)).toBeNull();
        }, { timeout: 2000 });
    });

    it('handles keyboard navigation', async () => {
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        // Wait for focused state to appear on the card to ensure all data is loaded and state is stable
        await waitFor(() => {
            const card = screen.getByText('Recent Tablet').closest('button');
            expect(card?.className).toContain('ring-focus');
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);

        // Explicit focus to be sure
        await act(async () => {
            input.focus();
        });

        // Use fireEvent as a more direct fallback for JSDOM
        await act(async () => {
            fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', bubbles: true });
        });

        await waitFor(() => {
            expect(mockOnSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'recent1' }));
        });
    });

    it('closes on escape', async () => {
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        const input = await screen.findByPlaceholderText(/what do you want to do/i);

        await act(async () => {
            fireEvent.keyDown(input, { key: 'Escape', code: 'Escape', bubbles: true });
        });

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });
    });
});
