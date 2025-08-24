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
import { DateCreatedNode } from './DateCreatedNode';
import { SearchExtension } from './SearchExtension';
import 'prosemirror-view/style/prosemirror.css';

const lowlight = createLowlight();

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
  Image,
  ResizableImage.configure({
    inline: false,
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