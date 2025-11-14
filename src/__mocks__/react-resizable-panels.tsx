import React from 'react';

export const Panel: React.FC<any> = ({ children, ...props }) => (
  <div data-testid="resizable-panel" {...props}>
    {children}
  </div>
);

export const PanelGroup: React.FC<any> = ({ children, ...props }) => (
  <div data-testid="resizable-panel-group" {...props}>
    {children}
  </div>
);

export const PanelResizeHandle: React.FC<any> = (props) => (
  <div data-testid="resize-handle" {...props} />
);
