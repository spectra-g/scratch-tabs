import { renderHook, act } from '@testing-library/react';
import { useQRDecoder } from '../useQRDecoder';
import type { QRCode } from 'jsqr';

// Mock jsqr so tests don't need a real image pipeline
jest.mock('jsqr', () => jest.fn());
import jsQR from 'jsqr';
const mockJsQR = jsQR as jest.MockedFunction<typeof jsQR>;

function makeQRCode(data: string): QRCode {
  return {
    data,
    binaryData: [],
    chunks: [],
    version: 1,
    location: {
      topRightCorner: { x: 0, y: 0 },
      topLeftCorner: { x: 0, y: 0 },
      bottomRightCorner: { x: 0, y: 0 },
      bottomLeftCorner: { x: 0, y: 0 },
      topRightFinderPattern: { x: 0, y: 0 },
      topLeftFinderPattern: { x: 0, y: 0 },
      bottomLeftFinderPattern: { x: 0, y: 0 },
    },
  };
}

// Mock createImageBitmap (not available in jsdom)
const mockBitmap = {
  width: 100,
  height: 100,
  close: jest.fn(),
};
global.createImageBitmap = jest.fn().mockResolvedValue(mockBitmap);

// Mock canvas getContext
const mockGetContext = jest.fn().mockReturnValue({
  drawImage: jest.fn(),
  getImageData: jest.fn().mockReturnValue({
    data: new Uint8ClampedArray(100 * 100 * 4),
    width: 100,
    height: 100,
  }),
});
const originalCreateElement = document.createElement.bind(document);
jest
  .spyOn(document, 'createElement')
  .mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      const canvas = originalCreateElement('canvas') as HTMLCanvasElement;
      Object.defineProperty(canvas, 'getContext', { value: mockGetContext, writable: true });
      return canvas;
    }
    return originalCreateElement(tag);
  });

describe('useQRDecoder', () => {
  const makeFile = () => new File(['fake-image'], 'qr.png', { type: 'image/png' });

  beforeEach(() => {
    jest.clearAllMocks();
    (global.createImageBitmap as jest.Mock).mockResolvedValue(mockBitmap);
    mockGetContext.mockReturnValue({
      drawImage: jest.fn(),
      getImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(100 * 100 * 4),
        width: 100,
        height: 100,
      }),
    });
  });

  it('starts with clean state', () => {
    const { result } = renderHook(() => useQRDecoder());
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets result.data on successful decode', async () => {
    mockJsQR.mockReturnValue(makeQRCode('https://example.com'));
    const { result } = renderHook(() => useQRDecoder());

    await act(async () => {
      await result.current.decode(makeFile());
    });

    expect(result.current.result?.data).toBe('https://example.com');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('detects content type from decoded string', async () => {
    mockJsQR.mockReturnValue(makeQRCode('https://example.com'));
    const { result } = renderHook(() => useQRDecoder());

    await act(async () => {
      await result.current.decode(makeFile());
    });

    expect(result.current.result?.detectedType).toBe('url');
  });

  it('detects wifi content type', async () => {
    mockJsQR.mockReturnValue(makeQRCode('WIFI:T:WPA;S:MyNet;P:pass;;'));
    const { result } = renderHook(() => useQRDecoder());

    await act(async () => {
      await result.current.decode(makeFile());
    });

    expect(result.current.result?.detectedType).toBe('wifi');
  });

  it('sets detectedType to null for plain text', async () => {
    mockJsQR.mockReturnValue(makeQRCode('just some text'));
    const { result } = renderHook(() => useQRDecoder());

    await act(async () => {
      await result.current.decode(makeFile());
    });

    expect(result.current.result?.detectedType).toBeNull();
  });

  it('sets error when jsQR finds no code', async () => {
    mockJsQR.mockReturnValue(null);
    const { result } = renderHook(() => useQRDecoder());

    await act(async () => {
      await result.current.decode(makeFile());
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toMatch(/no qr code/i);
    expect(result.current.loading).toBe(false);
  });

  it('sets error when image processing throws', async () => {
    (global.createImageBitmap as jest.Mock).mockRejectedValue(new Error('bad image'));
    const { result } = renderHook(() => useQRDecoder());

    await act(async () => {
      await result.current.decode(makeFile());
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toMatch(/failed to process/i);
  });

  it('reset clears result and error', async () => {
    mockJsQR.mockReturnValue(null);
    const { result } = renderHook(() => useQRDecoder());

    await act(async () => {
      await result.current.decode(makeFile());
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('clears previous result before starting a new decode', async () => {
    mockJsQR.mockReturnValueOnce(makeQRCode('https://first.com'));
    const { result } = renderHook(() => useQRDecoder());

    await act(async () => {
      await result.current.decode(makeFile());
    });
    expect(result.current.result?.data).toBe('https://first.com');

    // Second decode returns null → should clear previous result
    mockJsQR.mockReturnValue(null);
    await act(async () => {
      await result.current.decode(makeFile());
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).not.toBeNull();
  });
});
