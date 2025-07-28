import React from 'react';
import { ImageIcon, Link2, Palette, FileText } from '../../../components/Icons';
import { ContentType } from '../types';

interface ContentTypeIconProps {
  type: ContentType;
  size?: number;
}

export const ContentTypeIcon: React.FC<ContentTypeIconProps> = React.memo(({ type, size = 14 }) => {
  switch (type) {
    case "image":
      return <ImageIcon size={size} className="text-purple-400" />;
    case "link":
      return <Link2 size={size} className="text-blue-400" />;
    case "color":
      return <Palette size={size} className="text-pink-400" />;
    case "text":
    default:
      return <FileText size={size} className="text-gray-400" />;
  }
});

ContentTypeIcon.displayName = 'ContentTypeIcon';