import QRCodeTablet from '../QRCodeTablet';
import { DEFAULT_STYLE } from '../contentTypes';

// qr-code-styling appends to DOM — mock it for unit tests
jest.mock('qr-code-styling', () => {
  return jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    update: jest.fn(),
    download: jest.fn().mockResolvedValue(undefined),
    getRawData: jest.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
  }));
});

describe('QRCodeTablet interface', () => {
  describe('metadata', () => {
    it('has the correct id and label', () => {
      expect(QRCodeTablet.id).toBe('qrcode');
      expect(QRCodeTablet.label).toBe('QR Code Generator');
    });

    it('includes relevant keywords', () => {
      expect(QRCodeTablet.keywords).toContain('qr');
      expect(QRCodeTablet.keywords).toContain('wifi');
      expect(QRCodeTablet.keywords).toContain('decode');
    });
  });

  describe('createInitialState', () => {
    it('creates valid default state', () => {
      const state = QRCodeTablet.createInitialState();
      expect(state.type).toBe('qrcode');
      expect(state.data.mode).toBe('generate');
      expect(state.data.contentType).toBe('url');
      expect(state.data.fields).toEqual({ url: '' });
      expect(state.data.history).toEqual([]);
      expect(state.data.logoDataUrl).toBeNull();
      expect(state.data.style).toMatchObject(DEFAULT_STYLE);
    });

    it('pre-fills url field when payload contains a url', () => {
      const state = QRCodeTablet.createInitialState({ url: 'https://example.com' });
      expect(state.data.contentType).toBe('url');
      expect(state.data.fields.url).toBe('https://example.com');
    });

    it('ignores unknown payload shapes', () => {
      const state = QRCodeTablet.createInitialState({ something: 'else' });
      expect(state.data.fields).toEqual({ url: '' });
    });

    it('handles undefined payload', () => {
      const state = QRCodeTablet.createInitialState(undefined);
      expect(state.data.contentType).toBe('url');
    });
  });

  describe('serializeState / deserializeState', () => {
    it('round-trips state without loss', () => {
      const original = QRCodeTablet.createInitialState({ url: 'https://example.com' });
      const serialized = QRCodeTablet.serializeState(original);
      const restored = QRCodeTablet.deserializeState(serialized);

      expect(restored.type).toBe('qrcode');
      expect(restored.data.contentType).toBe('url');
      expect(restored.data.fields.url).toBe('https://example.com');
    });

    it('preserves style configuration', () => {
      const original = QRCodeTablet.createInitialState();
      original.data.style = {
        ...DEFAULT_STYLE,
        dotColor: '#ff0000',
        errorCorrection: 'H',
        size: 1024,
      };
      const restored = QRCodeTablet.deserializeState(QRCodeTablet.serializeState(original));
      expect(restored.data.style.dotColor).toBe('#ff0000');
      expect(restored.data.style.errorCorrection).toBe('H');
      expect(restored.data.style.size).toBe(1024);
    });

    it('falls back to initial state on malformed JSON', () => {
      const state = QRCodeTablet.deserializeState('{not valid json}');
      expect(state.type).toBe('qrcode');
      expect(state.data.contentType).toBe('url');
    });

    it('falls back on state with wrong type', () => {
      const state = QRCodeTablet.deserializeState(JSON.stringify({ type: 'base64', data: {} }));
      expect(state.type).toBe('qrcode');
    });

    it('merges missing style fields with defaults on partial data', () => {
      const partial = JSON.stringify({
        type: 'qrcode',
        data: {
          contentType: 'text',
          fields: { text: 'hello' },
          style: { dotColor: '#123456' },
          history: [],
        },
      });
      const state = QRCodeTablet.deserializeState(partial);
      // Partial style should be merged with defaults
      expect(state.data.style.dotColor).toBe('#123456');
      expect(state.data.style.errorCorrection).toBe(DEFAULT_STYLE.errorCorrection);
      expect(state.data.style.size).toBe(DEFAULT_STYLE.size);
    });

    it('initialises history to [] when missing in persisted data', () => {
      const withoutHistory = JSON.stringify({
        type: 'qrcode',
        data: { contentType: 'url', fields: {}, style: {} },
      });
      const state = QRCodeTablet.deserializeState(withoutHistory);
      expect(state.data.history).toEqual([]);
    });
  });
});
