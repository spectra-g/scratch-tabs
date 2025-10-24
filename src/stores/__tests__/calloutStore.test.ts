import { useCalloutStore } from '../calloutStore';
import { SmartView } from '../../views/registry';
import { Table } from '../../components/Icons';

describe('calloutStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCalloutStore.setState({
      isVisible: false,
      tabId: null,
      view: null,
      languageId: null,
    });
  });

  it('should initialize with default state', () => {
    const state = useCalloutStore.getState();
    expect(state.isVisible).toBe(false);
    expect(state.tabId).toBe(null);
    expect(state.view).toBe(null);
    expect(state.languageId).toBe(null);
  });

  it('should show callout with view and tabId', () => {
    const mockView: SmartView = {
      id: 'test-view',
      languageId: 'json',
      label: 'Test View',
      icon: Table,
      component: () => null,
      mode: 'replaces',
      priority: 1,
    };

    const { showCallout } = useCalloutStore.getState();
    showCallout('test-tab-id', mockView, 'json');

    const state = useCalloutStore.getState();
    expect(state.isVisible).toBe(true);
    expect(state.tabId).toBe('test-tab-id');
    expect(state.view).toEqual(mockView);
    expect(state.languageId).toBe('json');
  });

  it('should hide callout and clear state', () => {
    const mockView: SmartView = {
      id: 'test-view',
      languageId: 'json',
      label: 'Test View',
      icon: Table,
      component: () => null,
      mode: 'replaces',
      priority: 1,
    };

    const { showCallout, hideCallout } = useCalloutStore.getState();

    // First show the callout
    showCallout('test-tab-id', mockView, 'json');
    expect(useCalloutStore.getState().isVisible).toBe(true);

    // Then hide it
    hideCallout();

    const state = useCalloutStore.getState();
    expect(state.isVisible).toBe(false);
    expect(state.tabId).toBe(null);
    expect(state.view).toBe(null);
    expect(state.languageId).toBe(null);
  });

  it('should replace existing callout when showing new one', () => {
    const mockView1: SmartView = {
      id: 'view-1',
      languageId: 'json',
      label: 'View 1',
      icon: Table,
      component: () => null,
      mode: 'replaces',
      priority: 1,
    };

    const mockView2: SmartView = {
      id: 'view-2',
      languageId: 'csv',
      label: 'View 2',
      icon: Table,
      component: () => null,
      mode: 'replaces',
      priority: 1,
    };

    const { showCallout } = useCalloutStore.getState();

    // Show first callout
    showCallout('tab-1', mockView1, 'json');
    expect(useCalloutStore.getState().tabId).toBe('tab-1');
    expect(useCalloutStore.getState().view?.id).toBe('view-1');
    expect(useCalloutStore.getState().languageId).toBe('json');

    // Show second callout (should replace first)
    showCallout('tab-2', mockView2, 'csv');
    expect(useCalloutStore.getState().tabId).toBe('tab-2');
    expect(useCalloutStore.getState().view?.id).toBe('view-2');
    expect(useCalloutStore.getState().languageId).toBe('csv');
  });
});
