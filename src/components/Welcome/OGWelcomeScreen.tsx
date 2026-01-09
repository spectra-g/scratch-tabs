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

        {/* Version */}
        <p
          className="text-sm mb-12"
          style={{
            color: '#9ca3af',
            fontFamily: '"Fira Code", "JetBrains Mono", monospace'
          }}
        >
          // v1.14.0
        </p>

        {/* Main Headline - matching landing page */}
        <h2
          className="text-3xl font-normal text-center mb-4"
          style={{
            color: '#FFFFFF',
            maxWidth: '800px',
            lineHeight: '1.5'
          }}
        >
          Finally, a home for your <span style={{ color: '#10b981' }}>temporary data.</span>
        </h2>

        {/* Subheadline */}
        <p
          className="text-xl text-center mb-12"
          style={{
            color: '#9ca3af',
            maxWidth: '700px',
            lineHeight: '1.6'
          }}
        >
          Private workspace for temporary data. No accounts, 100% offline.
        </p>

        {/* Terminal-style feature list */}
        <div
          className="w-full max-w-2xl p-6 mb-8"
          style={{
            backgroundColor: '#0a0a0a',
            border: '1px solid #374151',
            borderRadius: '2px'
          }}
        >
          <div className="space-y-2" style={{ fontFamily: '"Fira Code", "JetBrains Mono", monospace', fontSize: '14px' }}>
            <div style={{ color: '#9ca3af' }}>
              <span style={{ color: '#10b981' }}>+</span> Intelligent format detection & auto-formatting
            </div>
            <div style={{ color: '#9ca3af' }}>
              <span style={{ color: '#10b981' }}>+</span> 40+ formats supported (JSON, CSV, YAML, etc.)
            </div>
            <div style={{ color: '#9ca3af' }}>
              <span style={{ color: '#10b981' }}>+</span> 25+ specialized tablets (JWT, REST, GraphQL)
            </div>
            <div style={{ color: '#9ca3af' }}>
              <span style={{ color: '#10b981' }}>+</span> Powered by Monaco Editor
            </div>
            <div style={{ color: '#9ca3af' }}>
              <span style={{ color: '#10b981' }}>+</span> 100% client-side • No tracking • No accounts
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div
          className="text-center text-xs tracking-widest"
          style={{
            color: '#9ca3af',
            fontFamily: '"Fira Code", "JetBrains Mono", monospace'
          }}
        >
          BUILT_FOR_DEVELOPERS • BY_DEVELOPERS
        </div>
      </div>
    </div>
  );
};
