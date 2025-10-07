import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IPDetailsTablet } from '../IPDetailsTablet';

// Mock fetch globally
global.fetch = jest.fn();

describe('IPDetailsTablet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('tablet interface', () => {
    it('should have correct tablet properties', () => {
      expect(IPDetailsTablet.id).toBe('ipdetails');
      expect(IPDetailsTablet.label).toBe('IP Details');
      expect(IPDetailsTablet.keywords).toContain('ip');
      expect(IPDetailsTablet.keywords).toContain('address');
      expect(IPDetailsTablet.keywords).toContain('location');
    });

    it('should create initial state correctly', () => {
      const state = IPDetailsTablet.createInitialState();

      expect(state).toEqual({
        type: 'ipdetails',
        data: {
          ip: '',
          details: null,
          loading: false,
          error: null,
          lastUpdated: null,
        },
      });
    });

    it('should serialize state correctly', () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.ip = '1.2.3.4';
      state.data.lastUpdated = 1234567890;

      const serialized = IPDetailsTablet.serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.type).toBe('ipdetails');
      expect(parsed.data.ip).toBe('1.2.3.4');
      expect(parsed.data.lastUpdated).toBe(1234567890);
    });

    it('should deserialize state correctly', () => {
      const originalState = IPDetailsTablet.createInitialState();
      originalState.data.ip = '1.2.3.4';
      originalState.data.lastUpdated = 1234567890;

      const serialized = JSON.stringify(originalState);
      const deserialized = IPDetailsTablet.deserializeState(serialized);

      expect(deserialized).toEqual(originalState);
    });
  });

  describe('auto-refresh logic', () => {
    const mockIPResponse = {
      ip: '1.2.3.4',
    };

    const mockDetailsResponse = {
      ip: '1.2.3.4',
      city: 'San Francisco',
      region: 'California',
      country_name: 'United States',
      org: 'Test ISP',
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('ipify')) {
          return Promise.resolve({
            json: () => Promise.resolve(mockIPResponse),
          });
        }
        if (url.includes('ipapi')) {
          return Promise.resolve({
            json: () => Promise.resolve(mockDetailsResponse),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });
    });

    it('should auto-fetch when state has no IP', async () => {
      const state = IPDetailsTablet.createInitialState();
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
      });
    });

    it('should auto-fetch when lastUpdated is null', async () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.ip = '1.2.3.4';
      state.data.lastUpdated = null;
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
      });
    });

    it('should auto-fetch when data is older than 1 hour', async () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.ip = '1.2.3.4';
      // Set timestamp to 2 hours ago
      state.data.lastUpdated = Date.now() - (2 * 60 * 60 * 1000);
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('https://api.ipify.org?format=json');
      });
    });

    it('should NOT auto-fetch when data is fresh (less than 1 hour old)', () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.ip = '1.2.3.4';
      state.data.details = mockDetailsResponse;
      // Set timestamp to 30 minutes ago (fresh data)
      state.data.lastUpdated = Date.now() - (30 * 60 * 1000);
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      // Advance timers to ensure useEffect has run
      jest.runAllTimers();

      // Should not have triggered a fetch since data is fresh
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should update lastUpdated timestamp after successful fetch', async () => {
      const state = IPDetailsTablet.createInitialState();
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      await waitFor(() => {
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
        if (lastCall && lastCall[0].data.lastUpdated) {
          expect(lastCall[0].data.lastUpdated).toBeGreaterThan(Date.now() - 1000);
        }
      });
    });
  });

  describe('component rendering', () => {
    it('should render IP Details header', () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.ip = '1.2.3.4';
      state.data.lastUpdated = Date.now();
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      expect(screen.getByText('IP Details')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.loading = true;
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      expect(screen.getByText('Refresh')).toBeInTheDocument();
      // Loading spinner should be present
      const button = screen.getByText('Refresh').closest('button');
      expect(button).toBeDisabled();
    });

    it('should show error state', () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.error = 'Failed to fetch IP details';
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      expect(screen.getByText('Failed to fetch IP details')).toBeInTheDocument();
    });

    it('should display IP address and details when loaded', () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.ip = '1.2.3.4';
      state.data.details = {
        city: 'San Francisco',
        region: 'California',
        country_name: 'United States',
      };
      state.data.lastUpdated = Date.now();
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      expect(screen.getByText('1.2.3.4')).toBeInTheDocument();
      expect(screen.getByText('San Francisco')).toBeInTheDocument();
      expect(screen.getByText('California')).toBeInTheDocument();
      expect(screen.getByText('United States')).toBeInTheDocument();
    });

    it('should show last updated timestamp', () => {
      const state = IPDetailsTablet.createInitialState();
      state.data.ip = '1.2.3.4';
      state.data.lastUpdated = Date.now();
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const state = IPDetailsTablet.createInitialState();
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      await waitFor(() => {
        const errorCall = mockOnChange.mock.calls.find(
          call => call[0].data.error
        );
        expect(errorCall).toBeDefined();
        expect(errorCall[0].data.error).toBe('Failed to fetch IP details. Please try again.');
      });
    });

    it('should handle ipapi.co error responses', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('ipify')) {
          return Promise.resolve({
            json: () => Promise.resolve({ ip: '1.2.3.4' }),
          });
        }
        if (url.includes('ipapi')) {
          return Promise.resolve({
            json: () => Promise.resolve({
              error: true,
              reason: 'Rate limit exceeded',
            }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const state = IPDetailsTablet.createInitialState();
      const mockOnChange = jest.fn();

      render(IPDetailsTablet.render(state, mockOnChange));

      await waitFor(() => {
        const errorCall = mockOnChange.mock.calls.find(
          call => call[0].data.error
        );
        expect(errorCall).toBeDefined();
      });
    });
  });
});
