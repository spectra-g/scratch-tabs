import React from "react";
import { StickyNote } from "lucide-react";
import { CalculatorEngine } from "../useCalculatorEngine";

interface CalculatorNotesProps {
  engine: CalculatorEngine;
  tabletId: string;
}

export const CalculatorNotes: React.FC<CalculatorNotesProps> = ({ engine, tabletId }) => {
  const { data } = engine;

  return (
    <div className="flex-grow flex flex-col min-h-0">
      <div className="flex items-center space-x-2 mb-2 px-1 flex-shrink-0">
        <StickyNote className="text-secondary" size={18} />
        <h3 className="text-base font-medium text-main">Notes</h3>
      </div>
      <textarea
        key={`notes-${tabletId}`}
        value={data.notes}
        onChange={(e) => engine.handleNotesChange(e.target.value)}
        className="w-full flex-grow bg-element border border-base p-3 rounded-lg text-main placeholder-muted focus:outline-none focus:border-focus transition-colors resize-none custom-scrollbar text-sm"
        placeholder="Add notes..."
      />
    </div>
  );
};