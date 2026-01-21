import React, { useState } from "react";
import { BaseModal } from "../../../../components/Modals/BaseModal";
import { Editor } from "@monaco-editor/react";
import { validateJsonSchema } from "../../utils/jsonSchema";
import { CheckCircle2, XCircle } from "lucide-react";
import { useThemeStore } from "../../../../stores/themeStore";

interface SchemaValidationModalProps {
  json: any;
  onClose: () => void;
}

export const SchemaValidationModal: React.FC<SchemaValidationModalProps> = ({
  json,
  onClose,
}) => {
  const { isDarkMode } = useThemeStore();
  const [schema, setSchema] = useState("");
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
  } | null>(null);

  const handleValidate = () => {
    try {
      const parsedSchema = JSON.parse(schema);
      const result = validateJsonSchema(json, parsedSchema);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: [(error as Error).message],
      });
    }
  };

  return (
    <BaseModal
      title="JSON Schema Validation"
      onClose={onClose}
      widthClass="w-[90vw]"
      maxWidthClass="max-w-[1600px]"
    >
      <div className="space-y-4">
        <div className="flex flex-row p-2 space-x-4">
          <div className="flex-1">
            {/* Schema Editor */}
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">Schema</h3>
              <div className="h-64 border border-base rounded-lg overflow-hidden">
                <Editor
                  height="100%"
                  language="json"
                  value={schema}
                  onChange={(value) => setSchema(value || "")}
                  theme={isDarkMode ? "vs-dark" : "vs"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex-1">
            {/* JSON Preview */}
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">
                JSON Data
              </h3>
              <div className="h-64 border border-base rounded-lg overflow-hidden">
                <Editor
                  height="100%"
                  language="json"
                  value={JSON.stringify(json, null, 2)}
                  theme={isDarkMode ? "vs-dark" : "vs"}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div
            className={`p-2 rounded-lg ${validationResult.valid ? "bg-success-subtle" : "bg-danger-subtle"}`}
          >
            <div className="flex items-center m-2">
              {validationResult.valid ? (
                <CheckCircle2 className="text-success mr-2" size={20} />
              ) : (
                <XCircle className="text-danger mr-2" size={20} />
              )}
              <h3
                className={`font-medium ${validationResult.valid ? "text-success" : "text-danger"}`}
              >
                {validationResult.valid
                  ? "Validation Passed"
                  : "Validation Failed"}
              </h3>
            </div>
            {!validationResult.valid && validationResult.errors.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm text-danger mt-2">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 p-2">
          <button
            onClick={handleValidate}
            className="px-4 py-2 bg-primary text-main rounded-md hover:bg-primary/80 transition-colors"
          >
            Validate
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
