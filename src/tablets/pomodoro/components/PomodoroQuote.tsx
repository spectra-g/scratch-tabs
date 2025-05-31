import React, { useState, useEffect } from 'react';
import { Quote } from '../types';

interface PomodoroQuoteProps {
  quotes: Quote[];
}

export const PomodoroQuote: React.FC<PomodoroQuoteProps> = ({ quotes }) => {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  
  // Select a random quote on mount and when quotes change
  useEffect(() => {
    if (quotes.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setCurrentQuote(quotes[randomIndex]);
  }, [quotes]);
  
  if (!currentQuote) {
    return null;
  }
  
  return (
    <div className="text-center">
      <blockquote className="text-gray-300 italic">
        "{currentQuote.text}"
      </blockquote>
      <cite className="text-sm text-gray-400 mt-2 block">
        — {currentQuote.author}
      </cite>
    </div>
  );
};