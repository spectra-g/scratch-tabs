// File: components/RichText/extensions/index.ts

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
import 'prosemirror-view/style/prosemirror.css';

// Create lowlight instance with core library
const lowlight = createLowlight();

// Register only the languages we need
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('json', json);
lowlight.register('html', xml); // HTML uses XML highlighter
lowlight.register('css', css);
lowlight.register('markdown', markdown);
lowlight.register('shell', bash);
lowlight.register('bash', bash);
lowlight.register('python', python);

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
];