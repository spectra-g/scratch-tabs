import { render, screen, fireEvent } from '@testing-library/react';
import { ToolCard } from '../ToolCard';
import { ToolItem } from '../../../services/toolService';
import { Puzzle } from '../../Icons';

const mockItem: ToolItem = {
    id: 'test-tool',
    type: 'tablet',
    label: 'Test Tool',
    description: 'A test description for the tool.',
    icon: Puzzle,
    keywords: ['test']
};

describe('ToolCard', () => {
    it('renders grid variant by default', () => {
        render(<ToolCard item={mockItem} onClick={() => { }} />);

        expect(screen.getByText('Test Tool')).toBeDefined();
        // Descriptions are hidden in grid view
        expect(screen.queryByText('A test description for the tool.')).toBeNull();
    });

    it('renders list variant when specified', () => {
        render(<ToolCard item={mockItem} onClick={() => { }} variant="list" />);

        expect(screen.getByText('Test Tool')).toBeDefined();
        // Descriptions are shown in list view
        expect(screen.getByText('A test description for the tool.')).toBeDefined();
        expect(screen.getByText('tablet')).toBeDefined();
    });

    it('calls onClick when clicked', () => {
        const handleClick = jest.fn();
        render(<ToolCard item={mockItem} onClick={handleClick} />);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies focused styles when isFocused is true (grid variant)', () => {
        const { rerender } = render(<ToolCard item={mockItem} onClick={() => { }} isFocused={false} variant="grid" />);
        const button = screen.getByRole('button');
        expect(button.className).not.toContain('border-secondary');
        expect(button.className).not.toContain('shadow-md');

        rerender(<ToolCard item={mockItem} onClick={() => { }} isFocused={true} variant="grid" />);
        expect(button.className).toContain('border-secondary');
        expect(button.className).toContain('shadow-md');
    });

    it('applies focused styles when isFocused is true (list variant)', () => {
        const { rerender } = render(<ToolCard item={mockItem} onClick={() => { }} isFocused={false} variant="list" />);
        const button = screen.getByRole('button');
        expect(button.className).not.toContain('border-l-secondary');

        rerender(<ToolCard item={mockItem} onClick={() => { }} isFocused={true} variant="list" />);
        expect(button.className).toContain('border-l-secondary');
    });
});
