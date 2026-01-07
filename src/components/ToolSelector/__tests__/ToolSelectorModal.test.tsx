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

        // Wait for focused state to appear on the card (grid variant uses border-secondary)
        await waitFor(() => {
            const card = screen.getByText('Recent Tablet').closest('button');
            expect(card?.className).toContain('border-secondary');
            expect(card?.className).toContain('shadow-md');
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

    it('handles left/right arrow navigation in grid layout', async () => {
        // Mock multiple recent items to test horizontal navigation
        (toolService.getRecentItems as jest.Mock).mockResolvedValueOnce([
            { id: 'recent1', type: 'tablet', label: 'Item 1', icon: () => null },
            { id: 'recent2', type: 'tablet', label: 'Item 2', icon: () => null },
            { id: 'recent3', type: 'tablet', label: 'Item 3', icon: () => null },
        ]);

        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        await waitFor(() => {
            const card = screen.getByText('Item 1').closest('button');
            expect(card?.className).toContain('border-secondary');
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);

        // Press right arrow - should move to Item 2
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowRight', code: 'ArrowRight', bubbles: true });
        });

        await waitFor(() => {
            const card2 = screen.getByText('Item 2').closest('button');
            expect(card2?.className).toContain('border-secondary');
        });

        // Press left arrow - should move back to Item 1
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true });
        });

        await waitFor(() => {
            const card1 = screen.getByText('Item 1').closest('button');
            expect(card1?.className).toContain('border-secondary');
        });
    });

    it('handles down arrow navigation in grid layout (moves by columns)', async () => {
        // Mock 10 items to fill 2 rows (5 columns per row)
        const items = Array.from({ length: 10 }, (_, i) => ({
            id: `recent${i + 1}`,
            type: 'tablet' as const,
            label: `Item ${i + 1}`,
            icon: () => null
        }));
        (toolService.getRecentItems as jest.Mock).mockResolvedValueOnce(items);

        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        await waitFor(() => {
            const card = screen.getByText('Item 1').closest('button');
            expect(card?.className).toContain('border-secondary');
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);

        // Press down arrow - should move down by 5 (column count) to Item 6
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true });
        });

        await waitFor(() => {
            const card6 = screen.getByText('Item 6').closest('button');
            expect(card6?.className).toContain('border-secondary');
        });
    });

    it('handles navigation between grid and list sections', async () => {
        // Mock recent items (grid) and search results (list)
        (toolService.getRecentItems as jest.Mock).mockResolvedValueOnce([
            { id: 'recent1', type: 'tablet', label: 'Recent Item', icon: () => null },
        ]);
        (toolService.search as jest.Mock).mockResolvedValueOnce({
            tablets: [{ id: 'tablet1', type: 'tablet', label: 'Tablet Item', icon: () => null }],
            smartViews: [],
            formats: []
        });

        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        await waitFor(() => {
            const card = screen.getByText('Recent Item').closest('button');
            expect(card?.className).toContain('border-secondary');
        });

        const input = screen.getByPlaceholderText(/what do you want to do/i);

        // Press down arrow - should move from grid section to list section
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown', bubbles: true });
        });

        await waitFor(() => {
            const tabletCard = screen.getByText('Tablet Item').closest('button');
            // List items use border-l-secondary
            expect(tabletCard?.className).toContain('border-l-secondary');
        });
    });

    it('does not navigate left/right in list layout', async () => {
        const user = userEvent.setup();
        render(<ToolSelectorModal onSelect={mockOnSelect} onClose={mockOnClose} />);

        const input = await screen.findByPlaceholderText(/what do you want to do/i);

        // Type to switch to search mode (list layout)
        await act(async () => {
            await user.type(input, 'test');
        });

        await waitFor(() => {
            expect(screen.getByText('Search Result')).toBeDefined();
        });

        const initialCard = screen.getByText('Search Result').closest('button');
        expect(initialCard?.className).toContain('border-l-secondary');

        // Press right arrow - should not change selection in list view
        await act(async () => {
            fireEvent.keyDown(input, { key: 'ArrowRight', code: 'ArrowRight', bubbles: true });
        });

        // Selection should remain the same
        const stillSelected = screen.getByText('Search Result').closest('button');
        expect(stillSelected?.className).toContain('border-l-secondary');
    });
});
