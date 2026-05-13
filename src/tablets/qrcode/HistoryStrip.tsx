import React from 'react';
import type { HistoryItem } from './contentTypes';

interface Props {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
}

const TYPE_LABELS: Record<string, string> = {
  url: 'URL',
  text: 'TXT',
  wifi: 'WiFi',
  email: 'Mail',
  phone: 'Tel',
  sms: 'SMS',
  vcard: 'Card',
  geo: 'Geo',
};

export const HistoryStrip: React.FC<Props> = ({ history, onRestore }) => {
  if (history.length === 0) return null;

  return (
    <div className="border-t border-base/30 px-3 py-2">
      <div className="text-xs text-muted mb-1.5">Recent</div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-base/30">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onRestore(item)}
            title={new Date(item.timestamp).toLocaleString()}
            className="relative flex-shrink-0 w-14 h-14 rounded border border-base/40 overflow-hidden hover:border-primary/50 hover:ring-1 hover:ring-primary/30 transition-all group"
          >
            <img
              src={item.thumbDataUrl}
              alt={`QR: ${item.contentType}`}
              className="w-full h-full object-contain bg-white"
            />
            <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-medium bg-black/50 text-white py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {TYPE_LABELS[item.contentType] ?? item.contentType}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
