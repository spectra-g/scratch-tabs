import React from 'react';
import { Eye, Target, AlertTriangle, Zap, MessageSquare } from 'lucide-react';
import { WordCountStats } from '../utils/textAnalysis';

interface WordCountDisplayProps {
  stats: WordCountStats;
  onHighlight?: (type: string, data?: any) => void;
  activeHighlight?: string;
}

export const WordCountDisplay: React.FC<WordCountDisplayProps> = ({ 
  stats, 
  onHighlight,
  activeHighlight 
}) => {
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

  return (
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
            <div className="flex justify-between">
              <span className="text-gray-400">Avg. Sentence Length</span>
              <span className="text-gray-200 font-mono">{stats.avgSentenceLength} words</span>
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
            <div className="flex justify-between">
              <span className="text-gray-400">Flesch-Kincaid Grade</span>
              <span className="text-gray-200 font-mono">{stats.fleschKincaidGrade}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Reading Time</span>
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

        {/* NEW: Stylistic Suggestions */}
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
              </div>
            </div>
          </div>
        </div>
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
  );
};