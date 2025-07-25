import React from 'react';
import { WordCountStats } from '../utils/textAnalysis';

interface WordCountDisplayProps {
  stats: WordCountStats;
}

export const WordCountDisplay: React.FC<WordCountDisplayProps> = ({ stats }) => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="flex justify-between">
              <span className="text-gray-400">Longest Sentence</span>
              <span className="text-gray-200 font-mono">{stats.longestSentence} words</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Shortest Sentence</span>
              <span className="text-gray-200 font-mono">{stats.shortestSentence} words</span>
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
                    <span className="text-gray-200 font-mono">{keyword.word}</span>
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
                    <span className="text-gray-200 font-mono text-sm">{bigram.phrase}</span>
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
                    <span className="text-gray-200 font-mono text-sm">{trigram.phrase}</span>
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
