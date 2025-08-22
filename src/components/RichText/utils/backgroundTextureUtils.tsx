import React from 'react';
import { FileText, Grid, Palette } from '../../Icons';

export type BackgroundTexture = 'paper' | 'grid' | null;

export interface BackgroundConfig {
  icon: React.ReactElement;
  title: string;
}

/**
 * Gets the next background texture in the cycle: null → paper → grid → null
 */
export function getNextBackgroundTexture(current: BackgroundTexture): BackgroundTexture {
  switch (current) {
    case null:
      return 'paper';
    case 'paper':
      return 'grid';
    case 'grid':
      return null;
    default:
      return null;
  }
}

/**
 * Gets the icon and title configuration for a background texture
 */
export function getBackgroundConfig(texture: BackgroundTexture): BackgroundConfig {
  switch (texture) {
    case 'paper':
      return {
        icon: <FileText size={16} />,
        title: 'Background: Paper'
      };
    case 'grid':
      return {
        icon: <Grid size={16} />,
        title: 'Background: Grid'
      };
    default:
      return {
        icon: <Palette size={16} />,
        title: 'Background: None'
      };
  }
}