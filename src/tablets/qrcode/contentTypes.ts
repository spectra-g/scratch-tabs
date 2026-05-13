import type { DotType, CornerSquareType, ErrorCorrectionLevel } from 'qr-code-styling';

export type ContentTypeId = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'sms' | 'vcard' | 'geo';

export interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  inputType?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'password';
  multiline?: boolean;
  options?: { value: string; label: string }[];
  toggle?: boolean;
}

export interface ContentTypeConfig {
  id: ContentTypeId;
  label: string;
  fields: FieldDef[];
  defaultFields?: Record<string, string>;
  format(fields: Record<string, string>): string;
}

const escapeWifi = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/"/g, '\\"');

export const contentTypeConfigs: Record<ContentTypeId, ContentTypeConfig> = {
  url: {
    id: 'url',
    label: 'URL',
    fields: [{ key: 'url', label: 'URL', placeholder: 'https://example.com', inputType: 'url' }],
    format: (f) => f.url || '',
  },
  text: {
    id: 'text',
    label: 'Text',
    fields: [{ key: 'text', label: 'Text', placeholder: 'Enter any text...', multiline: true }],
    format: (f) => f.text || '',
  },
  wifi: {
    id: 'wifi',
    label: 'WiFi',
    fields: [
      { key: 'ssid', label: 'Network Name (SSID)', placeholder: 'MyNetwork' },
      { key: 'password', label: 'Password', placeholder: 'password123', inputType: 'password' },
      {
        key: 'security',
        label: 'Security',
        options: [
          { value: 'WPA', label: 'WPA/WPA2' },
          { value: 'WEP', label: 'WEP' },
          { value: 'nopass', label: 'None' },
        ],
      },
      { key: 'hidden', label: 'Hidden Network', toggle: true },
    ],
    defaultFields: { security: 'WPA', hidden: 'false' },
    format: (f) => {
      const t = f.security || 'WPA';
      const pass = t === 'nopass' ? '' : escapeWifi(f.password || '');
      return `WIFI:T:${t};S:${escapeWifi(f.ssid || '')};P:${pass};H:${f.hidden === 'true' ? 'true' : 'false'};;`;
    },
  },
  email: {
    id: 'email',
    label: 'Email',
    fields: [
      { key: 'address', label: 'Email Address', placeholder: 'user@example.com', inputType: 'email' },
      { key: 'subject', label: 'Subject (optional)', placeholder: 'Hello!' },
      { key: 'body', label: 'Body (optional)', placeholder: 'Message...', multiline: true },
    ],
    format: (f) => {
      const params = new URLSearchParams();
      if (f.subject) params.set('subject', f.subject);
      if (f.body) params.set('body', f.body);
      const qs = params.toString();
      return `mailto:${f.address || ''}${qs ? '?' + qs : ''}`;
    },
  },
  phone: {
    id: 'phone',
    label: 'Phone',
    fields: [{ key: 'phone', label: 'Phone Number', placeholder: '+1 555 555 1234', inputType: 'tel' }],
    format: (f) => `tel:${f.phone || ''}`,
  },
  sms: {
    id: 'sms',
    label: 'SMS',
    fields: [
      { key: 'phone', label: 'Phone Number', placeholder: '+1 555 555 1234', inputType: 'tel' },
      { key: 'message', label: 'Message (optional)', placeholder: 'Hi!', multiline: true },
    ],
    format: (f) => `smsto:${f.phone || ''}:${f.message || ''}`,
  },
  vcard: {
    id: 'vcard',
    label: 'Contact',
    fields: [
      { key: 'name', label: 'Full Name', placeholder: 'Jane Doe' },
      { key: 'phone', label: 'Phone', placeholder: '+1 555 555 1234', inputType: 'tel' },
      { key: 'email', label: 'Email', placeholder: 'jane@example.com', inputType: 'email' },
      { key: 'org', label: 'Organization', placeholder: 'Acme Corp' },
      { key: 'url', label: 'Website', placeholder: 'https://example.com', inputType: 'url' },
    ],
    format: (f) => {
      const fullName = f.name || '';
      // Split "First … Last" → N field: "Last;First;;;" as v3.0 expects
      const parts = fullName.trim().split(/\s+/);
      const lastName = parts.length > 1 ? parts.pop()! : '';
      const firstName = parts.join(' ');
      const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        fullName ? `FN:${fullName}` : '',
        fullName ? `N:${lastName};${firstName};;;` : 'N:;;;',
        f.phone ? `TEL;TYPE=cell:${f.phone}` : '',
        f.email ? `EMAIL;TYPE=work:${f.email}` : '',
        f.org ? `ORG:${f.org}` : '',
        f.url ? `URL:${f.url}` : '',
        'END:VCARD',
      ];
      // RFC 2426 mandates CRLF line endings
      return lines.filter(Boolean).join('\r\n');
    },
  },
  geo: {
    id: 'geo',
    label: 'Location',
    fields: [
      { key: 'lat', label: 'Latitude', placeholder: '37.7749', inputType: 'number' },
      { key: 'lng', label: 'Longitude', placeholder: '-122.4194', inputType: 'number' },
    ],
    format: (f) => `geo:${f.lat || '0'},${f.lng || '0'}`,
  },
};

export const CONTENT_TYPE_ORDER: ContentTypeId[] = [
  'url', 'text', 'wifi', 'email', 'phone', 'sms', 'vcard', 'geo',
];

export interface QRStyleConfig {
  dotColor: string;
  bgColor: string;
  transparent: boolean;
  dotStyle: DotType;
  cornerStyle: CornerSquareType;
  errorCorrection: ErrorCorrectionLevel;
  size: number;
  margin: number;
}

export const DEFAULT_STYLE: QRStyleConfig = {
  dotColor: '#000000',
  bgColor: '#ffffff',
  transparent: false,
  dotStyle: 'square',
  cornerStyle: 'square',
  errorCorrection: 'M',
  size: 512,
  margin: 4,
};

export interface HistoryItem {
  id: string;
  thumbDataUrl: string;
  contentType: ContentTypeId;
  fields: Record<string, string>;
  style: QRStyleConfig;
  logoDataUrl: string | null;
  logoSize: number;
  timestamp: number;
}

export function autoDetectContentType(text: string): ContentTypeId | null {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) return 'url';
  if (/^WIFI:T:/i.test(t)) return 'wifi';
  if (/^mailto:/i.test(t)) return 'email';
  if (/^tel:/i.test(t)) return 'phone';
  if (/^smsto:/i.test(t)) return 'sms';
  if (/^BEGIN:VCARD/i.test(t)) return 'vcard';
  if (/^geo:/i.test(t)) return 'geo';
  return null;
}
