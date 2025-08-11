import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, X, Plus, Globe, Key, FileText, Shield, Clock, Settings } from '../../../../components/Icons';

interface CurlOption {
  flag: string;
  longFlag?: string;
  description: string;
  category: 'request' | 'headers' | 'data' | 'auth' | 'output' | 'connection' | 'misc';
  actionType: 'toggle' | 'value' | 'keyvalue';
  defaultValue?: string;
  example?: string;
}

interface CurlOptionsPaletteProps {
  onAddOption: (option: CurlOption) => void;
  onClose: () => void;
}

// Comprehensive Curl options database
const CURL_OPTIONS: CurlOption[] = [
  // Request options
  { flag: '-X', longFlag: '--request', description: 'HTTP method to use', category: 'request', actionType: 'value', defaultValue: 'GET', example: 'GET, POST, PUT, DELETE' },
  { flag: '-G', longFlag: '--get', description: 'Send data via GET', category: 'request', actionType: 'toggle' },
  { flag: '-I', longFlag: '--head', description: 'Fetch headers only', category: 'request', actionType: 'toggle' },
  { flag: '-L', longFlag: '--location', description: 'Follow redirects', category: 'request', actionType: 'toggle' },
  
  // Headers
  { flag: '-H', longFlag: '--header', description: 'Add custom header', category: 'headers', actionType: 'keyvalue', example: 'Content-Type: application/json' },
  { flag: '-A', longFlag: '--user-agent', description: 'Set User-Agent header', category: 'headers', actionType: 'value', defaultValue: 'curl/7.68.0' },
  { flag: '-e', longFlag: '--referer', description: 'Set Referer header', category: 'headers', actionType: 'value' },
  { flag: '-b', longFlag: '--cookie', description: 'Send cookies', category: 'headers', actionType: 'value', example: 'name=value; name2=value2' },
  
  // Data/Body
  { flag: '-d', longFlag: '--data', description: 'Send POST data', category: 'data', actionType: 'value', example: '{"key": "value"}' },
  { flag: '--data-raw', description: 'Send raw POST data', category: 'data', actionType: 'value' },
  { flag: '--data-binary', description: 'Send binary data', category: 'data', actionType: 'value' },
  { flag: '-F', longFlag: '--form', description: 'Send form data', category: 'data', actionType: 'keyvalue', example: 'field=value' },
  { flag: '-T', longFlag: '--upload-file', description: 'Upload file', category: 'data', actionType: 'value' },
  
  // Authentication
  { flag: '-u', longFlag: '--user', description: 'Basic authentication', category: 'auth', actionType: 'value', example: 'username:password' },
  { flag: '--oauth2-bearer', description: 'OAuth 2.0 Bearer token', category: 'auth', actionType: 'value' },
  { flag: '--digest', description: 'Use HTTP Digest authentication', category: 'auth', actionType: 'toggle' },
  { flag: '--ntlm', description: 'Use NTLM authentication', category: 'auth', actionType: 'toggle' },
  
  // Output
  { flag: '-o', longFlag: '--output', description: 'Write output to file', category: 'output', actionType: 'value', defaultValue: 'output.txt' },
  { flag: '-O', longFlag: '--remote-name', description: 'Use remote filename', category: 'output', actionType: 'toggle' },
  { flag: '-s', longFlag: '--silent', description: 'Silent mode', category: 'output', actionType: 'toggle' },
  { flag: '-v', longFlag: '--verbose', description: 'Verbose output', category: 'output', actionType: 'toggle' },
  { flag: '-w', longFlag: '--write-out', description: 'Output format', category: 'output', actionType: 'value', example: '%{http_code}' },
  
  // Connection
  { flag: '--connect-timeout', description: 'Connection timeout', category: 'connection', actionType: 'value', defaultValue: '30' },
  { flag: '--max-time', description: 'Maximum time for request', category: 'connection', actionType: 'value', defaultValue: '60' },
  { flag: '--retry', description: 'Number of retries', category: 'connection', actionType: 'value', defaultValue: '3' },
  { flag: '--retry-delay', description: 'Delay between retries', category: 'connection', actionType: 'value', defaultValue: '1' },
  { flag: '-k', longFlag: '--insecure', description: 'Allow insecure connections', category: 'connection', actionType: 'toggle' },
  
  // Miscellaneous
  { flag: '--compressed', description: 'Request compressed response', category: 'misc', actionType: 'toggle' },
  { flag: '--include', description: 'Include headers in output', category: 'misc', actionType: 'toggle' },
  { flag: '--fail', description: 'Fail silently on HTTP errors', category: 'misc', actionType: 'toggle' },
  { flag: '--location-trusted', description: 'Follow redirects to any host', category: 'misc', actionType: 'toggle' },
];

