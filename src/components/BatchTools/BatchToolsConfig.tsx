import React, { useState } from 'react';
import { TransformationConfig } from '../../stores/batchToolsStore';
import { ChevronDown, ChevronRight, Sparkles, Type, Tag, Link, Settings, Copy, Search, RotateCcw, SortAsc } from 'lucide-react';

interface BatchToolsConfigProps {
  config: TransformationConfig;
  onChange: (updates: Partial<TransformationConfig>) => void;
}

interface ConfigSectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ title, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        <span className="text-base font-medium text-gray-200">{title}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-2 space-y-3 px-3">
          {children}
        </div>
      )}
    </div>
  );
};

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, checked, onChange, description }) => (
  <label className="flex items-start space-x-2 cursor-pointer group">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors"
    />
    <div>
      <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">{label}</span>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  </label>
);

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, value, onChange, placeholder, description }) => (
  <div>
    <label className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:border-transparent transition-colors"
    />
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  description?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, min, max, description }) => (
  <div>
    <label className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      min={min}
      max={max}
      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-sm text-gray-200 hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:border-transparent transition-colors"
    />
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  description?: string;
}

const Select: React.FC<SelectProps> = ({ label, value, onChange, options, description }) => (
  <div>
    <label className="block text-xs font-medium text-gray-300 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-sm text-gray-200 hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:border-transparent transition-colors cursor-pointer"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-gray-700 text-gray-200">
          {option.label}
        </option>
      ))}
    </select>
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

