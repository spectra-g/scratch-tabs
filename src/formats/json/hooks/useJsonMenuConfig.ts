import { useMemo } from "react";
import * as monaco from "monaco-editor";
import {
  FileText,
  FileCode,
  Settings2,
  WrapText,
  UnfoldVertical,
  SortAsc,
  Trash2,
  TextQuote,
  Palette,
  FileCheck,
  ListRestart,
  FileSymlink,
  FileCog,
  FolderTree,
  MessageSquareOff,
  PackageSearch,
  GitCompare,
} from "lucide-react";

import { useRootStore } from "../../../stores";
import { useJsonOperations } from "./useJsonOperations";
import { useJsonConversions } from "./useJsonConversions";
import { useJsonTransformations } from "./useJsonTransformations";
import { useJsonValidation } from "./useJsonValidation";
import { useJsonModals } from "./useJsonModals";
import { MenuItem } from "../../../components/ContextMenu/types";
import { Tab } from "../../../types";
import { validateJson } from "../validation";

export const useJsonMenuConfig = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  onClose: () => void,
): MenuItem[] => {
  const { addTab, addBackgroundTab } = useRootStore();

  // Pass addTab and ensure editor is not null before calling actions
  const handleAddTab = (tab: Tab) => {
    addTab(tab);
    onClose(); // Close menu after adding tab
  };

  // Pass addBackgroundTab and ensure editor is not null before calling actions
  const handleAddBackgroundTab = (tab: Tab) => {
    addBackgroundTab(tab);
  };

  const createAction = (
    actionFn: (editor: monaco.editor.IStandaloneCodeEditor) => void,
  ) => {
    return editor
      ? () => {
          actionFn(editor);
          onClose();
        }
      : undefined;
  };

  const createTabAction = (
    actionFn: (
      editor: monaco.editor.IStandaloneCodeEditor,
      addTab: (tab: Tab) => void,
    ) => void,
  ) => {
    return editor
      ? () => {
          actionFn(editor, handleAddTab);
          onClose();
        }
      : undefined;
  };

  const {
    handleFormat,
    handleMinify,
    handleSortKeys,
    handleFlatten,
    handleUnflatten,
    handleRemoveEmpty,
    handleRemoveComments,
    handleStringify,
    handleUnstringify,
    handleExtractJson,
  } = useJsonOperations(editor, handleAddBackgroundTab); // Operations that modify the current tab directly

  const { handleToCamelCase, handleToSnakeCase, handleToKebabCase } =
    useJsonTransformations(editor);

  const {
    handleToJava,
    handleToTypeScript,
    handleToPython,
    handleToGo,
    handleToCSharp,
    handleToCsv,
    handleToYaml,
    handleToXml,
    handleTreeView,
  } = useJsonConversions(editor, handleAddBackgroundTab); // Pass handleAddTab

  const { handleValidateSchema, handleGenerateSchema } = useJsonValidation(
    editor,
    handleAddTab,
  ); // Pass handleAddTab

  const { openStructureComparisonModal } = useJsonModals();

  // Use useMemo to prevent recalculating the config on every render unless dependencies change
  const menuConfig = useMemo<MenuItem[]>(() => {
    if (!editor) return []; // Return empty array if editor is not ready

    // Wrap actions to include onClose and editor check
    const treeViewAction = createTabAction(handleTreeView);
    const formatAction = createAction(handleFormat);
    const minifyAction = createAction(handleMinify);
    const sortKeysAction = createAction(handleSortKeys);
    const flattenAction = createAction(handleFlatten);
    const unflattenAction = createAction(handleUnflatten);
    const removeEmptyAction = createAction(handleRemoveEmpty);
    const removeCommentsAction = createAction(handleRemoveComments);
    const stringifyAction = createAction(handleStringify);
    const unstringifyAction = createAction(handleUnstringify);
    const extractJsonAction = createAction(handleExtractJson);

    const toCamelCaseAction = createAction(handleToCamelCase);
    const toSnakeCaseAction = createAction(handleToSnakeCase);
    const toKebabCaseAction = createAction(handleToKebabCase);

    const toJavaAction = createTabAction(handleToJava);
    const toTypeScriptAction = createTabAction(handleToTypeScript);
    const toPythonAction = createTabAction(handleToPython);
    const toGoAction = createTabAction(handleToGo);
    const toCsharpAction = createTabAction(handleToCSharp);
    const toCsvAction = createTabAction(handleToCsv);
    const toYamlAction = createTabAction(handleToYaml);
    const toXmlAction = createTabAction(handleToXml);

    const validateSchemaAction = createTabAction(handleValidateSchema);
    const generateSchemaAction = createTabAction(handleGenerateSchema);
    const compareStructuresAction = createAction(() => {
      if (editor) {
        const content = editor.getValue();
        openStructureComparisonModal(content);
      }
    });

    // Determine if current content is valid JSON
    let isJsonValid = false;
    let content = "";
    if (editor) {
      content = editor.getValue();
      isJsonValid = validateJson(content).isValid;
    }

    // Determine if Un-stringify should be enabled
    const enableUnstringify = true;

    return [
      {
        id: "treeView",
        label: "Tree/Path view",
        icon: FolderTree,
        action: treeViewAction,
      },
      {
        id: "extractJson",
        label: "Extract JSON(s)",
        icon: PackageSearch,
        action: extractJsonAction,
      },
      {
        id: "compareStructures",
        label: "Compare Structures",
        icon: GitCompare,
        action: compareStructuresAction,
      },
      { id: "format", label: "Format", icon: WrapText, action: formatAction },
      { id: "separator1", isSeparator: true, label: "sep0", icon: Settings2 }, // Icon needed but won't show
      // Section 1: Other Formatting & Basic Ops
      {
        id: "minify",
        label: "Minify",
        icon: UnfoldVertical,
        action: minifyAction,
      },
      { id: "sort", label: "Sort Keys", icon: SortAsc, action: sortKeysAction },
      {
        id: "flatten",
        label: "Flatten JSON",
        icon: ListRestart,
        action: flattenAction,
      },
      {
        id: "unflatten",
        label: "Unflatten JSON",
        icon: ListRestart,
        action: unflattenAction,
        disabled: true,
      }, // Example: disable if needed
      {
        id: "removeEmpty",
        label: "Remove Null/Empty",
        icon: Trash2,
        action: removeEmptyAction,
      },
      {
        id: "removeComments",
        label: "Remove Comments",
        icon: MessageSquareOff,
        action: removeCommentsAction,
      },
      {
        id: "stringify",
        label: "Stringify",
        icon: TextQuote,
        action: stringifyAction,
      },
      {
        id: "unstringify",
        label: "Un-stringify",
        icon: TextQuote,
        action: unstringifyAction,
        disabled: !enableUnstringify,
      },
      { id: "separator2", isSeparator: true, label: "sep1", icon: Settings2 }, // Icon needed but won't show

      // Section 2: Key Transformations
      {
        id: "toCamel",
        label: "Keys to camelCase",
        icon: Palette,
        action: toCamelCaseAction,
      },
      {
        id: "toSnake",
        label: "Keys to snake_case",
        icon: Palette,
        action: toSnakeCaseAction,
      },
      {
        id: "toKebab",
        label: "Keys to kebab-case",
        icon: Palette,
        action: toKebabCaseAction,
      },
      { id: "separator3", isSeparator: true, label: "sep3", icon: Settings2 },

      // Section 3: Conversions
      // Potential Submenu Example (Optional) - uncomment and adapt if needed
      // {
      //     id: 'convert', label: 'Convert To...', icon: ArrowRightLeft, submenu: (
      //         <>
      //             <ContextMenuItem item={{ id: 'toJava', label: 'Java', icon: Code, action: toJavaAction }} />
      //             <ContextMenuItem item={{ id: 'toTS', label: 'TypeScript', icon: Code, action: toTypeScriptAction }} />
      //             {/* ... more conversion items ... */}
      //         </>
      //     )
      // },
      // --- OR --- Render directly if no submenu is desired
      {
        id: "toJava",
        label: "JSON to Java",
        icon: FileCode,
        action: toJavaAction,
      },
      {
        id: "toTS",
        label: "JSON to TypeScript",
        icon: FileCode,
        action: toTypeScriptAction,
      },
      {
        id: "toPy",
        label: "JSON to Python",
        icon: FileCode,
        action: toPythonAction,
      },
      { id: "toGo", label: "JSON to Go", icon: FileCode, action: toGoAction },
      {
        id: "toCS",
        label: "JSON to C#",
        icon: FileCode,
        action: toCsharpAction,
      },
      {
        id: "toCsv",
        label: "JSON to CSV/TSV",
        icon: FileText,
        action: toCsvAction,
      },
      {
        id: "toYaml",
        label: "JSON to YAML",
        icon: FileText,
        action: toYamlAction,
      },
      { id: "toXml", label: "JSON to XML", icon: FileCog, action: toXmlAction },
      { id: "separator4", isSeparator: true, label: "sep4", icon: Settings2 },

      // Section 4: Schema
      {
        id: "validateSchema",
        label: "Validate Schema",
        icon: FileCheck,
        action: validateSchemaAction,
      },
      {
        id: "generateSchema",
        label: "Generate Schema",
        icon: FileSymlink,
        action: generateSchemaAction,
      },
    ];
  }, [
    editor,
    onClose,
    handleFormat,
    handleMinify,
    handleSortKeys,
    handleFlatten,
    handleUnflatten,
    handleRemoveEmpty,
    handleRemoveComments,
    handleStringify,
    handleUnstringify,
    handleExtractJson,
    handleToCamelCase,
    handleToSnakeCase,
    handleToKebabCase,
    handleToJava,
    handleToTypeScript,
    handleToPython,
    handleToGo,
    handleToCSharp,
    handleToCsv,
    handleToYaml,
    handleToXml,
    handleValidateSchema,
    handleGenerateSchema,
    openStructureComparisonModal,
  ]); // Add all dependencies

  return menuConfig;
};
