import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useJsonModals } from "../../hooks/useJsonModals";
import {
  sortJsonKeys,
  flattenJson,
  unflattenJson,
  removeEmptyValues,
  removeComments,
  stringifyJson,
  unstringifyJsonContent,
  extractJsonFromContent,
} from "../../actions/jsonOperations";
import {
  transformToCamelCase,
  transformToSnakeCase,
  transformToKebabCase,
} from "../../actions/jsonTransformations";
import { generateJsonSchema } from "../../utils/jsonSchema";

interface ToolboxProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  onContentChange: (content: string) => void;
}

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  children,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-gray-700/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-700/30 transition-colors"
      >
        <span className="text-sm font-medium text-gray-300">{title}</span>
        {isExpanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronRight size={16} className="text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 pt-0 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
      disabled
        ? "text-gray-500 cursor-not-allowed"
        : "text-gray-300 hover:bg-gray-700/50 hover:text-gray-200"
    }`}
  >
    {children}
  </button>
);

export const Toolbox: React.FC<ToolboxProps> = ({
  editor,
  onContentChange,
}) => {
  const {
    openCodeGenerationModal,
    openStringifyModal,
    openSchemaValidationModal,
  } = useJsonModals();

  const executeTransformation = (transformFn: (content: string) => string) => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const result = transformFn(content);
      editor.setValue(result);
    } catch (error) {
      console.error("Transformation failed:", error);
    }
  };

  const handleCodeGeneration = (language: string) => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);

      // Import the appropriate generator dynamically
      switch (language) {
        case "typescript":
          import("../../utils/generateTypeScriptInterfaces").then(({ generateTypeScriptInterfaces }) => {
            const interfaces = generateTypeScriptInterfaces(json);
            const tabs = interfaces.map((iface) => ({
              id: crypto.randomUUID(),
              title: iface.interfaceName,
              content: iface.code,
              language: "typescript",
            }));
            openCodeGenerationModal(tabs, () => {});
          });
          break;
        case "java":
          import("../../utils/javaGenerator").then(({ generateJavaClasses }) => {
            const classes = generateJavaClasses(json);
            const tabs = classes.map((cls) => ({
              id: crypto.randomUUID(),
              title: cls.className,
              content: cls.code,
              language: "java",
            }));
            openCodeGenerationModal(tabs, () => {});
          });
          break;
        case "python":
          import("../../utils/generatePythonClasses").then(({ generatePythonClasses }) => {
            const classes = generatePythonClasses(json);
            const tabs = classes.map((cls) => ({
              id: crypto.randomUUID(),
              title: cls.className,
              content: cls.code,
              language: "python",
            }));
            openCodeGenerationModal(tabs, () => {});
          });
          break;
        case "go":
          import("../../utils/generateGoStructs").then(({ generateGoStructs }) => {
            const structs = generateGoStructs(json);
            const tabs = structs.map((struct) => ({
              id: crypto.randomUUID(),
              title: struct.structName,
              content: struct.code,
              language: "go",
            }));
            openCodeGenerationModal(tabs, () => {});
          });
          break;
        case "csharp":
          import("../../utils/generateCSharpClasses").then(({ generateCSharpClasses }) => {
            const classes = generateCSharpClasses(json);
            const tabs = classes.map((cls) => ({
              id: crypto.randomUUID(),
              title: cls.className,
              content: cls.code,
              language: "csharp",
            }));
            openCodeGenerationModal(tabs, () => {});
          });
          break;
      }
    } catch (error) {
      console.error(`Failed to generate ${language}:`, error);
    }
  };

  const handleDataConversion = (format: string) => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);

      switch (format) {
        case "csv":
          import("../../utils/generateCsv").then(({ convertToCsv }) => {
            const result = convertToCsv(json);
            if ("error" in result) {
              throw new Error(result.error);
            }
            const tab = {
              id: crypto.randomUUID(),
              title: "Converted CSV",
              content: result.csv,
              language: "csv",
            };
            openCodeGenerationModal([tab], () => {});
          });
          break;
        case "yaml":
          import("../../utils/generateYaml").then(({ convertToYaml }) => {
            const yaml = convertToYaml(json);
            const tab = {
              id: crypto.randomUUID(),
              title: "Converted YAML",
              content: yaml,
              language: "yaml",
            };
            openCodeGenerationModal([tab], () => {});
          });
          break;
        case "xml":
          import("../../utils/generateXml").then(({ convertToXml }) => {
            const xml = convertToXml(json);
            const tab = {
              id: crypto.randomUUID(),
              title: "Converted XML",
              content: xml,
              language: "xml",
            };
            openCodeGenerationModal([tab], () => {});
          });
          break;
      }
    } catch (error) {
      console.error(`Failed to convert to ${format}:`, error);
    }
  };

  const handleGenerateSchema = () => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      const schema = generateJsonSchema(json);

      const tab = {
        id: crypto.randomUUID(),
        title: "JSON Schema",
        content: JSON.stringify(schema, null, 2),
        language: "json",
      };
      openCodeGenerationModal([tab], () => {});
    } catch (error) {
      console.error("Failed to generate schema:", error);
    }
  };

  const handleValidateSchema = () => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      openSchemaValidationModal(json);
    } catch (error) {
      console.error("Failed to validate schema:", error);
    }
  };

  const handleStringify = () => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const stringified = stringifyJson(content);
      openStringifyModal(stringified, () => {});
    } catch (error) {
      console.error("Failed to stringify:", error);
    }
  };

  return (
    <div className="space-y-0">
      {/* Transformations */}
      <AccordionSection title="Transformations" defaultExpanded>
        <ActionButton onClick={() => executeTransformation(sortJsonKeys)}>
          Sort Keys
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(flattenJson)}>
          Flatten JSON
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(unflattenJson)}>
          Unflatten JSON
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(removeEmptyValues)}>
          Remove Null/Empty
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(removeComments)}>
          Remove Comments
        </ActionButton>
        <ActionButton onClick={handleStringify}>
          Stringify
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(unstringifyJsonContent)}>
          Un-stringify
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(transformToCamelCase)}>
          Keys to camelCase
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(transformToSnakeCase)}>
          Keys to snake_case
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(transformToKebabCase)}>
          Keys to kebab-case
        </ActionButton>
      </AccordionSection>

      {/* Code Generation */}
      <AccordionSection title="Code Generation">
        <ActionButton onClick={() => handleCodeGeneration("typescript")}>
          Generate TypeScript
        </ActionButton>
        <ActionButton onClick={() => handleCodeGeneration("java")}>
          Generate Java
        </ActionButton>
        <ActionButton onClick={() => handleCodeGeneration("python")}>
          Generate Python
        </ActionButton>
        <ActionButton onClick={() => handleCodeGeneration("go")}>
          Generate Go
        </ActionButton>
        <ActionButton onClick={() => handleCodeGeneration("csharp")}>
          Generate C#
        </ActionButton>
      </AccordionSection>

      {/* Data Conversion */}
      <AccordionSection title="Data Conversion">
        <ActionButton onClick={() => handleDataConversion("csv")}>
          Convert to CSV
        </ActionButton>
        <ActionButton onClick={() => handleDataConversion("yaml")}>
          Convert to YAML
        </ActionButton>
        <ActionButton onClick={() => handleDataConversion("xml")}>
          Convert to XML
        </ActionButton>
      </AccordionSection>

      {/* Schema & Utilities */}
      <AccordionSection title="Schema & Utilities">
        <ActionButton onClick={handleGenerateSchema}>
          Generate Schema
        </ActionButton>
        <ActionButton onClick={handleValidateSchema}>
          Validate with Schema
        </ActionButton>
      </AccordionSection>
    </div>
  );
};