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

    it('applies focused styles when isFocused is true', () => {
        const { rerender } = render(<ToolCard item={mockItem} onClick={() => { }} isFocused={false} />);
        expect(screen.getByRole('button').className).not.toContain('ring-focus');

        rerender(<ToolCard item={mockItem} onClick={() => { }} isFocused={true} />);
        expect(screen.getByRole('button').className).toContain('ring-focus');
    });
});
