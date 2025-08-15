import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { IniToolbox } from '../components/IniToolbox';
import '@testing-library/jest-dom';

describe('IniToolbox', () => {
  const mockProps = {
    selectedSectionId: null,
    validationIssues: [],
    isValid: true,
    onShowValidation: jest.fn(),
    onSortKeysInSection: jest.fn(),
    onSortAllSections: jest.fn(),
    onStripAllComments: jest.fn(),
    onNormalizeSpacing: jest.fn(),
    onTrimWhitespace: jest.fn(),
    onEnsureFinalNewline: jest.fn(),
    onRemoveFinalNewline: jest.fn(),
    onConvertToJson: jest.fn(),
    onConvertToYaml: jest.fn(),
    sectionCount: 5,
    totalKeyCount: 25,
  };

  it('renders correctly', () => {
    const { getByText } = render(<IniToolbox {...mockProps} />);
    expect(getByText('Sort')).toBeInTheDocument();
    expect(getByText('Clean')).toBeInTheDocument();
    expect(getByText('Convert')).toBeInTheDocument();
    expect(getByText('Valid')).toBeInTheDocument();
    expect(getByText('5 sections')).toBeInTheDocument();
    expect(getByText('25 keys')).toBeInTheDocument();
  });

  it('calls onSortAllSections when "Sort All Sections" is clicked', () => {
    const { getByText } = render(<IniToolbox {...mockProps} />);
    fireEvent.click(getByText('Sort')); // Open the sort menu
    fireEvent.click(getByText('Sort All Sections'));
    expect(mockProps.onSortAllSections).toHaveBeenCalled();
  });

  it('calls onStripAllComments when "Strip All Comments" is clicked', () => {
    const { getByText } = render(<IniToolbox {...mockProps} />);
    fireEvent.click(getByText('Clean')); // Open the clean menu
    fireEvent.click(getByText('Strip All Comments'));
    expect(mockProps.onStripAllComments).toHaveBeenCalled();
  });

  it('calls onConvertToJson when "Convert to JSON" is clicked', () => {
    const { getByText } = render(<IniToolbox {...mockProps} />);
    fireEvent.click(getByText('Convert')); // Open the convert menu
    fireEvent.click(getByText('Convert to JSON'));
    expect(mockProps.onConvertToJson).toHaveBeenCalled();
  });

  it('calls onShowValidation when the validation button is clicked', () => {
    const { getByText } = render(<IniToolbox {...mockProps} />);
    fireEvent.click(getByText('Valid'));
    expect(mockProps.onShowValidation).toHaveBeenCalled();
  });
});
