import React, { useState } from 'react';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { MenuSection } from './MenuSection';
import { MenuItem } from './MenuItem';
import { useJsonOperations } from '../hooks/useJsonOperations';
import { useJsonConversions } from '../hooks/useJsonConversions';
import { useJsonTransformations } from '../hooks/useJsonTransformations';
import { useJsonValidation } from '../hooks/useJsonValidation';
import * as monaco from 'monaco-editor';
import { Tab } from '../../../types';

interface MenuProps {
  editor: monaco.editor.IStandaloneCodeEditor;
  onClose: () => void;
  addTab: (tab: Tab) => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
}

export const Menu: React.FC<MenuProps> = ({ editor, onClose, addTab, buttonRef }) => {
  const menuRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, onClose);
  const [ posLeft, ] = useState<number>(buttonRef?.current?.getBoundingClientRect()?.left ? buttonRef.current.getBoundingClientRect().left : 180)
  const {
    handleFormat,
    handleMinify,
    handleSortKeys,
    handleFlatten,
    handleUnflatten,
    handleRemoveEmpty,
    handleStringify,
    handlePathFinder,
    handlePathEvaluator
  } = useJsonOperations(editor, addTab);

  const {
    handleToCamelCase,
    handleToSnakeCase,
    handleToKebabCase
  } = useJsonTransformations(editor);

  const {
    handleToJava,
    handleToTypeScript,
    handleToPython,
    handleToGo,
    handleToCSharp,
    handleToCsv,
    handleToYaml,
    handleToXml
  } = useJsonConversions(editor, addTab);

  const {
    handleValidateSchema,
    handleGenerateSchema
  } = useJsonValidation(editor, addTab);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 overflow-y-auto custom-scrollbar"
      style={{
        bottom: '28px', left: posLeft+'px', width: '250px', height: '300px'
      }}
      onClick={(e) => e.stopPropagation()} // Prevent clicks inside closing the menu
    >
      <MenuSection>
        <MenuItem onClick={handleFormat}>Format</MenuItem>
        <MenuItem onClick={handleMinify}>Minify</MenuItem>
        <MenuItem onClick={handleSortKeys}>Sort Keys</MenuItem>
        <MenuItem onClick={handleFlatten}>Flatten JSON</MenuItem>
        <MenuItem onClick={handleUnflatten}>Unflatten JSON</MenuItem>
        <MenuItem onClick={handleRemoveEmpty}>Remove Null/Empty Values</MenuItem>
        <MenuItem onClick={handleStringify}>Stringify</MenuItem>
      </MenuSection>

      <MenuSection>
        <MenuItem onClick={handlePathFinder}>Path Finder</MenuItem>
        <MenuItem onClick={handlePathEvaluator}>Path Evaluator</MenuItem>
      </MenuSection>

      <MenuSection>
        <MenuItem onClick={handleToCamelCase}>Convert keys to camelCase</MenuItem>
        <MenuItem onClick={handleToSnakeCase}>Convert keys to snake_case</MenuItem>
        <MenuItem onClick={handleToKebabCase}>Convert keys to kebab-case</MenuItem>
      </MenuSection>

      <MenuSection>
        <MenuItem onClick={handleToJava}>JSON to Java</MenuItem>
        <MenuItem onClick={handleToTypeScript}>JSON to TypeScript</MenuItem>
        <MenuItem onClick={handleToPython}>JSON to Python</MenuItem>
        <MenuItem onClick={handleToGo}>JSON to Go</MenuItem>
        <MenuItem onClick={handleToCSharp}>JSON to C#</MenuItem>
        <MenuItem onClick={handleToCsv}>JSON to CSV/TSV</MenuItem>
        <MenuItem onClick={handleToYaml}>JSON to YAML</MenuItem>
        <MenuItem onClick={handleToXml}>JSON to XML</MenuItem>
      </MenuSection>

      <MenuSection>
        <MenuItem onClick={handleValidateSchema}>Validate against Schema</MenuItem>
        <MenuItem onClick={handleGenerateSchema}>Generate Schema</MenuItem>
      </MenuSection>
    </div>
  );
};