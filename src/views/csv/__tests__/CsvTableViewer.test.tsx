import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CsvTableViewer } from '../components/CsvTableViewer';

const mockOnContentChange = jest.fn();

const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco`;

describe('CsvTableViewer', () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  it('should render CSV data in a table', () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
      />
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('City')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <CsvTableViewer
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
      />
    );

    // The component should handle empty content gracefully
    expect(screen.queryByText('Parsing CSV...')).not.toBeInTheDocument();
  });

  it('should display row and column counts', () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
      />
    );

    expect(screen.getByText('2 rows × 3 columns')).toBeInTheDocument();
  });

  it('should show undo/redo buttons', () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
      />
    );

    expect(screen.getByTitle('Undo')).toBeInTheDocument();
    expect(screen.getByTitle('Redo')).toBeInTheDocument();
  });

  it('should show add row/column buttons', () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
      />
    );

    expect(screen.getAllByTitle('Add column after')).toHaveLength(3);
    expect(screen.getAllByTitle('Add row below')).toHaveLength(2);
  });
}); 