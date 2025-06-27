import React from 'react';
import { TransformationConfig } from '../../stores/batchToolsStore';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface BatchToolsConfigProps {
  config: TransformationConfig;
  onChange: (updates: Partial<TransformationConfig>) => void;
}

interface ConfigSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ title, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="mb-4 border border-gray-700 rounded-lg">
      <button
        className="flex items-center justify-between w-full p-3 text-left hover:bg-gray-750 rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-medium text-gray-200">{title}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 border-t border-gray-700 space-y-3">
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
  <label className="flex items-start space-x-2 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
    />
    <div>
      <span className="text-gray-200">{label}</span>
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
    <label className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    <label className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      min={min}
      max={max}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    <label className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
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
      <ConfigSection title="🧹 Whitespace & Cleanup" defaultExpanded>
        <Checkbox
          label="Trim whitespace"
          checked={!!config.trim}
          onChange={(checked) => onChange({ trim: checked })}
          description="Remove leading and trailing whitespace from each line"
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Remove extra whitespace</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="whitespace"
                checked={config.removeExtraWhitespace === false}
                onChange={() => onChange({ removeExtraWhitespace: false })}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
              />
              <span className="text-gray-200">None</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="whitespace"
                checked={config.removeExtraWhitespace === 'preserve-single'}
                onChange={() => onChange({ removeExtraWhitespace: 'preserve-single' })}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
              />
              <span className="text-gray-200">Preserve single space</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="whitespace"
                checked={config.removeExtraWhitespace === 'remove-all'}
                onChange={() => onChange({ removeExtraWhitespace: 'remove-all' })}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
              />
              <span className="text-gray-200">Remove all whitespace</span>
            </label>
          </div>
        </div>

        <Checkbox
          label="Remove extra blank lines"
          checked={!!config.removeExtraBlankLines}
          onChange={(checked) => onChange({ removeExtraBlankLines: checked })}
          description="Keep only one blank line between content"
        />
        
        <Checkbox
          label="Remove all blank lines"
          checked={!!config.removeAllBlankLines}
          onChange={(checked) => onChange({ removeAllBlankLines: checked })}
          description="Remove all empty lines"
        />
      </ConfigSection>

      {/* Sorting & Line Order */}
      <ConfigSection title="🔤 Sorting & Line Order">
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
      <ConfigSection title="🔠 Case Conversion">
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
      <ConfigSection title="📝 Prefix/Suffix & Numbering">
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
      <ConfigSection title="🔗 Join / Split Lines">
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
      <ConfigSection title="🔧 Indentation">
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
      <ConfigSection title="📑 Duplicate / Pad">
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
      <ConfigSection title="🔍 Filtering & Selection">
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
                placeholder="Enter keyword..."
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
      <ConfigSection title="🧼 Other Formatting">
        <Select
          label="Convert tabs/spaces"
          value={config.convertTabsSpaces || 'false'}
          onChange={(value) => onChange({ convertTabsSpaces: value === 'false' ? false : value as any })}
          options={[
            { value: 'false', label: 'No conversion' },
            { value: 'tabs-to-spaces', label: 'Tabs to spaces' },
            { value: 'spaces-to-tabs', label: 'Spaces to tabs' },
          ]}
          description="Convert between tabs and spaces (4 spaces = 1 tab)"
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
    </div>
  );
};