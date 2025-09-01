import React from 'react';
import { SmartViewProps } from '../../../../views/registry';
import { SvgViewer } from './SvgViewer';

/**
 * SVG Smart View wrapper component
 * This provides the interface between the Smart View system and the SVG Viewer
 */
export const SvgSmartView: React.FC<SmartViewProps> = (props) => {
  return <SvgViewer {...props} />;
};