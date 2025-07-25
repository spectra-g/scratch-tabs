import React, { useEffect, useRef, useState } from 'react';
import { 
  Eye, 
  Target, 
  AlertTriangle, 
  Zap, 
  MessageSquare, 
  Monitor, 
  Tablet, 
  Smartphone, 
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { 
  WordCountStats, 
  DeviceType, 
  WritingGoal, 
  WRITING_TARGETS, 
  evaluateMetricTarget,
  generateExportReport 
} from '../utils/textAnalysis';

interface WordCountDisplayProps {
  stats: WordCountStats;
  deviceType: DeviceType;
  writingGoal: WritingGoal;
  targetKeyword?: string;
  onHighlight?: (type: string, data?: any) => void;
  activeHighlight?: string;
  onDeviceChange: (device: DeviceType) => void;
  onWritingGoalChange: (goal: WritingGoal) => void;
  onTargetKeywordChange: (keyword: string) => void;
}

export const WordCountDisplay: React.FC<WordCountDisplayProps> = ({ 
  stats, 
  deviceType,
  writingGoal,
  targetKeyword,
  onHighlight,
  activeHighlight,
  onDeviceChange,
  onWritingGoalChange,
  onTargetKeywordChange
}) => {
  const [showStickyPreview, setShowStickyPreview] = useState(false);
  const controlPanelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const formatTime = (time: { minutes: number; seconds: number }) => {
    if (time.minutes === 0) {
      return `${time.seconds}s`;
    }
    return `${time.minutes}m ${time.seconds}s`;
  };

  const formatHandwritingTime = (time: { hours: number; minutes: number }) => {
    if (time.hours === 0) {
      return `${time.minutes}m`;
    }
    return `${time.hours}h ${time.minutes}m`;
  };

  const handleHighlight = (type: string, data?: any) => {
    if (onHighlight) {
      onHighlight(type, data);
    }
  };

  const isActive = (type: string, data?: any) => {
    if (type === 'keyword') {
      return activeHighlight === `keyword-${data}`;
    }
    return activeHighlight === type;
  };

  const getClickableStyle = (type: string, data?: any) => {
    const baseStyle = "cursor-pointer transition-colors hover:bg-blue-500/10 rounded px-1 -mx-1";
    const activeStyle = isActive(type, data) ? "bg-blue-500/20 text-blue-300" : "";
    return `${baseStyle} ${activeStyle}`;
  };

  const getTargetIndicator = (value: number, target: { min?: number; max?: number }) => {
    const status = evaluateMetricTarget(value, target);
    switch (status) {
      case 'good':
        return <CheckCircle size={12} className="text-green-400" title="Within target range" />;
      case 'warning':
        return <AlertCircle size={12} className="text-yellow-400" title="Close to target boundary" />;
      case 'poor':
        return <XCircle size={12} className="text-red-400" title="Outside target range" />;
    }
  };

  const handleExportReport = () => {
    const report = generateExportReport(stats, deviceType, writingGoal, targetKeyword);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `word-count-analysis-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const targets = WRITING_TARGETS[writingGoal];

  // Scroll detection for sticky preview
  useEffect(() => {
    const container = containerRef.current?.parentElement; // The scrollable container
    const controlPanel = controlPanelRef.current;
    
    if (!container || !controlPanel) return;
    
    const handleScroll = () => {
      const controlPanelRect = controlPanel.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Show sticky when control panel is scrolled out of view (top edge above container)
      const shouldShow = controlPanelRect.bottom < containerRect.top + 50; // 50px buffer
      setShowStickyPreview(shouldShow);
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Device selector component for reuse
  const DeviceSelector: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
    <div className={compact ? "flex space-x-1" : "grid grid-cols-2 gap-1 bg-gray-700/50 rounded-md p-1"}>
      <button
        onClick={() => onDeviceChange('standard')}
        className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-xs transition-colors ${
          deviceType === 'standard' 
            ? 'bg-blue-500/20 text-blue-300' 
            : 'text-gray-400 hover:text-gray-200'
        } ${compact ? 'bg-gray-700/50' : ''}`}
      >
        <FileText size={12} />
        <span>Standard</span>
      </button>
      <button
        onClick={() => onDeviceChange('desktop')}
        className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-xs transition-colors ${
          deviceType === 'desktop' 
            ? 'bg-blue-500/20 text-blue-300' 
            : 'text-gray-400 hover:text-gray-200'
        } ${compact ? 'bg-gray-700/50' : ''}`}
      >
        <Monitor size={12} />
        <span>Desktop</span>
      </button>
      <button
        onClick={() => onDeviceChange('tablet')}
        className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-xs transition-colors ${
          deviceType === 'tablet' 
            ? 'bg-blue-500/20 text-blue-300' 
            : 'text-gray-400 hover:text-gray-200'
        } ${compact ? 'bg-gray-700/50' : ''}`}
      >
        <Tablet size={12} />
        <span>Tablet</span>
      </button>
      <button
        onClick={() => onDeviceChange('mobile')}
        className={`flex items-center justify-center space-x-1 px-2 py-1.5 rounded text-xs transition-colors ${
          deviceType === 'mobile' 
            ? 'bg-blue-500/20 text-blue-300' 
            : 'text-gray-400 hover:text-gray-200'
        } ${compact ? 'bg-gray-700/50' : ''}`}
      >
        <Smartphone size={12} />
        <span>Mobile</span>
      </button>
    </div>
  );

  return (
    <div ref={containerRef} className="space-y-6 relative">
      {/* Sticky Preview As - Only shown when scrolled */}
      {showStickyPreview && (
        <div className="sticky top-0 z-10 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700/50 p-3 rounded-lg mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Preview As</span>
            <DeviceSelector compact={true} />
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div ref={controlPanelRef} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1 - Device Preview + Export Button */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preview As
              </label>
              <DeviceSelector />
            </div>
            
            {/* Export Button - Always below Preview As */}
            <button
              onClick={handleExportReport}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-md transition-colors"
            >
              <Download size={16} />
              <span>Export Report</span>
            </button>
          </div>

          {/* Column 2 - Writing Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Writing Goal
            </label>
            <select
              value={writingGoal}
              onChange={(e) => onWritingGoalChange(e.target.value as WritingGoal)}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
            >
              <option value="general">General Audience</option>
              <option value="technical">Technical Document</option>
              <option value="blog">Blog Post (SEO)</option>
              <option value="academic">Academic Paper</option>
            </select>
          </div>

          {/* Column 3 - Target Keyword (for SEO) */}
          {writingGoal === 'blog' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Keyword
              </label>
              <input
                type="text"
                value={targetKeyword || ''}
                onChange={(e) => onTargetKeywordChange(e.target.value)}
                placeholder="Enter target keyword..."
                className="w-full bg-gray-700/50 border border-gray-600/50 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Core Counts */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Core Counts
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Words</span>
                <span className="text-gray-200 font-mono">{stats.words.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Unique Words</span>
                <span className="text-gray-200 font-mono">{stats.uniqueWords.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Characters</span>
                <span className="text-gray-200 font-mono">{stats.characters.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Characters (no spaces)</span>
                <span className="text-gray-200 font-mono">{stats.charactersNoSpaces.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sentences</span>
                <span className="text-gray-200 font-mono">{stats.sentences.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Paragraphs</span>
                <span className="text-gray-200 font-mono">{stats.paragraphs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lines</span>
                <span className="text-gray-200 font-mono">{stats.lines.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">
                  {deviceType === 'standard' ? 'Pages' : 'Screenfuls'}
                </span>
                <span className="text-gray-200 font-mono">
                  {deviceType === 'standard' ? stats.pages : stats.screenfuls}
                </span>
              </div>
            </div>
          </div>

          {/* Averages & Lengths */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Averages & Lengths
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Longest Sentence</span>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`text-gray-200 font-mono ${getClickableStyle('longest-sentence')}`}
                    onClick={() => handleHighlight('longest-sentence')}
                    title="Click to highlight longest sentence"
                  >
                    {stats.longestSentence} words
                  </span>
                  <Eye size={14} className="text-gray-500" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Shortest Sentence</span>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`text-gray-200 font-mono ${getClickableStyle('shortest-sentence')}`}
                    onClick={() => handleHighlight('shortest-sentence')}
                    title="Click to highlight shortest sentence"
                  >
                    {stats.shortestSentence} words
                  </span>
                  <Eye size={14} className="text-gray-500" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg. Sentence Length</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-200 font-mono">{stats.avgSentenceLength} words</span>
                  {getTargetIndicator(stats.avgSentenceLength, { max: targets.avgSentenceLengthMax })}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Sentence Length</span>
                <span className="text-gray-200 font-mono">{stats.avgSentenceLengthChars} chars</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Word Length</span>
                <span className="text-gray-200 font-mono">{stats.avgWordLength} chars</span>
              </div>
            </div>
          </div>

          {/* Readability & Time */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Readability & Time
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Syllables</span>
                <span className="text-gray-200 font-mono">{stats.syllables.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Flesch-Kincaid Grade</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-200 font-mono">{stats.fleschKincaidGrade}</span>
                  {getTargetIndicator(stats.fleschKincaidGrade, {
                    min: targets.fleschKincaidMin,
                    max: targets.fleschKincaidMax
                  })}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">
                  Reading Time ({deviceType})
                </span>
                <span className="text-gray-200 font-mono">{formatTime(stats.readingTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Speaking Time</span>
                <span className="text-gray-200 font-mono">{formatTime(stats.speakingTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Handwriting Time</span>
                <span className="text-gray-200 font-mono">{formatHandwritingTime(stats.handwritingTime)}</span>
              </div>
            </div>
          </div>

          {/* Stylistic Suggestions */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide flex items-center">
              <AlertTriangle size={16} className="mr-2 text-yellow-400" />
              Stylistic Suggestions
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center">
                  <MessageSquare size={14} className="mr-2 text-orange-400" />
                  Passive Voice
                </span>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`text-gray-200 font-mono ${getClickableStyle('passive-voice')}`}
                    onClick={() => handleHighlight('passive-voice')}
                    title="Click to highlight passive voice sentences"
                  >
                    {stats.passiveVoiceSentences.length}
                  </span>
                  <Eye size={14} className="text-gray-500" />
                  {getTargetIndicator(stats.passiveVoiceSentences.length, { max: targets.passiveVoiceMax })}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center">
                  <Zap size={14} className="mr-2 text-orange-400" />
                  Adverbs (-ly)
                </span>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`text-gray-200 font-mono ${getClickableStyle('adverbs')}`}
                    onClick={() => handleHighlight('adverbs')}
                    title="Click to highlight adverbs"
                  >
                    {stats.adverbs.length}
                  </span>
                  <Eye size={14} className="text-gray-500" />
                  {getTargetIndicator(stats.adverbs.length, { max: targets.adverbsMax })}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center">
                  <Target size={14} className="mr-2 text-red-400" />
                  Weakening Phrases
                </span>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`text-gray-200 font-mono ${getClickableStyle('weakening-phrases')}`}
                    onClick={() => handleHighlight('weakening-phrases')}
                    title="Click to highlight weakening phrases"
                  >
                    {stats.weakeningPhrases.length}
                  </span>
                  <Eye size={14} className="text-gray-500" />
                  {getTargetIndicator(stats.weakeningPhrases.length, { max: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Readability (only show for mobile) */}
          {deviceType === 'mobile' && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide flex items-center">
                <Smartphone size={16} className="mr-2 text-blue-400" />
                Mobile Readability
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center">
                    <AlertTriangle size={14} className="mr-2 text-red-400" />
                    Wall of Text Paragraphs
                  </span>
                  <div className="flex items-center space-x-2">
                    <span 
                      className={`text-gray-200 font-mono ${getClickableStyle('wall-of-text')}`}
                      onClick={() => handleHighlight('wall-of-text')}
                      title="Click to highlight dense paragraphs"
                    >
                      {stats.wallOfTextParagraphs.length}
                    </span>
                    <Eye size={14} className="text-gray-500" />
                    {getTargetIndicator(stats.wallOfTextParagraphs.length, { max: 0 })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Top Keywords */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Top Keywords
            </h3>
            {stats.topKeywords.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No keywords found</p>
            ) : (
              <div className="space-y-2">
                {stats.topKeywords.map((keyword, index) => (
                  <div key={keyword.word} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-4">#{index + 1}</span>
                      <span 
                        className={`text-gray-200 font-mono ${getClickableStyle('keyword', keyword.word)}`}
                        onClick={() => handleHighlight('keyword', keyword.word)}
                        title={`Click to highlight all instances of "${keyword.word}"`}
                      >
                        {keyword.word}
                      </span>
                      <Eye size={12} className="text-gray-500" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">{keyword.count}×</span>
                      <span className="text-blue-400 text-sm font-mono">{keyword.density}%</span>
                      {targetKeyword && keyword.word.toLowerCase() === targetKeyword.toLowerCase() && 
                        getTargetIndicator(keyword.density, {
                          min: targets.keywordDensityMin,
                          max: targets.keywordDensityMax
                        })
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 2-word Phrases */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Top 2-word Phrases
            </h3>
            {stats.topBigrams.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No phrases found</p>
            ) : (
              <div className="space-y-2">
                {stats.topBigrams.map((bigram, index) => (
                  <div key={bigram.phrase} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-4">#{index + 1}</span>
                      <span 
                        className={`text-gray-200 font-mono text-sm ${getClickableStyle('keyword', bigram.phrase)}`}
                        onClick={() => handleHighlight('keyword', bigram.phrase)}
                        title={`Click to highlight all instances of "${bigram.phrase}"`}
                      >
                        {bigram.phrase}
                      </span>
                      <Eye size={12} className="text-gray-500" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">{bigram.count}×</span>
                      <span className="text-green-400 text-sm font-mono">{bigram.density}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 3-word Phrases */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Top 3-word Phrases
            </h3>
            {stats.topTrigrams.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No phrases found</p>
            ) : (
              <div className="space-y-2">
                {stats.topTrigrams.map((trigram, index) => (
                  <div key={trigram.phrase} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 w-4">#{index + 1}</span>
                      <span 
                        className={`text-gray-200 font-mono text-sm ${getClickableStyle('keyword', trigram.phrase)}`}
                        onClick={() => handleHighlight('keyword', trigram.phrase)}
                        title={`Click to highlight all instances of "${trigram.phrase}"`}
                      >
                        {trigram.phrase}
                      </span>
                      <Eye size={12} className="text-gray-500" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400 text-sm">{trigram.count}×</span>
                      <span className="text-purple-400 text-sm font-mono">{trigram.density}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};