import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, AlertCircle } from '../../../components/Icons';

interface OmniInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  parsedDate: Date | null;
}

export const OmniInput: React.FC<OmniInputProps> = ({
  value,
  onChange,
  error,
  parsedDate
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Example inputs for placeholder cycling
  const examples = [
    'now',
    '1672531200',
    '2025-09-01T12:00:00Z',
    'yesterday at 3pm',
    '3 weeks ago',
    '2025-01-01 15:30:00'
  ];

  const [currentExample, setCurrentExample] = useState(0);

  useEffect(() => {
    if (!isFocused && !value) {
      const interval = setInterval(() => {
        setCurrentExample(prev => (prev + 1) % examples.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isFocused, value, examples.length]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const getStatusIcon = () => {
    if (!value.trim()) {
      return <Calendar className="text-gray-400" size={20} />;
    }
    if (error) {
      return <AlertCircle className="text-red-400" size={20} />;
    }
    if (parsedDate) {
      return <Clock className="text-green-400" size={20} />;
    }
    return <Calendar className="text-gray-400" size={20} />;
  };

  const getStatusColor = () => {
    if (error) return 'border-red-500 bg-red-500/5';
    if (parsedDate) return 'border-green-500 bg-green-500/5';
    return 'border-gray-600 bg-gray-800';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        Omni-Input
        <span className="text-gray-500 font-normal ml-2">
          Enter any date/time format
        </span>
      </label>
      
      <div className={`relative flex items-center transition-all duration-200 ${getStatusColor()} border rounded-lg`}>
        <div className="absolute left-3 flex items-center">
          {getStatusIcon()}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFocused || value ? 'Enter date/time...' : examples[currentExample]}
          className="w-full pl-12 pr-4 py-3 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none text-lg"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Status message */}
      <div className="min-h-[1.5rem] flex items-center">
        {error && (
          <p className="text-red-400 text-sm flex items-center">
            <AlertCircle size={14} className="mr-1" />
            {error}
          </p>
        )}
        {parsedDate && !error && (
          <p className="text-green-400 text-sm flex items-center">
            <Clock size={14} className="mr-1" />
            Parsed successfully
          </p>
        )}
        {!value.trim() && (
          <p className="text-gray-500 text-sm">
            Try: timestamps, ISO dates, or natural language like "3 days ago"
          </p>
        )}
      </div>
    </div>
  );
};