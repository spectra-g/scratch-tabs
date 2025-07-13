import React from "react";
import { FileText, Shield, Database, Code } from "lucide-react";

export const OGWelcomeScreen: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Main Content for OG Image */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        {/* Header with Logo and Name */}
        <div className="flex items-center mb-6">
          <img
            src="/favicon-gray.svg"
            alt="Scratch Tabs Logo"
            className="w-16 h-16 mr-4"
          />
          <h1 className="text-5xl font-bold text-white">Scratch Tabs</h1>
        </div>

        {/* Main Headline */}
        <h2 className="text-3xl font-semibold text-white mb-10 text-center">
          Ultimate Client-Side Data Editor & Toolkit
        </h2>

        {/* Feature Icons */}
        <div className="flex justify-center space-x-16 mb-12">
          <div className="flex flex-col items-center">
            <div className="p-4 bg-blue-500/20 rounded-full mb-3">
              <Shield size={32} className="text-blue-400" />
            </div>
            <span className="text-gray-300 text-sm">Privacy-First</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="p-4 bg-green-500/20 rounded-full mb-3">
              <Database size={32} className="text-green-400" />
            </div>
            <span className="text-gray-300 text-sm">Local Data</span>
          </div>

          <div className="flex flex-col items-center">
            <div className="p-4 bg-purple-500/20 rounded-full mb-3">
              <Code size={32} className="text-purple-400" />
            </div>
            <span className="text-gray-300 text-sm">Powerful Tools</span>
          </div>
        </div>

        {/* Code Snippet Preview (stylized) */}
        <div className="w-full max-w-lg bg-gray-950 rounded-lg shadow-lg p-4 mb-12 border border-gray-700">
          <div className="flex items-center mb-2">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <pre className="text-sm">
            <span className="text-blue-400">{"{"}</span>
            <br />
            <span className="text-gray-400 ml-4">"name":</span>{" "}
            <span className="text-green-400">"Scratch Tabs"</span>
            <span className="text-gray-500">,</span>
            <br />
            <span className="text-gray-400 ml-4">"features":</span>{" "}
            <span className="text-blue-400">[</span>
            <br />
            <span className="text-green-400 ml-8">"Code Editor"</span>
            <span className="text-gray-500">,</span>
            <br />
            <span className="text-green-400 ml-8">"Data Visualization"</span>
            <span className="text-gray-500">,</span>
            <br />
            <span className="text-green-400 ml-8">"Privacy"</span>
            <br />
            <span className="text-blue-400 ml-4">]</span>
            <br />
            <span className="text-blue-400">{"}"}</span>
          </pre>
        </div>

        {/* Bottom Tagline */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white tracking-wide">
            FREE. PRIVATE. POWERFUL.
          </h3>
        </div>
      </div>
    </div>
  );
};
