import React, { useRef, useEffect, useCallback } from 'react';
import { useRootStore } from '../../stores';
import { useTabletSelector } from '../../hooks/useTabletSelector';
import { TabletSelector } from '../../tablets';
import { Tablet } from '../../tablets';
import { TabActions } from '../Tab/TabActions';

export const WelcomeScreen: React.FC = () => {
  const { handleNewTab, handleNewPopulatedTab } = useRootStore();
  const welcomeRef = useRef<HTMLDivElement>(null);
  const tabletButtonRef = useRef<HTMLButtonElement>(null);

  const {
    showTabletSelector,
    selectorPosition,
    tabletSelectorContainerRef,
    openTabletSelector,
    closeTabletSelector,
  } = useTabletSelector(
    null,
    welcomeRef,
    null,
    undefined
  );

  const handleDoubleClick = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      handleNewTab(false, text);
    }
  }, [handleNewTab]);

  const handleTabletSelect = useCallback((tablet: Tablet) => {
    const state = tablet.createInitialState();
    const serializedState = tablet.serializeState ? tablet.serializeState(state) : JSON.stringify(state);

    handleNewPopulatedTab({
      id: crypto.randomUUID(),
      title: tablet.label,
      content: '',
      language: 'plaintext',
      languageLocked: true,
      isTablet: true,
      tabletState: serializedState,
      cursorPosition: { lineNumber: 1, column: 1 },
    });

    closeTabletSelector(false);
  }, [handleNewPopulatedTab, closeTabletSelector]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !showTabletSelector &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        if (welcomeRef.current) {
          const rect = welcomeRef.current.getBoundingClientRect();
          const position = {
            x: rect.left + rect.width / 2 - 150,
            y: rect.top + 150,
          };
          openTabletSelector(position);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [showTabletSelector, openTabletSelector]);

  return (
    <div className="h-full w-full flex flex-col bg-gray-900">
      {/* Tab Actions Bar */}
      <div className="flex justify-end bg-gray-800 h-8">
        <TabActions
          onShowTabletSelector={() => {
            if (tabletButtonRef.current) {
              const rect = tabletButtonRef.current.getBoundingClientRect();
              openTabletSelector({ x: rect.left, y: rect.bottom + 4 });
            }
          }}
          tabletButtonRef={tabletButtonRef}
        />
      </div>

      {/* Welcome Content */}
      <div
        ref={welcomeRef}
        className="flex-1 flex flex-col items-center pt-24 md:pt-32 text-gray-400 cursor-pointer relative outline-none"
        onDoubleClick={handleDoubleClick}
        onPaste={handlePaste}
        tabIndex={-1}
      >
        <img
          src="/favicon-gray.svg"
          alt="Scratch Tabs Logo"
          className="w-16 h-16 mb-6"
        />
        <h1 className="text-2xl font-semibold mb-8 text-gray-200">Welcome to Scratch Tabs!</h1>
        <div className="text-center max-w-md">
          <p className="mb-8 text-lg text-gray-300">To get started:</p>
          <ol className="list-decimal list-inside text-left space-y-3 text-gray-400 mx-auto inline-block">
            <li>Double-click anywhere here</li>
            <li>Use the buttons above</li>
            <li>Paste text from your clipboard</li>
            <li>Type <span className="font-mono bg-gray-700 px-1 rounded text-gray-300">/</span> to select a Tablet</li>
          </ol>
        </div>
      </div>

      {showTabletSelector && (
        <div
          ref={tabletSelectorContainerRef}
          style={{
            position: 'absolute',
            left: `${selectorPosition.x}px`,
            top: `${selectorPosition.y}px`,
            zIndex: 50,
          }}
        >
          <TabletSelector
            searchQuery=""
            onSelect={handleTabletSelect}
            onClose={() => closeTabletSelector(false)}
            showSearch={true}
          />
        </div>
      )}
    </div>
  );
};