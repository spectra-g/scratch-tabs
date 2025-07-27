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
  CheckCircle,
  AlertCircle,
  XCircle,
  Cpu
} from 'lucide-react';
import { 
  WordCountStats, 
  DeviceType, 
  WritingGoal, 
  WRITING_TARGETS, 
  evaluateMetricTarget,
  getSentenceLengthDistribution
} from '../utils/textAnalysis';

interface WordCountDisplayProps {
  stats: WordCountStats;
  deviceType: DeviceType;
  writingGoal: WritingGoal;
  targetKeyword?: string;
  text: string;
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
  text,
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
        return <div title="Within target range"><CheckCircle size={12} className="text-green-400" /></div>;
      case 'warning':
        return <div title="Close to target boundary"><AlertCircle size={12} className="text-yellow-400" /></div>;
      case 'poor':
        return <div title="Outside target range"><XCircle size={12} className="text-red-400" /></div>;
    }
  };


  const targets = WRITING_TARGETS[writingGoal];

  // PacingGraph sub-component for sentence length distribution
  const PacingGraph: React.FC<{ text: string }> = ({ text }) => {
    const distribution = getSentenceLengthDistribution(text);
    
    if (distribution.length === 0) {
      return (
        <div className="text-center text-gray-500 text-xs py-2">
          No sentences to analyze
        </div>
      );
    }
    
    const maxCount = Math.max(...distribution.map(item => item.count));
    
    return (
      <div className="space-y-2 mt-3">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Sentence Length Distribution
        </h4>
        <div className="space-y-1">
          {distribution.map(item => (
            <div key={item.bucket} className="flex items-center text-xs">
              <div className="w-16 text-gray-400 text-right mr-2 flex-shrink-0">
                {item.bucket}
              </div>
              <div className="flex-1 flex items-center">
                <div 
                  className="bg-blue-500/30 h-3 rounded-sm mr-2"
                  style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }}
                />
                <span className="text-gray-300 font-mono">
                  {item.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1 - Device Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preview As
            </label>
            <DeviceSelector />
          </div>

          {/* Column 2 - Writing Goal and Target Keyword */}
          <div className="space-y-3">
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

            {/* Target Keyword (for SEO) */}
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


          {/* Advanced Readability */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Advanced Readability
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
                <span className="text-gray-400">Gunning Fog Index</span>
                <span className="text-gray-200 font-mono">{stats.gunningFogIndex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">SMOG Index</span>
                <span className="text-gray-200 font-mono">{stats.smogIndex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Coleman-Liau Index</span>
                <span className="text-gray-200 font-mono">{stats.colemanLiauIndex}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Lexical Density</span>
                <span className="text-gray-200 font-mono">{stats.lexicalDensity}%</span>
              </div>
            </div>
          </div>

          {/* Pacing & Rhythm */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Pacing & Rhythm
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
            
            {/* Sentence Length Distribution Graph */}
            <PacingGraph text={text} />
          </div>

          {/* Time Estimates */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Time Estimates
            </h3>
            <div className="space-y-2">
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

          {/* LLM Token Estimates */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide flex items-center">
              <Cpu size={16} className="mr-2 text-blue-400" />
              LLM Token Estimates
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">GPT-3.5/4</span>
                <span className="text-gray-200 font-mono">{stats.llmTokens.gpt35.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Claude</span>
                <span className="text-gray-200 font-mono">{stats.llmTokens.claude.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">LLaMA</span>
                <span className="text-gray-200 font-mono">{stats.llmTokens.llama.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gemini</span>
                <span className="text-gray-200 font-mono">{stats.llmTokens.gemini.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Style & Redundancy */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide flex items-center">
              <AlertTriangle size={16} className="mr-2 text-yellow-400" />
              Style & Redundancy
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
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center">
                  <AlertTriangle size={14} className="mr-2 text-purple-400" />
                  Run-on Sentences
                </span>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`text-gray-200 font-mono ${getClickableStyle('run-on-sentences')}`}
                    onClick={() => handleHighlight('run-on-sentences')}
                    title="Click to highlight run-on sentences"
                  >
                    {stats.longSentences.length}
                  </span>
                  <Eye size={14} className="text-gray-500" />
                  {getTargetIndicator(stats.longSentences.length, { max: 0 })}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center">
                  <Zap size={14} className="mr-2 text-cyan-400" />
                  Filler Words
                </span>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`text-gray-200 font-mono ${getClickableStyle('filler-words')}`}
                    onClick={() => handleHighlight('filler-words')}
                    title="Click to highlight filler words"
                  >
                    {stats.fillerWords.length}
                  </span>
                  <Eye size={14} className="text-gray-500" />
                  {getTargetIndicator(stats.fillerWords.length, { max: 5 })}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center">
                  <Target size={14} className="mr-2 text-pink-400" />
                  Redundant Phrases
                </span>
                <div className="flex items-center space-x-2">
                  <span 
                    className={`text-gray-200 font-mono ${getClickableStyle('redundant-phrases')}`}
                    onClick={() => handleHighlight('redundant-phrases')}
                    title="Click to highlight redundant phrases"
                  >
                    {stats.redundantPhrases.length}
                  </span>
                  <Eye size={14} className="text-gray-500" />
                  {getTargetIndicator(stats.redundantPhrases.length, { max: 0 })}
                </div>
              </div>
            </div>
          </div>

          {/* Punctuation */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
              Punctuation
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Question Count</span>
                <span className="text-gray-200 font-mono">{stats.questionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Exclamation Count</span>
                <span className="text-gray-200 font-mono">{stats.exclamationCount}</span>
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
          {/* Keyword Density (only show when target keyword is set) */}
          {writingGoal === 'blog' && targetKeyword && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide flex items-center">
                <Target size={16} className="mr-2 text-green-400" />
                Keyword Density
              </h3>
              {(() => {
                // Use the target keyword density from stats
                const density = stats.targetKeywordDensity?.density || 0;
                const count = stats.targetKeywordDensity?.count || 0;
                
                return (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Target Keyword</span>
                      <div className="flex items-center space-x-2">
                        <span 
                          className={`text-gray-200 font-mono ${getClickableStyle('keyword', targetKeyword)}`}
                          onClick={() => handleHighlight('keyword', targetKeyword)}
                          title={`Click to highlight all instances of "${targetKeyword}"`}
                        >
                          "{targetKeyword}"
                        </span>
                        <Eye size={12} className="text-gray-500" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Current Density</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-400 text-sm font-mono">{density}%</span>
                        <span className="text-gray-500 text-xs">({count} occurrences)</span>
                        {getTargetIndicator(density, {
                          min: targets.keywordDensityMin,
                          max: targets.keywordDensityMax
                        })}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Target Range</span>
                      <span className="text-gray-300 text-sm font-mono">
                        {targets.keywordDensityMin}% - {targets.keywordDensityMax}%
                      </span>
                    </div>
                    
                    {/* Progress bar showing density relative to target */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0%</span>
                        <span>{Math.max(targets.keywordDensityMax, density)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="relative h-2 rounded-full overflow-hidden">
                          {/* Target range background */}
                          <div 
                            className="absolute bg-green-500/30 h-full"
                            style={{
                              left: `${(targets.keywordDensityMin / Math.max(targets.keywordDensityMax, density)) * 100}%`,
                              width: `${((targets.keywordDensityMax - targets.keywordDensityMin) / Math.max(targets.keywordDensityMax, density)) * 100}%`
                            }}
                          />
                          {/* Current density indicator */}
                          <div 
                            className={`absolute h-full w-1 ${
                              density >= targets.keywordDensityMin && density <= targets.keywordDensityMax
                                ? 'bg-green-400'
                                : density < targets.keywordDensityMin
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                            }`}
                            style={{
                              left: `${(density / Math.max(targets.keywordDensityMax, density)) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

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