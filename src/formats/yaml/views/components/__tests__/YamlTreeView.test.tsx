import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { YamlTreeView } from '../YamlTreeView';
import { YamlNode } from '../../../utils/yamlParser';

// Mock the useVirtualizer hook to return all items as visible
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn().mockImplementation(({ count }) => ({
    getTotalSize: () => count * 32,
    getVirtualItems: () => Array.from({ length: count }, (_, i) => ({
      index: i,
      key: i,
      size: 32,
      start: i * 32
    }))
  }))
}));

// Mock getBoundingClientRect for virtualization
const mockGetBoundingClientRect = jest.fn(() => ({
  width: 400,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 400,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: mockGetBoundingClientRect,
});

const mockOnNodeSelect = jest.fn();

const sampleNodes: YamlNode[] = [
  {
    id: 'root-0',
    path: 'apiVersion',
    key: 'apiVersion',
    value: 'apps/v1',
    type: 'string',
    line: 1,
  },
  {
    id: 'root-1',
    path: 'kind',
    key: 'kind',
    value: 'Deployment',
    type: 'string',
    line: 2,
  },
  {
    id: 'root-2',
    path: 'metadata',
    key: 'metadata',
    value: { name: 'my-app' },
    type: 'object',
    line: 3,
    children: [
      {
        id: 'metadata-0',
        path: 'metadata.name',
        key: 'name',
        value: 'my-app',
        type: 'string',
        line: 4,
      },
    ],
  },
];

describe('YamlTreeView', () => {
  beforeEach(() => {
    mockOnNodeSelect.mockClear();
  });

  it('should render YAML nodes in a tree structure', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath={null}
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    expect(screen.getByTestId('yaml-tree-view')).toBeInTheDocument();
    expect(screen.getByText('apiVersion')).toBeInTheDocument();
    expect(screen.getByText('kind')).toBeInTheDocument();
    expect(screen.getByText('metadata')).toBeInTheDocument();
  });

  it('should handle node selection', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath={null}
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    const apiVersionNode = screen.getByText('apiVersion').closest('[data-testid="yaml-tree-node"]');
    fireEvent.click(apiVersionNode!);

    expect(mockOnNodeSelect).toHaveBeenCalledWith('apiVersion');
  });

  it('should expand and collapse object nodes', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath={null}
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    // Initially, child nodes should not be visible
    expect(screen.queryByText('name')).not.toBeInTheDocument();

    // Click expand button for metadata
    const expandButton = screen.getAllByRole('button')[0]; // First expand button
    fireEvent.click(expandButton);

    // Now child nodes should be visible
    expect(screen.getByText('name')).toBeInTheDocument();
  });

  it('should filter nodes based on search query', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath={null}
        searchQuery="api"
        onNodeSelect={mockOnNodeSelect}
      />
    );

    expect(screen.getByText('apiVersion')).toBeInTheDocument();
    expect(screen.queryByText('kind')).not.toBeInTheDocument();
  });

  it('should highlight selected node', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath="apiVersion"
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    const selectedNode = screen.getByText('apiVersion').closest('[data-testid="yaml-tree-node"]');
    expect(selectedNode).toHaveClass('bg-primary/20');
  });

  it('should display appropriate type icons', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath={null}
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    // Should have icons for different types
    expect(screen.getByText('apiVersion')).toBeInTheDocument();
    expect(screen.getByText('metadata')).toBeInTheDocument();
  });

  it('should handle empty nodes gracefully', () => {
    render(
      <YamlTreeView
        nodes={[]}
        selectedPath={null}
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    expect(screen.getByText('No YAML structure found')).toBeInTheDocument();
  });

  it('should handle search with no results', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath={null}
        searchQuery="nonexistent"
        onNodeSelect={mockOnNodeSelect}
      />
    );

    expect(screen.getByText('No nodes match "nonexistent"')).toBeInTheDocument();
  });

});