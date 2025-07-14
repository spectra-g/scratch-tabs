import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { shouldUseTextarea } from "../utils/variables";

interface VariableFillModalProps {
  isOpen: boolean;
  variables: string[];
  onSubmit: (values: Record<string, string>) => void;
  onClose: () => void;
  submitButtonLabel: string;
  allowEmpty?: boolean; // If true, allows empty values to be submitted
}

export const VariableFillModal: React.FC<VariableFillModalProps> = ({
  isOpen,
  variables,
  onSubmit,
  onClose,
  submitButtonLabel,
  allowEmpty = false,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});

  // Reset values when modal opens or variables change
  useEffect(() => {
    if (isOpen) {
      const initialValues: Record<string, string> = {};
      variables.forEach(variable => {
        initialValues[variable] = '';
      });
      setValues(initialValues);
    }
  }, [isOpen, variables]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If allowEmpty is false, check that all required fields are filled
    if (!allowEmpty) {
      const hasEmptyValues = variables.some(variable => !values[variable]?.trim());
      if (hasEmptyValues) {
        return; // Don't submit if required fields are empty
      }
    }
    
    onSubmit(values);
  };

  const handleValueChange = (variable: string, value: string) => {
    setValues(prev => ({
      ...prev,
      [variable]: value,
    }));
  };

  const isFormValid = allowEmpty || variables.every(variable => values[variable]?.trim());

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-100">Fill Variables</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar min-h-0">
            {variables.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No variables found in this content.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-400 mb-6">
                  {allowEmpty 
                    ? "Fill in the variables below. Leave blank to keep as placeholders."
                    : "Please fill in all the variables below to continue."
                  }
                </p>
                
                {variables.map((variable) => {
                  const useTextarea = shouldUseTextarea(variable);
                  
                  return (
                    <div key={variable}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {variable}
                        {!allowEmpty && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      
                      {useTextarea ? (
                        <textarea
                          value={values[variable] || ''}
                          onChange={(e) => handleValueChange(variable, e.target.value)}
                          rows={3}
                          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                          placeholder={`Enter value for ${variable}...`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={values[variable] || ''}
                          onChange={(e) => handleValueChange(variable, e.target.value)}
                          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Enter value for ${variable}...`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {submitButtonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};