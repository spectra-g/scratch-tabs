import React, { useState } from 'react';
import { Calendar, Download, Copy, Check, Clock } from 'lucide-react';
import { CronExecution, TimeZone } from '../types';
import { format } from 'date-fns';

interface ExecutionPreviewProps {
  executions: CronExecution[];
  timezone: TimeZone;
  onExportToICS: () => boolean | null;
  onExportToCSV: () => boolean | null;
  onExportToJSON: () => boolean | null;
  onCopyAllTimes: () => boolean;
}

export const ExecutionPreview: React.FC<ExecutionPreviewProps> = ({
  executions,
  timezone,
  onExportToICS,
  onExportToCSV,
  onExportToJSON,
  onCopyAllTimes
}) => {
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const handleCopyAllTimes = () => {
    const success = onCopyAllTimes();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center">
          <Calendar size={16} className="text-blue-400 mr-2" />
          <h3 className="text-sm font-medium text-gray-300">Execution Preview</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-xs text-gray-400 flex items-center">
            <Clock size={12} className="mr-1" />
            <span>{timezone.name}</span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
              title="Export executions"
            >
              <Download size={16} />
            </button>
            
            {showExportOptions && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowExportOptions(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 w-48">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onExportToICS();
                        setShowExportOptions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-700"
                    >
                      <Calendar size={14} className="mr-2 text-blue-400" />
                      <span>Export to Calendar (ICS)</span>
                    </button>
                    <button
                      onClick={() => {
                        onExportToCSV();
                        setShowExportOptions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-700"
                    >
                      <Download size={14} className="mr-2 text-green-400" />
                      <span>Export to CSV</span>
                    </button>
                    <button
                      onClick={() => {
                        onExportToJSON();
                        setShowExportOptions(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-700"
                    >
                      <Download size={14} className="mr-2 text-yellow-400" />
                      <span>Export to JSON</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={handleCopyAllTimes}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
            title="Copy all times"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
          </button>
        </div>
      </div>
      
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {executions.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p>No executions to display.</p>
            <p className="text-xs mt-1">Check your cron expression for errors.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {executions.map((execution, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                  <td className="px-4 py-2 text-sm text-gray-400">{index + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-200">{format(execution.date, 'yyyy-MM-dd')}</td>
                  <td className="px-4 py-2 text-sm text-gray-200">{format(execution.date, 'HH:mm:ss')}</td>
                  <td className="px-4 py-2 text-sm text-gray-200">{format(execution.date, 'EEEE')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};