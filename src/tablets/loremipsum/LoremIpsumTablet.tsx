import React, { useCallback, useEffect } from 'react';
import { LoremIpsumState, LoremIpsumSettings } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { OutputArea } from './components/OutputArea';
import { generateContent, validateOptions, getLanguageForMode } from './utils/generator';
import { tabletActionService } from '../../services/tabletActionService';

interface LoremIpsumTabletProps {
  state: LoremIpsumState;
  onChange: (newState: LoremIpsumState) => void;
}

export const LoremIpsumTablet: React.FC<LoremIpsumTabletProps> = ({
  state,
  onChange,
}) => {
  const updateSettings = useCallback((updates: Partial<LoremIpsumSettings>) => {
    const newSettings = { ...state.settings, ...updates };
    onChange({
      ...state,
      settings: newSettings,
    });
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
      console.error('Validation error:', validationError);
      return;
    }

    onChange({
      ...state,
      isGenerating: true,
    });

    // Use setTimeout to allow UI to update
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
        console.error('Generation error:', error);
        onChange({
          ...state,
          generatedOutput: 'Error generating content. Please try again.',
          isGenerating: false,
        });
      }
    }, 100);
  }, [state, onChange]);

  const handleCreateNewTab = useCallback(async () => {
    if (!state.generatedOutput) return;

    const language = getLanguageForMode(state.settings.mode);
    const modeLabels = {
      text: 'Text',
      html: 'HTML',
      markdown: 'Markdown',
      json: 'JSON',
      custom: 'Custom'
    };

    try {
      await tabletActionService.handleAction({
        targetTablet: 'text-editor', // This would create a regular text tab
        action: 'new-tab',
        payload: {
          content: state.generatedOutput,
          language,
          title: `Generated ${modeLabels[state.settings.mode]} Content`,
        },
        source: {
          titleHint: `Generated ${modeLabels[state.settings.mode]}`,
        },
      });
    } catch (error) {
      console.error('Failed to create new tab:', error);
    }
  }, [state.generatedOutput, state.settings.mode]);

  // Auto-generate on first load
  useEffect(() => {
    if (!state.generatedOutput && !state.isGenerating) {
      generateNewContent();
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Lorem Ipsum & Mock Data Generator</h1>
            <p className="text-gray-400 mt-1">
              Generate realistic placeholder content for your projects
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">
              {state.lastGeneratedAt ? `Last generated: ${new Date(state.lastGeneratedAt).toLocaleTimeString()}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Settings Panel */}
          <div className="lg:col-span-1">
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