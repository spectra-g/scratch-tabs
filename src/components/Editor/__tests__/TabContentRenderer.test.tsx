import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TabContentRenderer } from '../TabContentRenderer';
import type { SmartView } from '../../../views/registry';

// Mock the dynamic registry to prevent import.meta.glob issues
jest.mock('../../../tablets/dynamicRegistry');

// Mock the tablets index
jest.mock('../../../tablets', () => ({
  Tablet: jest.fn(() => <div data-testid="tablet" />),
}));

// Mock EditorInstance
jest.mock('../EditorInstance', () => ({
  EditorInstance: ({ activeTabId, side }: any) => (
    <div data-testid="editor-instance" data-tab-id={activeTabId} data-side={side}>
      Editor Instance
    </div>
  ),
}));

// Mock TabletView
jest.mock('../../Tab/TabletView', () => ({
  TabletView: ({ tab }: any) => (
    <div data-testid="tablet-view" data-tab-id={tab.id}>
      Tablet View
    </div>
  ),
}));

// Mock RichTextEditor with lazy loading simulation
jest.mock('../../RichText/RichTextEditor', () => ({
  RichTextEditor: ({ tab }: any) => (
    <div data-testid="rich-text-editor" data-tab-id={tab.id}>
      Rich Text Editor
    </div>
  ),
}));

// Mock modelManager
jest.mock('../../../services/modelManager', () => ({
  modelManager: {
    invalidateModel: jest.fn(),
  },
}));

// Mock WorkspaceEmptyState
jest.mock('../../Workspace/WorkspaceEmptyState', () => ({
  WorkspaceEmptyState: () => (
    <div data-testid="workspace-empty-state">Workspace Empty State</div>
  ),
}));

describe('TabContentRenderer', () => {
  const mockUpdateTabState = jest.fn();
  const mockOnTabletStateChange = jest.fn();
  const mockOnRichContentChange = jest.fn();
  const mockOnUpgradeToRich = jest.fn();
  const mockOnEditorReady = jest.fn();

  const baseProps = {
    side: 'left' as const,
    previewContent: 'test content',
    shouldShowReplacementView: false,
    extendedView: null,
    updateTabState: mockUpdateTabState,
    onTabletStateChange: mockOnTabletStateChange,
    onRichContentChange: mockOnRichContentChange,
    onUpgradeToRich: mockOnUpgradeToRich,
    onEditorReady: mockOnEditorReady,
  };

  const createMockTab = (overrides = {}) => ({
    id: 'tab-1',
    title: 'Test Tab',
    content: 'test content',
    language: 'javascript',
    languageLocked: false,
    isTablet: false,
    isRich: false,
    workspaceId: 'workspace-1',
    dateCreated: Date.now(),
    lastModified: Date.now(),
    cursorPosition: { lineNumber: 1, column: 1 },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should render WorkspaceEmptyState when activeTab is null', () => {
      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={null}
          activeTabId={null}
        />
      );

      expect(screen.getByTestId('workspace-empty-state')).toBeInTheDocument();
    });

    it('should render WorkspaceEmptyState when activeTabId is null', () => {
      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={createMockTab()}
          activeTabId={null}
        />
      );

      expect(screen.getByTestId('workspace-empty-state')).toBeInTheDocument();
    });
  });

  describe('EditorInstance rendering', () => {
    it('should render EditorInstance for regular text tabs', () => {
      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={createMockTab()}
          activeTabId="tab-1"
        />
      );

      expect(screen.getByTestId('editor-instance')).toBeInTheDocument();
      expect(screen.getByTestId('editor-instance')).toHaveAttribute('data-tab-id', 'tab-1');
      expect(screen.getByTestId('editor-instance')).toHaveAttribute('data-side', 'left');
    });

    it('should pass correct side prop', () => {
      render(
        <TabContentRenderer
          {...baseProps}
          side="right"
          activeTab={createMockTab()}
          activeTabId="tab-1"
        />
      );

      expect(screen.getByTestId('editor-instance')).toHaveAttribute('data-side', 'right');
    });
  });

  describe('TabletView rendering', () => {
    it('should render TabletView for tablet tabs', () => {
      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={createMockTab({ isTablet: true })}
          activeTabId="tab-1"
        />
      );

      expect(screen.getByTestId('tablet-view')).toBeInTheDocument();
      expect(screen.queryByTestId('editor-instance')).not.toBeInTheDocument();
    });
  });

  describe('RichTextEditor rendering', () => {
    it('should render RichTextEditor for rich text tabs', async () => {
      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={createMockTab({ isRich: true })}
          activeTabId="tab-1"
        />
      );

      // Wait for lazy loaded component
      expect(await screen.findByTestId('rich-text-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('editor-instance')).not.toBeInTheDocument();
    });
  });

  describe('Replacement view rendering', () => {
    it('should render replacement view when shouldShowReplacementView is true', () => {
      const MockReplacementComponent = ({ content, tabId }: any) => (
        <div data-testid="replacement-view" data-content={content} data-tab-id={tabId}>
          Replacement View
        </div>
      );

      const extendedView: SmartView = {
        id: 'csv-table',
        languageId: 'csv',
        label: 'Table',
        icon: (() => null) as any,
        component: MockReplacementComponent,
        mode: 'replaces',
      };

      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={createMockTab()}
          activeTabId="tab-1"
          shouldShowReplacementView={true}
          extendedView={extendedView}
        />
      );

      expect(screen.getByTestId('replacement-view')).toBeInTheDocument();
      expect(screen.queryByTestId('editor-instance')).not.toBeInTheDocument();
    });
  });

  describe('Rendering priority', () => {
    it('should prioritize replacement view over rich text', () => {
      const MockReplacementComponent = () => (
        <div data-testid="replacement-view">Replacement View</div>
      );

      const extendedView: SmartView = {
        id: 'test-view',
        languageId: 'test',
        label: 'Test',
        icon: (() => null) as any,
        component: MockReplacementComponent,
        mode: 'replaces',
      };

      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={createMockTab({ isRich: true })}
          activeTabId="tab-1"
          shouldShowReplacementView={true}
          extendedView={extendedView}
        />
      );

      expect(screen.getByTestId('replacement-view')).toBeInTheDocument();
      expect(screen.queryByTestId('rich-text-editor')).not.toBeInTheDocument();
    });

    it('should prioritize rich text over tablet', async () => {
      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={createMockTab({ isRich: true, isTablet: true })}
          activeTabId="tab-1"
        />
      );

      expect(await screen.findByTestId('rich-text-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('tablet-view')).not.toBeInTheDocument();
    });

    it('should prioritize tablet over editor', () => {
      render(
        <TabContentRenderer
          {...baseProps}
          activeTab={createMockTab({ isTablet: true })}
          activeTabId="tab-1"
        />
      );

      expect(screen.getByTestId('tablet-view')).toBeInTheDocument();
      expect(screen.queryByTestId('editor-instance')).not.toBeInTheDocument();
    });
  });
});
