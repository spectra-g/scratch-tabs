import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Code } from '@tiptap/extension-code';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Highlight } from '@tiptap/extension-highlight';
import { ResizableImage } from 'tiptap-extension-resizable-image';
import 'tiptap-extension-resizable-image/styles.css';
import { Dropcursor } from '@tiptap/extension-dropcursor';
import { Link } from '@tiptap/extension-link';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml'; // HTML support
import css from 'highlight.js/lib/languages/css';
import markdown from 'highlight.js/lib/languages/markdown';
import bash from 'highlight.js/lib/languages/bash'; // Shell support
import python from 'highlight.js/lib/languages/python';
// DateCreatedNode removed - now rendered as external React component
import { SearchExtension } from './SearchExtension';
import { CodeBlockTabExtension } from './CodeBlockTabExtension';
import { SmartCodeBlockToggle } from './SmartCodeBlockToggle';
import 'prosemirror-view/style/prosemirror.css';
import 'highlight.js/styles/github-dark.css'; // Add syntax highlighting theme

import { Plugin, PluginKey } from 'prosemirror-state';

// Create lowlight instance and register only the languages we need
const lowlight = createLowlight({
  javascript,
  typescript,
  json,
  xml, // For HTML support
  css,
  markdown,
  bash, // For shell/bash support
  python
});

/**
 * Track whether user is currently dragging text within a table cell.
 * This state is used to prevent unwanted CellSelection creation during text selection.
 */
let isTextDragging = false;

/**
 * Table Selection Fix Plugin
 *
 * Fixes a bug in prosemirror-tables where dragging text across table cells
 * incorrectly creates a CellSelection instead of maintaining TextSelection.
 * This causes the entire document to be selected when dragging over certain elements.
 *
 * Solution: Track when user initiates a text drag in a table cell, then filter out
 * any transactions that attempt to create a CellSelection during that drag operation.
 */
const tableSelectionFixPlugin = new Plugin({
  key: new PluginKey('table-selection-fix'),
  props: {
    handleDOMEvents: {
      mousedown: (view, event) => {
        const target = event.target as HTMLElement;
        const cell = target.closest('td, th');

        if (cell) {
          isTextDragging = true;
        } else {
          isTextDragging = false;
        }

        return false;
      },

      mouseup: () => {
        isTextDragging = false;
        return false;
      },
    },
  },

  filterTransaction: (tr, state) => {
    if (isTextDragging && tr.selectionSet) {
      const selectionType = tr.selection?.constructor.name;
      const isCellSelection = selectionType === 'CellSelection' || selectionType === '_CellSelection';

      if (tr.selection && isCellSelection) {
        // Block CellSelection transactions during text drag
        return false;
      }
    }
    return true;
  },
});

export const tiptapExtensions = [
  StarterKit.configure({
    codeBlock: false,
    dropcursor: false,
    link: false,
    code: false,
    underline: false, // Disable StarterKit's underline to use the explicit import
  }),
  Underline,
  Code.configure({
    HTMLAttributes: {
      class: 'inline-code',
    },
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'plaintext',
    HTMLAttributes: {
      class: 'code-block-lowlight'
    }
  }),
  Table.configure({
    resizable: true,
  }).extend({
    addProseMirrorPlugins() {
      const defaultPlugins = this.parent?.() ?? [];
      return [tableSelectionFixPlugin, ...defaultPlugins];
    },
  }),
  TableRow,
  TableHeader,
  TableCell,
  Highlight.configure({
    multicolor: false,
  }),
  ResizableImage.configure({
    allowBase64: true,
  }),
  Dropcursor,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-info hover:text-info-hover underline',
    },
  }),
  SearchExtension,
  CodeBlockTabExtension,
  SmartCodeBlockToggle,
];