import React, { useCallback, useEffect } from 'react';
import { LoremIpsumState, LoremIpsumSettings } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { OutputArea } from './components/OutputArea';
import { generateContent, validateOptions, getLanguageForMode } from './utils/generator';
import { useTabletTabCreation } from '../bridge';
import { useTabletContext } from '../bridge/context';

interface LoremIpsumTabletProps {
  state: LoremIpsumState;
  onChange: (newState: LoremIpsumState) => void;
}

export const LoremIpsumTablet: React.FC<LoremIpsumTabletProps> = ({
  state,
  onChange,
}) => {
  const { createBackgroundTab } = useTabletTabCreation();
  const { tabId } = useTabletContext();

  const updateSettings = useCallback((updates: Partial<LoremIpsumSettings>) => {
    const newSettings = { ...state.settings, ...updates };

    // Update settings first
    onChange({
      ...state,
      settings: newSettings,
    });

    if (state.generatedOutput && !state.isGenerating) {
      const newState = { ...state, settings: newSettings };

      setTimeout(() => {
        try {
          const content = generateContent({
            mode: newSettings.mode,
            theme: newSettings.theme,
            count: newSettings.count,
            unit: newSettings.outputUnit,
            customSource: newSettings.customSourceText,
            startWithLorem: newSettings.startWithLorem,
          });

          onChange({
            ...newState,
            generatedOutput: content,
            isGenerating: false,
            lastGeneratedAt: Date.now(),
          });
        } catch (error) {
          onChange({
            ...newState,
            generatedOutput: 'Error generating content. Please try again.',
            isGenerating: false,
          });
        }
      }, 50);
    }
  }, [state, onChange]);

  const generateNewContent = useCallback(() => {
    const validationError = validateOptions({
      mode: state.settings.mode,
      theme: state.settings.theme,
      count: state.settings.count,
      unit: state.settings.outputUnit,
      customSource: state.settings.customSourceText,
      startWithLorem: state.settings.startWithLorem,
    });

    if (validationError) {
      return;
    }

    onChange({
      ...state,
      isGenerating: true,
    });

    setTimeout(() => {
      try {
        const content = generateContent({
          mode: state.settings.mode,
          theme: state.settings.theme,
          count: state.settings.count,
          unit: state.settings.outputUnit,
          customSource: state.settings.customSourceText,
          startWithLorem: state.settings.startWithLorem,
        });

        onChange({
          ...state,
          generatedOutput: content,
          isGenerating: false,
          lastGeneratedAt: Date.now(),
        });
      } catch (error) {
        onChange({
          ...state,
          generatedOutput: 'Error generating content. Please try again.',
          isGenerating: false,
        });
      }
    }, 100);
  }, [state, onChange]);

  const handleCreateNewTab = useCallback(() => {

    if (!state.generatedOutput) {
      return;
    }

    const language = getLanguageForMode(state.settings.mode);
    const modeLabels = {
      text: 'Text',
      html: 'HTML',
      markdown: 'Markdown',
      json: 'JSON',
      custom: 'Custom'
    };

    createBackgroundTab(
      `Generated ${modeLabels[state.settings.mode]} Content`,
      state.generatedOutput,
      language,
      tabId
    );
  }, [state.generatedOutput, state.settings.mode, createBackgroundTab, tabId]);

  useEffect(() => {
    if (state.isGenerating && state.lastGeneratedAt) {
      const timeSinceLastGeneration = Date.now() - state.lastGeneratedAt;
      if (timeSinceLastGeneration > 5000) {
        onChange({
          ...state,
          isGenerating: false,
        });
        return;
      }
    }

    if (!state.generatedOutput && !state.isGenerating) {
      generateNewContent();
    }
  }, [generateNewContent, state.generatedOutput, state.isGenerating, state.lastGeneratedAt, onChange]);


  return (
    <div className="h-full flex flex-col bg-canvas text-main">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-base">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-main">Lorem Ipsum & Mock Data Generator</h1>
            <p className="text-secondary mt-1">
              Generate realistic placeholder content for your projects
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">
              {state.lastGeneratedAt ? `Last generated: ${new Date(state.lastGeneratedAt).toLocaleTimeString()
                }` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Settings Panel */}
          <div className="lg:col-span-1 overflow-y-auto max-h-full custom-scrollbar">
            <SettingsPanel
              settings={state.settings}
              onSettingsChange={updateSettings}
              isGenerating={state.isGenerating}
            />
          </div>

          {/* Output Area */}
          <div className="lg:col-span-2">
            <OutputArea
              content={state.generatedOutput}
              mode={state.settings.mode}
              isGenerating={state.isGenerating}
              onGenerate={generateNewContent}
              onCreateNewTab={handleCreateNewTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Default export for the dynamic registry
const createLoremIpsumInitialState = (payload?: any) => ({
  type: 'loremipsum' as const,
  settings: {
    mode: 'text' as const,
    theme: 'general' as const,
    outputUnit: 'paragraphs' as const,
    count: 3,
    customSourceText: '',
    includeNumbers: false,
    includeSpecialChars: false,
    startWithLorem: true,
    ...payload,
  },
  generatedOutput: '',
  isGenerating: false,
  lastGeneratedAt: 0,
});

export default {
  id: 'loremipsum',
  label: 'Lorem Ipsum Generator',

  createInitialState: createLoremIpsumInitialState,

  serializeState: (state: any) => JSON.stringify(state),

  deserializeState: (serialized: string) => {
    try {
      return JSON.parse(serialized);
    } catch {
      return createLoremIpsumInitialState();
    }
  },

  render: (state: any, onChange: (newState: any) => void) =>
    React.createElement(LoremIpsumTablet, { state, onChange }),
};