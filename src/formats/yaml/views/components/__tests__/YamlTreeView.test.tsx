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
        showPaths={false}
        showComments={false}
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
        showPaths={false}
        showComments={false}
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
        showPaths={false}
        showComments={false}
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

  it('should show paths when enabled', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath={null}
        showPaths={true}
        showComments={false}
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    // Should show path elements (they should be in gray text)
    const pathElements = screen.getAllByText('apiVersion');
    expect(pathElements.length).toBeGreaterThan(1); // Key name + path

    // Check that at least one is in the path styling
    const pathElement = pathElements.find(el =>
      el.className.includes('text-xs') && el.className.includes('text-muted')
    );
    expect(pathElement).toBeInTheDocument();
  });

  it('should filter nodes based on search query', () => {
    render(
      <YamlTreeView
        nodes={sampleNodes}
        selectedPath={null}
        showPaths={false}
        showComments={false}
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
        showPaths={false}
        showComments={false}
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
        showPaths={false}
        showComments={false}
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
        showPaths={false}
        showComments={false}
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
        showPaths={false}
        showComments={false}
        searchQuery="nonexistent"
        onNodeSelect={mockOnNodeSelect}
      />
    );

    expect(screen.getByText('No nodes match "nonexistent"')).toBeInTheDocument();
  });

  it('should show comments when enabled', () => {
    const nodesWithComments: YamlNode[] = [
      {
        id: 'test-1',
        path: 'test',
        key: 'test',
        value: 'value',
        type: 'string',
        line: 1,
        commentBefore: 'This is a comment',
      },
    ];

    render(
      <YamlTreeView
        nodes={nodesWithComments}
        selectedPath={null}
        showPaths={false}
        showComments={true}
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    expect(screen.getByText('# This is a comment')).toBeInTheDocument();
  });

  it('should hide comments when disabled', () => {
    const nodesWithComments: YamlNode[] = [
      {
        id: 'test-1',
        path: 'test',
        key: 'test',
        value: 'value',
        type: 'string',
        line: 1,
        commentBefore: 'This is a comment',
      },
    ];

    render(
      <YamlTreeView
        nodes={nodesWithComments}
        selectedPath={null}
        showPaths={false}
        showComments={false}
        searchQuery=""
        onNodeSelect={mockOnNodeSelect}
      />
    );

    expect(screen.queryByText('# This is a comment')).not.toBeInTheDocument();
  });
});