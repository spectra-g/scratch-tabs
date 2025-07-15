import React from "react";

interface ShapeSnapInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasMode: "light" | "dark";
}

export const ShapeSnapInfoModal: React.FC<ShapeSnapInfoModalProps> = ({
  isOpen,
  onClose,
  canvasMode,
}) => {
  if (!isOpen) return null;

  const isDark = canvasMode === "dark";
  const bgColor = isDark ? "bg-gray-800" : "bg-white";
  const textColor = isDark ? "text-gray-100" : "text-gray-900";
  const borderColor = isDark ? "border-gray-600" : "border-gray-300";
  const overlayColor = isDark ? "bg-black/50" : "bg-black/30";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${overlayColor}`}
      onClick={onClose}
    >
      <div
        className={`${bgColor} ${textColor} rounded-lg shadow-xl max-w-2xl mx-4 max-h-[80vh] overflow-y-auto custom-scrollbar border ${borderColor}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Shape Snap - Quick Sketch Tool
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-200 ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-200"}`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Purpose */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-blue-500">
                Purpose
              </h3>
              <p className="text-sm leading-relaxed">
                Shape Snap is a quick, frictionless way to draw sketches that
                explain concepts or systems. It's not specific to any diagram
                type (like UML or system architecture) but provides a freehand
                way to explain ideas visually.
              </p>
            </div>

            {/* Drawing Shapes */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-green-500">
                Drawing Shapes
              </h3>
              <p className="text-sm mb-3">
                You can draw these shapes by simply drawing a rough version with
                your mouse - they'll be automatically corrected to perfect
                shapes:
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current rounded"></div>
                  <span>Squares & Rectangles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current rounded-full"></div>
                  <span>Circles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current transform rotate-45"></div>
                  <span>Diamonds</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 2L2 20h20L12 2z"
                    />
                  </svg>
                  <span>Triangles</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 17L17 7M17 7H7M17 7V17"
                    />
                  </svg>
                  <span>Straight Arrows</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7 Q12 4 20 7"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 4 L20 7 L17 10"
                    />
                  </svg>
                  <span>Curved Arrows</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 7 L4 12 L20 12 L20 17"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14 L20 17 L23 14"
                    />
                  </svg>
                  <span>Orthogonal Arrows</span>
                </div>
              </div>
            </div>

            {/* Arrow Types & Tips */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-purple-500">
                Arrow Types & Tips
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Arrow Types:</strong> Draw different arrow styles:
                </p>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>Straight arrows:</strong> Direct line with arrow heads</li>
                  <li>• <strong>Curved arrows:</strong> Smooth curved path between points</li>
                  <li>• <strong>Orthogonal arrows:</strong> Right-angled path (like flowcharts)</li>
                </ul>
                <p className="mt-2">
                  <strong>Arrow Tips:</strong> Click on any arrow's tip to cycle through different arrow head
                  styles. This works for both the start and end points of all arrow types.
                </p>
              </div>
            </div>

            {/* Interaction */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-orange-500">
                Interaction
              </h3>
              <ul className="text-sm space-y-1">
                <li>
                  • <strong>Drag shapes</strong> to move them around the canvas
                </li>
                <li>
                  • <strong>Double-click shapes</strong> to add or edit labels
                </li>
                <li>
                  • <strong>Select tool</strong> for moving and editing shapes
                </li>
                <li>
                  • <strong>Eraser tool</strong> to delete shapes
                </li>
                <li>
                  • <strong>Double-click empty space</strong> to add text
                </li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-indigo-500">
                Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                  <span>Dark/Light Mode Toggle</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  <span>Sketch Mode (rough drawing)</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h18v18H3zM9 9h6v6H9z"
                    />
                  </svg>
                  <span>Background Patterns</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Export to PNG</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span>Undo/Redo</span>
                </div>
              </div>
            </div>

            {/* Background Patterns */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-cyan-500">
                Background Patterns
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  Click the grid icon to cycle through different background patterns:
                </p>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>Notepad:</strong> Classic lined paper grid (default)</li>
                  <li>• <strong>None:</strong> Clean background without grid</li>
                  <li>• <strong>Dot Grid:</strong> Subtle dots for precise positioning</li>
                  <li>• <strong>Graph Paper:</strong> Fine grid lines for detailed work</li>
                  <li>• <strong>Isometric:</strong> 60-degree grid for 3D-style diagrams</li>
                </ul>
                <p className="mt-2">
                  Background patterns are independent of sketch mode and provide a soft paper texture.
                </p>
              </div>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-yellow-500">
                Quick Tips
              </h3>
              <ul className="text-sm space-y-1">
                <li>
                  • Use the <strong>draw tool</strong> to create shapes by
                  sketching
                </li>
                <li>
                  • Enable <strong>grid snapping</strong> for precise alignment
                </li>
                <li>
                  • Try <strong>sketch mode</strong> for a more hand-drawn look
                </li>
                <li>
                  • Cycle through <strong>background patterns</strong> for different drawing styles
                </li>
                <li>
                  • Use <strong>text tool</strong> to add labels and
                  descriptions
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