const CATEGORY_CONFIG = {
  request: { label: 'Request', icon: Globe, color: 'text-blue-400' },
  headers: { label: 'Headers', icon: Key, color: 'text-green-400' },
  data: { label: 'Data & Body', icon: FileText, color: 'text-yellow-400' },
  auth: { label: 'Authentication', icon: Shield, color: 'text-red-400' },
  output: { label: 'Output', icon: Settings, color: 'text-purple-400' },
  connection: { label: 'Connection', icon: Clock, color: 'text-orange-400' },
  misc: { label: 'Miscellaneous', icon: Settings, color: 'text-gray-400' },
};

export const CurlOptionsPalette: React.FC<CurlOptionsPaletteProps> = ({
  onAddOption,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter options based on search and category
  const filteredOptions = useMemo(() => {
    let options = CURL_OPTIONS;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      options = options.filter(option => 
        option.flag.toLowerCase().includes(query) ||
        option.longFlag?.toLowerCase().includes(query) ||
        option.description.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      options = options.filter(option => option.category === selectedCategory);
    }
    
    return options;
  }, [searchQuery, selectedCategory]);

  // Group options by category
  const groupedOptions = useMemo(() => {
    const groups: Record<string, CurlOption[]> = {};
    
    filteredOptions.forEach(option => {
      if (!groups[option.category]) {
        groups[option.category] = [];
      }
      groups[option.category].push(option);
    });
    
    return groups;
  }, [filteredOptions]);

  // Calculate category counts from search-filtered options (not category-filtered)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Filter only by search, not by category
    let searchFilteredOptions = CURL_OPTIONS;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      searchFilteredOptions = searchFilteredOptions.filter(option => 
        option.flag.toLowerCase().includes(query) ||
        option.longFlag?.toLowerCase().includes(query) ||
        option.description.toLowerCase().includes(query)
      );
    }
    
    // Count options per category
    searchFilteredOptions.forEach(option => {
      counts[option.category] = (counts[option.category] || 0) + 1;
    });
    
    return counts;
  }, [searchQuery]);

  const categories = Object.keys(CATEGORY_CONFIG);

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-200">Curl Options</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search options..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {categories.map((category) => {
            const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
            const count = categoryCounts[category] || 0;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                disabled={count === 0}
              >
                <config.icon size={12} />
                <span>{config.label}</span>
                <span className="bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-full text-xs">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Options list */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {Object.entries(groupedOptions).map(([category, options]) => {
          const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
          
          return (
            <div key={category} className="p-4 border-b border-gray-700/50 last:border-b-0">
              <div className="flex items-center space-x-2 mb-3">
                <config.icon size={16} className={config.color} />
                <h4 className="text-sm font-medium text-gray-300">{config.label}</h4>
                <span className="text-xs text-gray-500">({options.length})</span>
              </div>
              
              <div className="space-y-2">
                {options.map((option) => (
                  <motion.div
                    key={option.flag}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center justify-between p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <code className="text-blue-300 font-mono text-sm">
                          {option.flag}
                        </code>
                        {option.longFlag && (
                          <code className="text-gray-400 font-mono text-xs">
                            {option.longFlag}
                          </code>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {option.description}
                      </p>
                      {option.example && (
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          Example: {option.example}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => onAddOption(option)}
                      className="ml-3 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title={`Add ${option.flag} option`}
                    >
                      <Plus size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
        
        {filteredOptions.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <Search size={24} className="mx-auto mb-2 opacity-50" />
              <p>No options found</p>
              <p className="text-xs">Try adjusting your search or category filter</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};