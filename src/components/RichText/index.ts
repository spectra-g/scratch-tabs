// Main exports for the RichText module
export { RichTextEditor } from './RichTextEditor';
export { RichTextToolbar } from './components/RichTextToolbar';
export { EditorSearchBar } from './components/EditorSearchBar';
export { UpgradeConfirmationModal } from './components/UpgradeConfirmationModal';
export { BlockContextMenu } from './components/BlockContextMenu';

// Hooks
export { useRichTextEditor } from './hooks/useRichTextEditor';
export { useImagePasteDetection } from './hooks/useImagePasteDetection';

// Utils
export { migrateTextToRich, migrateRichToText, createCodeBlockNode } from './utils/contentMigration';

// Types
export type * from './types';