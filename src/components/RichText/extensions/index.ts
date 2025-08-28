import StarterKit from '@tiptap/starter-kit';
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
import { DateCreatedNode } from './DateCreatedNode';
import { SearchExtension } from './SearchExtension';
import { CodeBlockTabExtension } from './CodeBlockTabExtension';
import { SmartCodeBlockToggle } from './SmartCodeBlockToggle';
import 'prosemirror-view/style/prosemirror.css';
import 'highlight.js/styles/github-dark.css'; // Add syntax highlighting theme

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

export const tiptapExtensions = [
  StarterKit.configure({
    codeBlock: false,
    dropcursor: false,
    link: false,
    code: false,
  }),
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
      class: 'text-blue-400 hover:text-blue-300 underline',
    },
  }),
  DateCreatedNode,
  SearchExtension,
  CodeBlockTabExtension,
  SmartCodeBlockToggle,
];