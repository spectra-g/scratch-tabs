import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CurlSmartView } from '../CurlSmartView';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

// Mock tablet action service
jest.mock('../../../../../services/tabletActionService', () => ({
  tabletActionService: {
    handleAction: jest.fn(),
  },
}));

const mockOnContentChange = jest.fn();

const sampleCurlContent = `# API Test Commands

curl -X GET https://api.example.com/users

# Create user
curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John Doe"}'`;

describe('CurlSmartView', () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  it('should render curl commands as cards', () => {
    render(
      <CurlSmartView
        content={sampleCurlContent}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByTestId('curl-smart-view')).toBeInTheDocument();
    expect(screen.getByText('Curl Workbench')).toBeInTheDocument();
    expect(screen.getByText('2 commands')).toBeInTheDocument();
  });

  it('should show method breakdown in header', () => {
    render(
      <CurlSmartView
        content={sampleCurlContent}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('1 GET')).toBeInTheDocument();
    expect(screen.getByText('1 POST')).toBeInTheDocument();
  });

  it('should expand card when clicked', async () => {
    render(
      <CurlSmartView
        content={sampleCurlContent}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const cards = screen.getAllByTestId('curl-card');
    expect(cards).toHaveLength(2);

    // Click on first card to expand it
    fireEvent.click(cards[0]);

    await waitFor(() => {
      expect(screen.getByText('Open in Rest Client')).toBeInTheDocument();
    });
  });

  it('should handle empty content gracefully', () => {
    render(
      <CurlSmartView
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('No Curl commands found')).toBeInTheDocument();
    expect(screen.getByText('Add Curl Command')).toBeInTheDocument();
  });

  it('should handle text-only content', () => {
    render(
      <CurlSmartView
        content="This is just text with no curl commands"
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText('No valid Curl commands detected')).toBeInTheDocument();
  });

  it('should add new command when button is clicked', async () => {
    render(
      <CurlSmartView
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const addButton = screen.getByText('Add Curl Command');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockOnContentChange).toHaveBeenCalledWith(
        expect.stringContaining('curl https://api.example.com')
      );
    });
  });

  it('should toggle options palette', () => {
    render(
      <CurlSmartView
        content={sampleCurlContent}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Find the Options button by its title attribute to distinguish from other "Options" text
    const optionsButton = screen.getByTitle('Toggle options palette');
    fireEvent.click(optionsButton);

    expect(screen.getByText('Curl Options')).toBeInTheDocument();
  });
});