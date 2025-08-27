import React from 'react';
import { Palette } from '../../Icons';

export type BackgroundTexture = 'grid' | 'lined' | 'texture' | 'dots' | null;

export interface BackgroundConfig {
  icon: React.ReactElement;
  title: string;
}

/**
 * Gets the next background texture in the cycle: null → lined → texture → dots → grid → null
 */
export function getNextBackgroundTexture(current: BackgroundTexture): BackgroundTexture {
  switch (current) {
    case null:
      return 'lined';
    case 'lined':
      return 'texture';
    case 'texture':
      return 'dots';
    case 'dots':
      return 'grid';
    case 'grid':
      return null;
    default:
      return null;
  }
}

/**
 * Gets the icon and title configuration for a background texture
 * Always uses the same icon regardless of current texture
 */
export function getBackgroundConfig(texture: BackgroundTexture): BackgroundConfig {
  const titles = {
    'lined': 'Background: Lined Paper',
    'texture': 'Background: Texture',
    'dots': 'Background: Dotted Paper',
    'grid': 'Background: Grid',
    null: 'Background: None'
  };

  return {
    icon: <Palette size={16} />,
    title: titles[texture] || 'Background: None'
  };
}