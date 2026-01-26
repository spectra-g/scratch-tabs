import React from "react";

export const OGWelcomeScreen: React.FC = () => {
  return (
    <div
      className="h-full w-full flex flex-col"
      style={{
        backgroundColor: '#050505',
        fontFamily: '"Fira Code", "JetBrains Mono", monospace'
      }}
    >
      {/* Main Content for OG Image */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Header with Logo and Name */}
        <div className="flex items-center mb-8">
          <img
            src="/favicon-gray.svg"
            alt="Scratch Tabs Logo"
            className="w-10 h-10 mr-4"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <h1
            className="text-5xl font-bold"
            style={{
              color: '#FFFFFF',
              fontFamily: '"Fira Code", "JetBrains Mono", monospace'
            }}
          >
            SCRATCH_TABS
          </h1>
        </div>

        {/* Main Headline - matching landing page */}
        <h2
          className="text-4xl font-bold text-center mb-6"
          style={{
            color: '#FFFFFF',
            maxWidth: '900px',
            lineHeight: '1.4'
          }}
        >
          The Missing Half of Your <span style={{ color: '#10b981' }}>Dev Environment.</span>
        </h2>

        {/* Code Diff Visual */}
        <div
          className="w-full max-w-3xl mb-6 p-6"
          style={{
            backgroundColor: '#0a0a0a',
            border: '1px solid #374151',
            fontFamily: '"Fira Code", "JetBrains Mono", monospace',
            fontSize: '13px'
          }}
        >
          <div className="flex items-start mb-3" style={{ opacity: 0.6 }}>
            <span style={{ color: '#ef4444', marginRight: '12px' }}>-</span>
            <div>
              <span style={{ color: '#a78bfa' }}>const</span> <span style={{ color: '#FFFFFF' }}>workflow</span> = <span style={{ color: '#fbbf24' }}>IDE</span> + <span style={{ color: '#9ca3af' }}>[ Notes, TODOs, JWT.io, JSONLint... ]</span>
            </div>
          </div>
          <div className="flex items-start">
            <span style={{ color: '#10b981', marginRight: '12px' }}>+</span>
            <div>
              <span style={{ color: '#a78bfa' }}>const</span> <span style={{ color: '#FFFFFF' }}>workflow</span> = <span style={{ color: '#fbbf24' }}>IDE</span> + <span style={{ color: '#10b981', fontWeight: 'bold' }}>SCRATCH_TABS</span>
            </div>
          </div>
        </div>

        {/* Subheadline */}
        <p
          className="text-lg text-center mb-10"
          style={{
            color: '#9ca3af',
            maxWidth: '800px',
            lineHeight: '1.6'
          }}
        >
          Your private, offline-first workbench for the data that doesn't belong in git.
        </p>

        {/* Feature Grid */}
        <div
          className="grid grid-cols-2 gap-4 w-full max-w-3xl mb-8"
        >
          <div
            className="p-4"
            style={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #374151'
            }}
          >
            <div
              style={{
                color: '#10b981',
                fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              01 // MONACO_CORE
            </div>
            <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
              VS Code Engine
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.5' }}>
              40+ languages, multi-cursor, regex search
            </p>
          </div>

          <div
            className="p-4"
            style={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #374151'
            }}
          >
            <div
              style={{
                color: '#10b981',
                fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              02 // WORKSPACES
            </div>
            <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
              Persistent State
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.5' }}>
              Split views, drag-and-drop, auto-save
            </p>
          </div>

          <div
            className="p-4"
            style={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #374151'
            }}
          >
            <div
              style={{
                color: '#10b981',
                fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              03 // SMART_VIEWS
            </div>
            <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
              Intelligent UI
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.5' }}>
              JSON → tree, CSV → spreadsheet, live preview
            </p>
          </div>

          <div
            className="p-4"
            style={{
              backgroundColor: '#0a0a0a',
              border: '1px solid #374151'
            }}
          >
            <div
              style={{
                color: '#10b981',
                fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                fontSize: '11px',
                marginBottom: '8px'
              }}
            >
              04 // UTILITIES
            </div>
            <h3 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px' }}>
              Tablet Arsenal
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '12px', lineHeight: '1.5' }}>
              25+ tools: JWT, REST Client, Regex Tester
            </p>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div
          className="text-center text-xs tracking-wider"
          style={{
            color: '#9ca3af',
            fontFamily: '"Fira Code", "JetBrains Mono", monospace'
          }}
        >
          NO_ACCOUNTS • ZERO_DATA_EGRESS • 100%_CLIENT_SIDE
        </div>
      </div>
    </div>
  );
};
