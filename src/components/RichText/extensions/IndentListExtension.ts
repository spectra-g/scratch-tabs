import { Extension } from '@tiptap/core';

export const IndentListExtension = Extension.create({
    name: 'indentList',

    addKeyboardShortcuts() {
        return {
            Tab: () => {
                if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
                    return this.editor.commands.sinkListItem('listItem');
                }
                return false;
            },
            'Shift-Tab': () => {
                if (this.editor.isActive('bulletList') || this.editor.isActive('orderedList')) {
                    return this.editor.commands.liftListItem('listItem');
                }
                return false;
            },
        };
    },
});
