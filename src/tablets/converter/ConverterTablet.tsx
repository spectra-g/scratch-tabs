import React, { useState } from "react";
import { Tablet, TabletState } from "../types";
import { ArrowUpDown } from "lucide-react";
import { ConverterSection } from "./components/ConverterSection";
import { EncodeDecode } from "./sections/EncodeDecode";
import { Hashing } from "./sections/Hashing";
import { NumberConversion } from "./sections/NumberConversion";
import { TextConversion } from "./sections/TextConversion";
import { DateTimeConversion } from "./sections/DateTimeConversion";
import { ColorConversion } from "./sections/ColorConversion";
import { NetworkingConversion } from "./sections/NetworkingConversion";

interface ConverterState extends TabletState {
  type: "converter";
  data: {
    activeSection: string;
    sectionData: {
      "encode-decode": { inputs: Record<string, string> };
      hashing: { input: string };
      number: { inputs: Record<string, string> };
      text: { inputs: Record<string, string> };
      datetime: { inputs: Record<string, string> };
      color: { inputs: Record<string, string> };
      networking: { inputs: Record<string, string> };
    };
  };
}

const sections = [
  { id: "encode-decode", label: "Encode / Decode", component: EncodeDecode },
  { id: "hashing", label: "Hashing", component: Hashing },
  { id: "number", label: "Number", component: NumberConversion },
  { id: "text", label: "Text", component: TextConversion },
  { id: "datetime", label: "Date & Time", component: DateTimeConversion },
  { id: "color", label: "Color", component: ColorConversion },
  { id: "networking", label: "Networking", component: NetworkingConversion },
];

const DEFAULT_SECTION_DATA: ConverterState["data"]["sectionData"] = {
  "encode-decode": { inputs: {} },
  hashing: { input: "" },
  number: { inputs: {} },
  text: { inputs: {} },
  datetime: { inputs: {} },
  color: { inputs: {} },
  networking: { inputs: {} },
};

/**
 * Ensures the state has valid sectionData structure for backward compatibility.
 * Migrates old states that are missing sectionData or individual sections.
 */
function ensureValidSectionData(
  state: ConverterState,
): ConverterState["data"]["sectionData"] {
  if (!state.data?.sectionData) {
    return { ...DEFAULT_SECTION_DATA };
  }

  // Create a properly typed result object
  const result: ConverterState["data"]["sectionData"] = {
    "encode-decode": state.data.sectionData["encode-decode"] || DEFAULT_SECTION_DATA["encode-decode"],
    hashing: state.data.sectionData.hashing || DEFAULT_SECTION_DATA.hashing,
    number: state.data.sectionData.number || DEFAULT_SECTION_DATA.number,
    text: state.data.sectionData.text || DEFAULT_SECTION_DATA.text,
    datetime: state.data.sectionData.datetime || DEFAULT_SECTION_DATA.datetime,
    color: state.data.sectionData.color || DEFAULT_SECTION_DATA.color,
    networking: state.data.sectionData.networking || DEFAULT_SECTION_DATA.networking,
  };

  return result;
}

// Separate React component for the converter UI
const ConverterUI: React.FC<{
  state: ConverterState;
  onChange: (state: ConverterState) => void;
}> = ({ state, onChange }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSectionChange = (sectionId: string) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        activeSection: sectionId,
      },
    });
  };

  const handleSectionDataChange = (sectionId: string, data: any) => {
    onChange({
      ...state,
      data: {
        ...state.data,
        sectionData: {
          ...state.data.sectionData,
          [sectionId]: data,
        },
      },
    });
  };

  const activeSection = sections.find(
    (section) => section.id === state.data.activeSection,
  );
  const ActiveComponent = activeSection?.component;

  // Defensive check: Ensure sectionData exists before accessing
  // This is a safety net in case deserialization migration didn't run
  if (!state.data.sectionData) {
    onChange({
      ...state,
      data: {
        ...state.data,
        sectionData: { ...DEFAULT_SECTION_DATA },
      },
    });
    return (
      <div className="flex items-center justify-center h-full text-secondary">
        Initializing converter...
      </div>
    );
  }

  const sectionData =
    state.data.sectionData[
    state.data.activeSection as keyof typeof state.data.sectionData
    ];

  return (
    <div className="h-full bg-surface flex">
      {/* Left Sidebar - Section Navigation */}
      <div className="w-64 border-r border-base flex flex-col">
        <div className="p-4 border-b border-base">
          <div className="flex items-center space-x-3 mb-4">
            <ArrowUpDown className="text-secondary" size={24} />
            <h2 className="text-xl font-semibold text-main">Converter</h2>
          </div>

          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
            placeholder="Search converters..."
            className="input-themed w-full px-3 py-1.5 text-sm"
          />
        </div>

        {/* Section List */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="p-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`
                  w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                  ${state.data.activeSection === section.id
                    ? "bg-element-active text-primary"
                    : "text-secondary hover:bg-element-hover"
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
            <ActiveComponent
              searchQuery={searchQuery}
              data={sectionData as any}
              onDataChange={(data: any) =>
                handleSectionDataChange(state.data.activeSection, data)
              }
            />
          </ConverterSection>
        )}
      </div>
    </div>
  );
};

export const ConverterTablet: Tablet = {
  id: "converter",
  label: "Converter",
  keywords: ["convert", "encode", "decode", "hash", "transform", "format"],

  createInitialState(): ConverterState {
    return {
      type: "converter",
      data: {
        activeSection: sections[0].id,
        sectionData: { ...DEFAULT_SECTION_DATA },
      },
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    const parsed = JSON.parse(json) as ConverterState;

    // Handle corrupted state where data is null or missing
    if (!parsed.data) {
      parsed.data = {
        activeSection: sections[0].id,
        sectionData: { ...DEFAULT_SECTION_DATA },
      };
    } else {
      // Migrate old state format to ensure all sections exist
      parsed.data.sectionData = ensureValidSectionData(parsed);
    }

    return parsed;
  },

  render(state: ConverterState, onChange) {
    return <ConverterUI state={state} onChange={onChange} />;
  },
};
