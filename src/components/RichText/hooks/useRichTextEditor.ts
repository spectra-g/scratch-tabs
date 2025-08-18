import { useEditor } from '@tiptap/react';
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
import { DateCreatedNode } from '../extensions/DateCreatedNode';
import { SearchExtension } from '../extensions/SearchExtension';

const lowlight = createLowlight();

interface UseRichTextEditorProps {
  initialContent?: any;
  onUpdate: (content: any) => void;
  dateCreated: number;
}

export const useRichTextEditor = ({
  initialContent,
  onUpdate,
  dateCreated,
}: UseRichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
        dropcursor: false, // We'll use Dropcursor extension explicitly
        link: false, // We'll use Link extension explicitly
        code: false, // We'll use Code extension explicitly
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
    ],
    content: initialContent || {
      type: 'doc',
      content: [
        {
          type: 'dateCreated',
          attrs: {
            dateCreated,
          },
        },
        {
          type: 'paragraph',
          content: [],
        },
      ],
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full p-6',
      },
      handlePaste: (view, event) => {
        // Handle image paste
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const src = e.target?.result as string;
                  editor?.chain().focus().setResizableImage({ src }).run();
                };
                reader.readAsDataURL(file);
                return true; // Prevent default paste behavior
              }
            }
          }
        }
        return false; // Allow default paste behavior for other content
      },
    },
  });

  return editor;
};