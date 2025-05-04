import React from 'react';
import { getLanguageStatusItem, getLanguageOptionsMenu } from './LanguageStatusItems';
import { Macro } from '../Macro';
import { tabletRegistry } from '../../tablets';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Tab } from "../../types.ts";
import { AIStatusIcon } from '../AI/AIStatusIcon';
import { useRootStore } from '../../stores';

interface StatusBarProps {
  editor: monaco.editor.IStandaloneCodeEditor | null,
  activeTab: Tab,
  side: 'left' | 'right'
}

export const StatusBar: React.FC<StatusBarProps> = ({editor, activeTab, side}) => {
  const { splitView } = useRootStore();
  const showAIIcon = (!splitView.isSplit && side === 'left') || (splitView.isSplit && side === 'right');

  // Get the tablet if this is a tablet tab
  let tabletLabel = '';
  if (activeTab?.isTablet && activeTab.tabletState) {
    try {
      const state = JSON.parse(activeTab.tabletState);
      const tablet = tabletRegistry.getById(state.type);
      if (tablet) {
        tabletLabel = tablet.label;
      }
    } catch (e) {
      console.error('Error parsing tablet state:', e);
    }
  }

  const LanguageStatusItem = activeTab && !activeTab.isTablet ? 
    getLanguageStatusItem(activeTab.language, activeTab.content) : null;

  const LanguageOptionsMenu = activeTab && !activeTab.isTablet ? 
    getLanguageOptionsMenu(activeTab.language, editor) : null;

  return (
   <div className="flex items-center justify-between px-3 py-0.5 bg-gray-800 text-gray-300 text-xs"> 
    <div className="flex items-center space-x-4">
        {activeTab && (
          <>
            <span>
              Ln {activeTab.cursorPosition.lineNumber}, Col {activeTab.cursorPosition.column}
            </span>
            <div className="p-0.5 flex items-center space-x-2">
              <span className="capitalize">
                {tabletLabel || activeTab.language}
              </span>
              {LanguageStatusItem && <LanguageStatusItem />}
              {LanguageOptionsMenu && <LanguageOptionsMenu editor={editor} />}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {showAIIcon && <AIStatusIcon />}
        <Macro editor={editor}/>
      </div>
    </div>
  );
};