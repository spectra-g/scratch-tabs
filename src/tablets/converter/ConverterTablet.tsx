import React, { useState } from 'react';
import { Tablet, TabletState } from '../types';
import { ArrowUpDown } from 'lucide-react';
import { ConverterSection } from './components/ConverterSection';
import { EncodeDecode } from './sections/EncodeDecode';
import { Hashing } from './sections/Hashing';
import { NumberConversion } from './sections/NumberConversion';
import { TextConversion } from './sections/TextConversion';
import { DateTimeConversion } from './sections/DateTimeConversion';
import { ColorConversion } from './sections/ColorConversion';
import { NetworkingConversion } from './sections/NetworkingConversion';

interface ConverterState extends TabletState {
  type: 'converter';
  data: {
    activeSection: string;
  };
}

const sections = [
  { id: 'encode-decode', label: 'Encode / Decode', component: EncodeDecode },
  { id: 'hashing', label: 'Hashing', component: Hashing },
  { id: 'number', label: 'Number', component: NumberConversion },
  { id: 'text', label: 'Text', component: TextConversion },
  { id: 'datetime', label: 'Date & Time', component: DateTimeConversion },
  { id: 'color', label: 'Color', component: ColorConversion },
  { id: 'networking', label: 'Networking', component: NetworkingConversion },
];

export const ConverterTablet: Tablet = {
  id: 'converter',
  label: 'Converter',
  keywords: ['convert', 'encode', 'decode', 'hash', 'transform', 'format'],

  createInitialState(): ConverterState {
    return {
      type: 'converter',
      data: {
        activeSection: sections[0].id
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    return JSON.parse(json);
  },

  render(state: ConverterState, onChange) {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSectionChange = (sectionId: string) => {
      onChange({
        ...state,
        data: {
          ...state.data,
          activeSection: sectionId
        }
      });
    };

    const activeSection = sections.find(section => section.id === state.data.activeSection);
    const ActiveComponent = activeSection?.component;

    return (
      <div className="h-full bg-gray-900 flex">
        {/* Left Sidebar - Section Navigation */}
        <div className="w-64 border-r border-gray-700/50 flex flex-col">
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-3 mb-4">
              <ArrowUpDown className="text-gray-400" size={24} />
              <h2 className="text-xl font-semibold text-gray-100">Converter</h2>
            </div>

            {/* Search */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
              placeholder="Search converters..."
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500"
            />
          </div>

          {/* Section List */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="p-2">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                    ${state.data.activeSection === section.id
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-300 hover:bg-gray-800/50'
                    }
                  `}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {ActiveComponent && (
            <ConverterSection>
              <ActiveComponent searchQuery={searchQuery} />
            </ConverterSection>
          )}
        </div>
      </div>
    );
  }
};