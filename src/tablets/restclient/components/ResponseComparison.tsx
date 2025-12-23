import React, { useState } from 'react';
import { X, ArrowRightLeft, ChevronDown, ChevronRight } from '../../../components/Icons';
import { ResponseComparison, ComparisonDiff } from '../types';
import { formatValueForDisplay, getDiffTypeClass } from '../utils/comparisonUtils';

interface ResponseComparisonProps {
  comparison: ResponseComparison;
  onClose: () => void;
}

interface DiffSectionProps {
  title: string;
  diffs: ComparisonDiff[];
  isOpen: boolean;
  onToggle: () => void;
}

const DiffSection: React.FC<DiffSectionProps> = ({ title, diffs, isOpen, onToggle }) => {
  if (diffs.length === 0) return null;

  return (
    <div className="border border-base/50 rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-surface-raised/50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-main">{title}</span>
          <span className="text-xs text-muted bg-surface-raised/50 px-2 py-1 rounded">
            {diffs.length} {diffs.length === 1 ? 'difference' : 'differences'}
          </span>
        </div>
      </button>
      
      {isOpen && (
        <div className="border-t border-base/50 divide-y divide-gray-700/30">
          {diffs.map((diff, index) => (
            <DiffRow key={index} diff={diff} />
          ))}
        </div>
      )}
    </div>
  );
};

interface DiffRowProps {
  diff: ComparisonDiff;
}

const DiffRow: React.FC<DiffRowProps> = ({ diff }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="p-3">
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium ${getDiffTypeClass(diff.type)}`}>
          {diff.type}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-main mb-1">
            {diff.path}
          </div>
          <div className="text-sm text-muted mb-2">
            {diff.description}
          </div>
          
          {(diff.oldValue !== undefined || diff.newValue !== undefined) && (
            <div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-primary hover:text-primary mb-2"
              >
                {isExpanded ? 'Hide' : 'Show'} values
              </button>
              
              {isExpanded && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {diff.oldValue !== undefined && (
                    <div>
                      <div className="text-red-400 font-medium mb-1">Old Value:</div>
                      <pre className="bg-canvas/50 border border-base/50 rounded p-2 text-secondary overflow-x-auto custom-scrollbar">
                        {formatValueForDisplay(diff.oldValue)}
                      </pre>
                    </div>
                  )}
                  
                  {diff.newValue !== undefined && (
                    <div>
                      <div className="text-green-400 font-medium mb-1">New Value:</div>
                      <pre className="bg-canvas/50 border border-base/50 rounded p-2 text-secondary overflow-x-auto custom-scrollbar">
                        {formatValueForDisplay(diff.newValue)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ResponseComparisonViewer: React.FC<ResponseComparisonProps> = ({ comparison, onClose }) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['body']));
  
  const toggleSection = (section: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(section)) {
      newOpenSections.delete(section);
    } else {
      newOpenSections.add(section);
    }
    setOpenSections(newOpenSections);
  };
  
  const allDiffs = [
    comparison.statusDiff,
    comparison.sizeDiff,
    ...comparison.headersDiff,
    ...comparison.bodyDiff,
    ...comparison.timingDiff,
  ].filter(Boolean);
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4 border-b border-base/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ArrowRightLeft size={20} className="text-primary" />
            <h3 className="text-lg font-medium text-main">Response Comparison</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-main transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="text-muted">
              <span className="font-medium">Left:</span> {comparison.left.label}
            </div>
            <div className="text-muted">
              <span className="font-medium">Right:</span> {comparison.right.label}
            </div>
          </div>
          <div className="text-muted">
            {allDiffs.length} {allDiffs.length === 1 ? 'difference' : 'differences'} found
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        {allDiffs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted">
              <p className="text-lg">No differences found</p>
              <p className="text-sm mt-1">The responses are identical</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {(comparison.statusDiff || comparison.sizeDiff) && (
              <DiffSection
                title="Response Info"
                diffs={[comparison.statusDiff, comparison.sizeDiff].filter(Boolean) as ComparisonDiff[]}
                isOpen={openSections.has('info')}
                onToggle={() => toggleSection('info')}
              />
            )}
            
            {comparison.headersDiff.length > 0 && (
              <DiffSection
                title="Headers"
                diffs={comparison.headersDiff}
                isOpen={openSections.has('headers')}
                onToggle={() => toggleSection('headers')}
              />
            )}
            
            {comparison.bodyDiff.length > 0 && (
              <DiffSection
                title="Response Body"
                diffs={comparison.bodyDiff}
                isOpen={openSections.has('body')}
                onToggle={() => toggleSection('body')}
              />
            )}
            
            {comparison.timingDiff.length > 0 && (
              <DiffSection
                title="Timing"
                diffs={comparison.timingDiff}
                isOpen={openSections.has('timing')}
                onToggle={() => toggleSection('timing')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};