export const BatchToolsConfig: React.FC<BatchToolsConfigProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-4">
      {/* Whitespace & Cleanup */}
      <ConfigSection title={<div className="flex items-center space-x-2"><Sparkles className="w-4 h-4 text-blue-400" /><span>Whitespace & Cleanup</span></div>} defaultExpanded>
        <Checkbox
          label="Trim whitespace"
          checked={!!config.trim}
          onChange={(checked) => onChange({ trim: checked })}
          description="Remove leading and trailing whitespace from each line"
        />
        
        <Select
          label="Remove extra whitespace"
          value={config.removeExtraWhitespace || 'false'}
          onChange={(value) => onChange({ removeExtraWhitespace: value === 'false' ? false : value as any })}
          options={[
            { value: 'false', label: 'No change' },
            { value: 'preserve-single', label: 'Preserve single spaces' },
            { value: 'remove-all', label: 'Remove all whitespace' },
          ]}
        />

        <Checkbox
          label="Remove extra blank lines"
          checked={!!config.removeExtraBlankLines}
          onChange={(checked) => onChange({ removeExtraBlankLines: checked })}
          description="Collapse multiple consecutive blank lines into one"
        />
        
        <Checkbox
          label="Remove all blank lines"
          checked={!!config.removeAllBlankLines}
          onChange={(checked) => onChange({ removeAllBlankLines: checked })}
          description="Remove all empty lines completely"
        />
      </ConfigSection>

      {/* Sorting & Line Order */}
      <ConfigSection title={<div className="flex items-center space-x-2"><SortAsc className="w-4 h-4 text-blue-400" /><span>Sorting & Line Order</span></div>}>
        <Select
          label="Sort lines"
          value={config.sortLines || 'false'}
          onChange={(value) => onChange({ sortLines: value === 'false' ? false : value as any })}
          options={[
            { value: 'false', label: 'No sorting' },
            { value: 'asc', label: 'A to Z' },
            { value: 'desc', label: 'Z to A' },
            { value: 'natural', label: 'Natural sort (file1, file2, file10)' },
            { value: 'numeric-asc', label: 'Numeric ascending' },
            { value: 'numeric-desc', label: 'Numeric descending' },
            { value: 'length', label: 'Sort by line length' },
          ]}
        />

        <Checkbox
          label="Reverse lines"
          checked={!!config.reverseLines}
          onChange={(checked) => onChange({ reverseLines: checked })}
          description="Reverse the order of all lines"
        />

        <Checkbox
          label="Remove duplicates"
          checked={!!config.removeDuplicates}
          onChange={(checked) => onChange({ removeDuplicates: checked })}
          description="Remove duplicate lines (keep first occurrence)"
        />

        <Checkbox
          label="Shuffle lines randomly"
          checked={!!config.shuffleLines}
          onChange={(checked) => onChange({ shuffleLines: checked })}
          description="Randomize the order of lines"
        />
      </ConfigSection>

      {/* Case Conversion */}
      <ConfigSection title={<div className="flex items-center space-x-2"><Type className="w-4 h-4 text-blue-400" /><span>Case Conversion</span></div>}>
        <Select
          label="Case transformation"
          value={config.caseTransform || 'false'}
          onChange={(value) => onChange({ caseTransform: value === 'false' ? false : value as any })}
          options={[
            { value: 'false', label: 'No change' },
            { value: 'upper', label: 'UPPERCASE' },
            { value: 'lower', label: 'lowercase' },
            { value: 'title', label: 'Title Case' },
            { value: 'sentence', label: 'Sentence case' },
            { value: 'camel', label: 'camelCase' },
            { value: 'pascal', label: 'PascalCase' },
            { value: 'kebab', label: 'kebab-case' },
            { value: 'snake', label: 'snake_case' },
            { value: 'invert', label: 'InVeRt CaSe' },
            { value: 'alternating', label: 'aLtErNaTiNg CaSe' },
          ]}
        />
      </ConfigSection>

      {/* Prefix/Suffix & Numbering */}
      <ConfigSection title={<div className="flex items-center space-x-2"><Tag className="w-4 h-4 text-blue-400" /><span>Prefix/Suffix & Numbering</span></div>}>
        <TextInput
          label="Add prefix"
          value={config.addPrefix || ''}
          onChange={(value) => onChange({ addPrefix: value || undefined })}
          placeholder="Enter prefix text..."
          description="Text to add at the beginning of each line"
        />

        <TextInput
          label="Add suffix"
          value={config.addSuffix || ''}
          onChange={(value) => onChange({ addSuffix: value || undefined })}
          placeholder="Enter suffix text..."
          description="Text to add at the end of each line"
        />

        <Select
          label="Number lines"
          value={config.numberLines === false || config.numberLines === undefined ? 'none' : config.numberLines}
          onChange={(value) => {
            const newValue = value === 'none' ? false : value as 'numeric' | 'roman' | 'alpha';
            onChange({ numberLines: newValue });
          }}
          options={[
            { value: 'none', label: 'No numbering' },
            { value: 'numeric', label: 'Numeric (1., 2., 3., ...)' },
            { value: 'roman', label: 'Roman (I., II., III., ...)' },
            { value: 'alpha', label: 'Alphabetic (A., B., C., ...)' },
          ]}
          description="Add line numbers in different formats"
        />
      </ConfigSection>

      {/* Join/Split Lines */}
      <ConfigSection title={<div className="flex items-center space-x-2"><Link className="w-4 h-4 text-blue-400" /><span>Join / Split Lines</span></div>}>
        <TextInput
          label="Join lines with separator"
          value={config.joinLines || ''}
          onChange={(value) => onChange({ joinLines: value || false })}
          placeholder="Enter separator (e.g., ', ', ' | ')"
          description="Join all lines into one with the specified separator"
        />

        <TextInput
          label="Split lines by delimiter"
          value={config.splitLines || ''}
          onChange={(value) => onChange({ splitLines: value || false })}
          placeholder="Enter delimiter (e.g., ',', ';')"
          description="Split each line by the specified delimiter"
        />
      </ConfigSection>

      {/* Indentation */}
      <ConfigSection title={<div className="flex items-center space-x-2"><Settings className="w-4 h-4 text-blue-400" /><span>Indentation</span></div>}>
        <div className="space-y-3">
          <Select
            label="Indentation action"
            value={config.changeIndentation?.action || 'none'}
            onChange={(value) => {
              if (value === 'none') {
                onChange({ changeIndentation: false });
              } else {
                onChange({
                  changeIndentation: {
                    action: value as 'add' | 'remove',
                    amount: config.changeIndentation?.amount || 1,
                    type: config.changeIndentation?.type || 'spaces',
                  },
                });
              }
            }}
            options={[
              { value: 'none', label: 'No change' },
              { value: 'add', label: 'Add indentation' },
              { value: 'remove', label: 'Remove indentation' },
            ]}
          />

          {config.changeIndentation && (
            <>
              <NumberInput
                label="Amount"
                value={config.changeIndentation.amount}
                onChange={(amount) =>
                  onChange({
                    changeIndentation: { ...config.changeIndentation!, amount },
                  })
                }
                min={1}
                max={20}
                description="Number of tabs or spaces"
              />

              <Select
                label="Type"
                value={config.changeIndentation.type}
                onChange={(type) =>
                  onChange({
                    changeIndentation: { ...config.changeIndentation!, type: type as 'tabs' | 'spaces' },
                  })
                }
                options={[
                  { value: 'spaces', label: 'Spaces' },
                  { value: 'tabs', label: 'Tabs' },
                ]}
              />
            </>
          )}
        </div>
      </ConfigSection>

      {/* Duplicate / Pad */}
      <ConfigSection title={<div className="flex items-center space-x-2"><Copy className="w-4 h-4 text-blue-400" /><span>Duplicate / Pad</span></div>}>
        <NumberInput
          label="Duplicate each line N times"
          value={config.duplicateLines || 1}
          onChange={(value) => onChange({ duplicateLines: value > 1 ? value : false })}
          min={1}
          max={100}
          description="Set to 1 for no duplication"
        />

        <div className="space-y-3">
          <Checkbox
            label="Pad lines to fixed length"
            checked={!!config.padLines}
            onChange={(checked) => {
              if (checked) {
                onChange({
                  padLines: {
                    length: 20,
                    align: 'left',
                    char: ' ',
                  },
                });
              } else {
                onChange({ padLines: false });
              }
            }}
          />

          {config.padLines && (
            <>
              <NumberInput
                label="Length"
                value={config.padLines.length}
                onChange={(length) =>
                  onChange({
                    padLines: { ...config.padLines!, length },
                  })
                }
                min={1}
                max={200}
                description="Target line length"
              />

              <Select
                label="Alignment"
                value={config.padLines.align}
                onChange={(align) =>
                  onChange({
                    padLines: { ...config.padLines!, align: align as 'left' | 'right' | 'center' },
                  })
                }
                options={[
                  { value: 'left', label: 'Left (pad right)' },
                  { value: 'right', label: 'Right (pad left)' },
                  { value: 'center', label: 'Center' },
                ]}
              />

              <TextInput
                label="Padding character"
                value={config.padLines.char}
                onChange={(char) =>
                  onChange({
                    padLines: { ...config.padLines!, char: char || ' ' },
                  })
                }
                placeholder="Enter padding character"
                description="Character to use for padding"
              />
            </>
          )}
        </div>
      </ConfigSection>

      {/* Filtering & Selection */}
      <ConfigSection title={<div className="flex items-center space-x-2"><Search className="w-4 h-4 text-blue-400" /><span>Filtering & Selection</span></div>}>
        <TextInput
          label="Filter by RegEx"
          value={config.filterByRegex || ''}
          onChange={(value) => onChange({ filterByRegex: value || false })}
          placeholder="Enter regular expression..."
          description="Keep only lines matching the regex pattern"
        />

        <div className="space-y-3">
          <Checkbox
            label="Filter by keyword"
            checked={!!config.filterByKeyword}
            onChange={(checked) => {
              if (checked) {
                onChange({
                  filterByKeyword: {
                    keyword: '',
                    action: 'keep',
                    position: 'contains',
                  },
                });
              } else {
                onChange({ filterByKeyword: false });
              }
            }}
          />

          {config.filterByKeyword && (
            <>
              <TextInput
                label="Keyword"
                value={config.filterByKeyword.keyword}
                onChange={(keyword) =>
                  onChange({
                    filterByKeyword: { ...config.filterByKeyword!, keyword },
                  })
                }
                placeholder="Enter keyword to filter by..."
              />

              <Select
                label="Action"
                value={config.filterByKeyword.action}
                onChange={(action) =>
                  onChange({
                    filterByKeyword: { ...config.filterByKeyword!, action: action as 'keep' | 'remove' },
                  })
                }
                options={[
                  { value: 'keep', label: 'Keep matching lines' },
                  { value: 'remove', label: 'Remove matching lines' },
                ]}
              />

              <Select
                label="Position"
                value={config.filterByKeyword.position || 'contains'}
                onChange={(position) =>
                  onChange({
                    filterByKeyword: { ...config.filterByKeyword!, position: position as 'contains' | 'starts' | 'ends' },
                  })
                }
                options={[
                  { value: 'contains', label: 'Contains keyword' },
                  { value: 'starts', label: 'Starts with keyword' },
                  { value: 'ends', label: 'Ends with keyword' },
                ]}
              />
            </>
          )}
        </div>

        <NumberInput
          label="Keep first N lines"
          value={config.keepFirstNLines || 0}
          onChange={(value) => onChange({ keepFirstNLines: value > 0 ? value : false })}
          min={0}
          max={10000}
          description="Set to 0 to keep all lines"
        />

        <NumberInput
          label="Keep last N lines"
          value={config.keepLastNLines || 0}
          onChange={(value) => onChange({ keepLastNLines: value > 0 ? value : false })}
          min={0}
          max={10000}
          description="Set to 0 to keep all lines"
        />
      </ConfigSection>

      {/* Other Formatting */}
      <ConfigSection title={<div className="flex items-center space-x-2"><RotateCcw className="w-4 h-4 text-blue-400" /><span>Other Formatting</span></div>}>
        <Select
          label="Convert tabs/spaces"
          value={config.convertTabsSpaces || 'false'}
          onChange={(value) => onChange({ convertTabsSpaces: value === 'false' ? false : value as any })}
          options={[
            { value: 'false', label: 'No change' },
            { value: 'tabs-to-spaces', label: 'Tabs to spaces' },
            { value: 'spaces-to-tabs', label: 'Spaces to tabs' },
          ]}
        />

        <Select
          label="Normalize line endings"
          value={config.normalizeLineEndings || 'false'}
          onChange={(value) => onChange({ normalizeLineEndings: value === 'false' ? false : value as any })}
          options={[
            { value: 'false', label: 'No change' },
            { value: 'lf', label: 'Unix (LF)' },
            { value: 'crlf', label: 'Windows (CRLF)' },
          ]}
        />

        <NumberInput
          label="Wrap lines at width"
          value={config.wrapLines || 0}
          onChange={(value) => onChange({ wrapLines: value > 0 ? value : false })}
          min={0}
          max={500}
          description="Set to 0 for no wrapping"
        />
      </ConfigSection>

      {/* Advanced Transformations */}
      <ConfigSection title={<div className="flex items-center space-x-2"><Settings className="w-4 h-4 text-purple-400" /><span>Advanced Transformations</span></div>}>
        <div className="space-y-3">
          <Checkbox
            label="Find & Replace with Regex"
            checked={!!config.findReplaceRegex}
            onChange={(checked) => {
              if (checked) {
                onChange({
                  findReplaceRegex: {
                    find: '',
                    replace: '',
                    flags: 'g',
                  },
                });
              } else {
                onChange({ findReplaceRegex: false });
              }
            }}
            description="Use regex capture groups ($1, $2) in replacement"
          />

          {config.findReplaceRegex && (
            <>
              <TextInput
                label="Find (RegEx)"
                value={config.findReplaceRegex.find}
                onChange={(find) =>
                  onChange({
                    findReplaceRegex: { ...config.findReplaceRegex!, find },
                  })
                }
                placeholder="(\w+):\s*(\d+)"
                description="Use parentheses () to create capture groups"
              />

              <TextInput
                label="Replace"
                value={config.findReplaceRegex.replace}
                onChange={(replace) =>
                  onChange({
                    findReplaceRegex: { ...config.findReplaceRegex!, replace },
                  })
                }
                placeholder="Value: $2, Key: $1"
                description="Use $1, $2, etc. to reference capture groups"
              />

              <TextInput
                label="Flags"
                value={config.findReplaceRegex.flags || 'g'}
                onChange={(flags) =>
                  onChange({
                    findReplaceRegex: { ...config.findReplaceRegex!, flags },
                  })
                }
                placeholder="g"
                description="Regex flags (g=global, i=case-insensitive, m=multiline)"
              />
            </>
          )}
        </div>

        <div className="space-y-3">
          <Checkbox
            label="JavaScript Snippet"
            checked={!!config.javascriptSnippet}
            onChange={(checked) => {
              if (checked) {
                onChange({
                  javascriptSnippet: 'return lines.filter(line => line.length > 10).join("\\n");',
                });
              } else {
                onChange({ javascriptSnippet: false });
              }
            }}
            description="Write custom JavaScript to transform text"
          />

          {config.javascriptSnippet && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">JavaScript Code</label>
                <textarea
                  value={config.javascriptSnippet}
                  onChange={(e) => onChange({ javascriptSnippet: e.target.value })}
                  placeholder="return lines.filter(line => line.length > 10).join('\\n');"
                  className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:border-transparent transition-colors font-mono"
                  rows={4}
                />
                <div className="mt-1 text-xs text-gray-400">
                  <p className="mb-1">Available variables:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                    <li><code className="text-blue-400">text</code> - full text content</li>
                    <li><code className="text-blue-400">lines</code> - array of lines</li>
                    <li><code className="text-blue-400">selection</code> - selected text</li>
                  </ul>
                  <p className="mt-1">Return a string or array of lines</p>
                </div>
              </div>
            </>
          )}
        </div>
      </ConfigSection>
    </div>
  );
};