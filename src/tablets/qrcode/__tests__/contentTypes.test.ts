import {
  contentTypeConfigs,
  autoDetectContentType,
  hasUserContent,
  DEFAULT_STYLE,
  type ContentTypeId,
} from '../contentTypes';

// ── autoDetectContentType ────────────────────────────────────────────────────

describe('autoDetectContentType', () => {
  it.each([
    ['https://example.com', 'url'],
    ['http://example.com/path?q=1', 'url'],
    ['WIFI:T:WPA;S:MyNet;P:pass;;', 'wifi'],
    ['wifi:T:WPA;S:lower;;', 'wifi'],
    ['mailto:user@example.com', 'email'],
    ['tel:+15555551234', 'phone'],
    ['smsto:+15555551234:hello', 'sms'],
    ['BEGIN:VCARD\nVERSION:3.0\nEND:VCARD', 'vcard'],
    ['geo:37.7749,-122.4194', 'geo'],
  ] as [string, ContentTypeId][])('detects %s as %s', (input, expected) => {
    expect(autoDetectContentType(input)).toBe(expected);
  });

  it('returns null for plain text', () => {
    expect(autoDetectContentType('just some plain text')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(autoDetectContentType('')).toBeNull();
  });

  it('trims leading/trailing whitespace before detecting', () => {
    expect(autoDetectContentType('  https://example.com  ')).toBe('url');
  });
});

// ── hasUserContent ───────────────────────────────────────────────────────────

describe('hasUserContent', () => {
  describe('url', () => {
    it('returns true when url is set', () => {
      expect(hasUserContent('url', { url: 'https://example.com' })).toBe(true);
    });
    it('returns false for empty url', () => {
      expect(hasUserContent('url', { url: '' })).toBe(false);
    });
    it('returns false for whitespace-only url', () => {
      expect(hasUserContent('url', { url: '   ' })).toBe(false);
    });
    it('returns false for missing url field', () => {
      expect(hasUserContent('url', {})).toBe(false);
    });
  });

  describe('text', () => {
    it('returns true when text is set', () => {
      expect(hasUserContent('text', { text: 'hello' })).toBe(true);
    });
    it('returns false for empty text', () => {
      expect(hasUserContent('text', { text: '' })).toBe(false);
    });
  });

  describe('wifi', () => {
    it('returns true when ssid is set', () => {
      expect(hasUserContent('wifi', { ssid: 'MyNetwork', security: 'WPA' })).toBe(true);
    });
    it('returns false for empty ssid (the template state)', () => {
      expect(hasUserContent('wifi', { ssid: '', security: 'WPA', hidden: 'false' })).toBe(false);
    });
    it('returns false when ssid is whitespace only', () => {
      expect(hasUserContent('wifi', { ssid: '  ' })).toBe(false);
    });
  });

  describe('email', () => {
    it('returns true when address is set', () => {
      expect(hasUserContent('email', { address: 'user@example.com' })).toBe(true);
    });
    it('returns false for empty address', () => {
      expect(hasUserContent('email', { address: '' })).toBe(false);
    });
  });

  describe('phone', () => {
    it('returns true when phone is set', () => {
      expect(hasUserContent('phone', { phone: '+15555551234' })).toBe(true);
    });
    it('returns false for empty phone', () => {
      expect(hasUserContent('phone', { phone: '' })).toBe(false);
    });
  });

  describe('sms', () => {
    it('returns true when phone is set', () => {
      expect(hasUserContent('sms', { phone: '+15555551234' })).toBe(true);
    });
    it('returns true when only message is set', () => {
      expect(hasUserContent('sms', { phone: '', message: 'hi' })).toBe(true);
    });
    it('returns false when both are empty', () => {
      expect(hasUserContent('sms', { phone: '', message: '' })).toBe(false);
    });
  });

  describe('vcard', () => {
    it('returns true when name is set', () => {
      expect(hasUserContent('vcard', { name: 'Jane Doe' })).toBe(true);
    });
    it('returns true when only email is set', () => {
      expect(hasUserContent('vcard', { name: '', email: 'jane@example.com' })).toBe(true);
    });
    it('returns false when all fields are empty', () => {
      expect(hasUserContent('vcard', { name: '', phone: '', email: '', org: '', url: '' })).toBe(false);
    });
    it('returns false for empty object', () => {
      expect(hasUserContent('vcard', {})).toBe(false);
    });
  });

  describe('geo', () => {
    it('returns true for valid non-zero coordinates', () => {
      expect(hasUserContent('geo', { lat: '37.7749', lng: '-122.4194' })).toBe(true);
    });
    it('returns false when both are 0 (default)', () => {
      expect(hasUserContent('geo', { lat: '0', lng: '0' })).toBe(false);
    });
    it('returns false when lat is missing', () => {
      expect(hasUserContent('geo', { lat: '', lng: '-122.4194' })).toBe(false);
    });
    it('returns true when only one coordinate is non-zero', () => {
      expect(hasUserContent('geo', { lat: '37.7749', lng: '0' })).toBe(true);
    });
  });
});

// ── format functions ─────────────────────────────────────────────────────────

describe('contentTypeConfigs.format', () => {
  const fmt = (id: ContentTypeId, fields: Record<string, string>) =>
    contentTypeConfigs[id].format(fields);

  describe('url', () => {
    it('returns the url as-is', () => {
      expect(fmt('url', { url: 'https://example.com' })).toBe('https://example.com');
    });
    it('returns empty string for missing url', () => {
      expect(fmt('url', {})).toBe('');
    });
  });

  describe('text', () => {
    it('returns the text as-is', () => {
      expect(fmt('text', { text: 'hello world' })).toBe('hello world');
    });
    it('preserves newlines', () => {
      expect(fmt('text', { text: 'line1\nline2' })).toBe('line1\nline2');
    });
  });

  describe('wifi', () => {
    it('formats WPA network correctly', () => {
      const result = fmt('wifi', { ssid: 'MyNetwork', password: 'pass123', security: 'WPA', hidden: 'false' });
      expect(result).toBe('WIFI:T:WPA;S:MyNetwork;P:pass123;H:false;;');
    });

    it('sets hidden=true when toggled', () => {
      const result = fmt('wifi', { ssid: 'Hidden', password: 'pw', security: 'WPA', hidden: 'true' });
      expect(result).toContain('H:true');
    });

    it('omits password for open networks', () => {
      const result = fmt('wifi', { ssid: 'OpenNet', password: 'ignored', security: 'nopass', hidden: 'false' });
      expect(result).toBe('WIFI:T:nopass;S:OpenNet;P:;H:false;;');
    });

    it('escapes semicolons in SSID', () => {
      const result = fmt('wifi', { ssid: 'Net;work', password: 'pw', security: 'WPA', hidden: 'false' });
      expect(result).toContain('S:Net\\;work');
    });

    it('escapes backslashes in password', () => {
      const result = fmt('wifi', { ssid: 'Net', password: 'pa\\ss', security: 'WPA', hidden: 'false' });
      expect(result).toContain('P:pa\\\\ss');
    });

    it('escapes double quotes in SSID', () => {
      const result = fmt('wifi', { ssid: 'My"Net"', password: 'pw', security: 'WPA', hidden: 'false' });
      expect(result).toContain('S:My\\"Net\\"');
    });
  });

  describe('email', () => {
    it('formats address-only mailto', () => {
      expect(fmt('email', { address: 'user@example.com' })).toBe('mailto:user@example.com');
    });

    it('includes subject when provided', () => {
      const result = fmt('email', { address: 'user@example.com', subject: 'Hello' });
      expect(result).toBe('mailto:user@example.com?subject=Hello');
    });

    it('URL-encodes special characters in subject', () => {
      const result = fmt('email', { address: 'u@e.com', subject: 'Hi & Bye' });
      expect(result).toContain('subject=Hi+%26+Bye');
    });

    it('includes both subject and body', () => {
      const result = fmt('email', { address: 'u@e.com', subject: 'Hi', body: 'Hello there' });
      expect(result).toContain('subject=Hi');
      expect(result).toContain('body=Hello+there');
    });

    it('omits subject param when empty', () => {
      const result = fmt('email', { address: 'u@e.com', subject: '' });
      expect(result).toBe('mailto:u@e.com');
    });
  });

  describe('phone', () => {
    it('formats with tel: prefix', () => {
      expect(fmt('phone', { phone: '+15555551234' })).toBe('tel:+15555551234');
    });
    it('returns tel: for empty phone', () => {
      expect(fmt('phone', {})).toBe('tel:');
    });
  });

  describe('sms', () => {
    it('formats smsto: with message', () => {
      expect(fmt('sms', { phone: '+15555551234', message: 'hello' })).toBe('smsto:+15555551234:hello');
    });
    it('formats smsto: without message', () => {
      expect(fmt('sms', { phone: '+15555551234', message: '' })).toBe('smsto:+15555551234:');
    });
  });

  describe('vcard', () => {
    it('produces valid vCard with CRLF line endings', () => {
      const result = fmt('vcard', { name: 'Jane Doe', phone: '+15555551234', email: 'jane@example.com', org: 'Acme', url: 'https://example.com' });
      expect(result).toContain('\r\n');
      expect(result).toMatch(/BEGIN:VCARD\r\n/);
      expect(result).toMatch(/END:VCARD$/);
    });

    it('splits name into N field (Last;First)', () => {
      const result = fmt('vcard', { name: 'Jane Doe' });
      expect(result).toContain('N:Doe;Jane;;;');
      expect(result).toContain('FN:Jane Doe');
    });

    it('handles single-word name in N field', () => {
      const result = fmt('vcard', { name: 'Cher' });
      expect(result).toContain('N:;Cher;;;');
    });

    it('includes TEL with type annotation', () => {
      const result = fmt('vcard', { name: 'Jane', phone: '+1555' });
      expect(result).toContain('TEL;TYPE=cell:+1555');
    });

    it('includes EMAIL with type annotation', () => {
      const result = fmt('vcard', { name: 'Jane', email: 'j@e.com' });
      expect(result).toContain('EMAIL;TYPE=work:j@e.com');
    });

    it('omits empty fields', () => {
      const result = fmt('vcard', { name: 'Jane Doe' });
      expect(result).not.toContain('TEL');
      expect(result).not.toContain('EMAIL');
      expect(result).not.toContain('ORG');
      expect(result).not.toContain('URL');
    });

    it('includes fallback N field when name is empty', () => {
      const result = fmt('vcard', { name: '', email: 'j@e.com' });
      expect(result).toContain('N:;;;');
    });
  });

  describe('geo', () => {
    it('formats geo: URI', () => {
      expect(fmt('geo', { lat: '37.7749', lng: '-122.4194' })).toBe('geo:37.7749,-122.4194');
    });
    it('defaults to 0,0 for empty coordinates', () => {
      expect(fmt('geo', {})).toBe('geo:0,0');
    });
  });
});

// ── DEFAULT_STYLE ────────────────────────────────────────────────────────────

describe('DEFAULT_STYLE', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_STYLE.dotColor).toBe('#000000');
    expect(DEFAULT_STYLE.bgColor).toBe('#ffffff');
    expect(DEFAULT_STYLE.transparent).toBe(false);
    expect(DEFAULT_STYLE.errorCorrection).toBe('M');
    expect(DEFAULT_STYLE.size).toBe(512);
    expect(DEFAULT_STYLE.margin).toBe(4);
  });
});
