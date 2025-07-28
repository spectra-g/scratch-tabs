import React, { useState } from 'react';
import { X, ArrowRightLeft, Check, Clock, Plus } from '../../../components/Icons';
import { ComparisonItem, ResponseHistoryItem, HttpResponse } from '../types';
import { 
  createComparisonItem, 
  createCurrentComparisonItem, 
  canCompareItems 
} from '../utils/comparisonUtils';
import { formatTime, getStatusCodeColor } from '../utils/responseUtils';

interface ComparisonSelectorProps {
  responseHistory: ResponseHistoryItem[];
  currentResponse: HttpResponse | null;
  currentMethod: string;
  currentUrl: string;
  selectedItems: ComparisonItem[];
  onSelectionChange: (items: ComparisonItem[]) => void;
  onStartComparison: (items: ComparisonItem[]) => void;
  onClose: () => void;
}

interface SelectableItemProps {
  item: ComparisonItem;
  isSelected: boolean;
  onToggle: (item: ComparisonItem) => void;
  disabled: boolean;
}

const SelectableItem: React.FC<SelectableItemProps> = ({ item, isSelected, onToggle, disabled }) => {
  return (
    <div
      className={`
        border rounded-lg p-3 cursor-pointer transition-all
        ${isSelected 
          ? 'border-blue-500/50 bg-blue-500/10' 
          : 'border-gray-700/50 hover:border-gray-600/50 hover:bg-gray-800/30'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && onToggle(item)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}
          `}>
            {isSelected && <Check size={12} className="text-white" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-200">{item.method}</span>
              <span className="text-gray-400 truncate">{item.url}</span>
            </div>
            
            <div className="flex items-center space-x-3 mt-1 text-sm">
              <span className={`font-medium ${getStatusCodeColor(item.response.status)}`}>
                {item.response.status}
              </span>
              
              <span className="text-gray-400 flex items-center">
                <Clock size={12} className="mr-1" />
                {formatTime(item.response.timing.total)}
              </span>
              
              <span className="text-gray-400">
                {item.id === 'current' ? 'Current' : new Date(item.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        
        {item.id === 'current' && (
          <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">
            Current
          </div>
        )}
      </div>
    </div>
  );
};

export const ComparisonSelector: React.FC<ComparisonSelectorProps> = ({
  responseHistory,
  currentResponse,
  currentMethod,
  currentUrl,
  selectedItems,
  onSelectionChange,
  onStartComparison,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create available items for comparison
  const availableItems: ComparisonItem[] = [];
  
  // Add current response if available
  if (currentResponse) {
    availableItems.push(createCurrentComparisonItem(currentResponse, currentMethod, currentUrl));
  }
  
  // Add history items
  responseHistory.forEach(historyItem => {
    availableItems.push(createComparisonItem(historyItem));
  });
  
  // Filter items based on search term
  const filteredItems = availableItems.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.url.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleItemToggle = (item: ComparisonItem) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    
    if (isSelected) {
      onSelectionChange(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      if (selectedItems.length < 2) {
        onSelectionChange([...selectedItems, item]);
      } else {
        // Replace the oldest selection
        onSelectionChange([selectedItems[1], item]);
      }
    }
  };
  
  const handleStartComparison = () => {
    if (canCompareItems(selectedItems)) {
      onStartComparison(selectedItems);
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex-none p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <ArrowRightLeft size={20} className="text-blue-400" />
            <h3 className="text-lg font-medium text-gray-200">Compare Responses</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search responses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-2 text-gray-200 placeholder-gray-400 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Select 2 responses to compare ({selectedItems.length}/2)
            </div>
            
            <button
              onClick={handleStartComparison}
              disabled={!canCompareItems(selectedItems)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRightLeft size={14} />
              <span>Compare</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p>No responses available for comparison</p>
              <p className="text-sm mt-1">Execute some requests to see them here</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredItems.map((item) => (
              <SelectableItem
                key={item.id}
                item={item}
                isSelected={selectedItems.some(selected => selected.id === item.id)}
                onToggle={handleItemToggle}
                disabled={selectedItems.length >= 2 && !selectedItems.some(selected => selected.id === item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};