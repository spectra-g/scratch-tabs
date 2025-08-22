import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

interface SearchOptions {
  searchTerm: string;
  caseSensitive: boolean;
  wholeWord: boolean;
}

interface SearchState {
  searchTerm: string;
  results: Array<{ from: number; to: number }>;
  currentIndex: number;
}

export const SearchExtension = Extension.create<SearchOptions>({
  name: 'search',

  addOptions() {
    return {
      searchTerm: '',
      caseSensitive: false,
      wholeWord: false,
    };
  },

  addStorage() {
    return {
      searchTerm: '',
      results: [],
      currentIndex: -1,
    };
  },

  addCommands() {
    return {
      setSearchTerm: (searchTerm: string) => ({ tr, dispatch }) => {
        if (dispatch) {
          const newTr = tr.setMeta('search', { searchTerm });
          dispatch(newTr);
        }
        return true;
      },

      goToNextSearchResult: () => ({ tr, state, dispatch }) => {
        const { results, currentIndex } = this.storage;
        if (results.length === 0) return false;

        const nextIndex = currentIndex >= results.length - 1 ? 0 : currentIndex + 1;
        const result = results[nextIndex];
        
        if (result && dispatch) {
          this.storage.currentIndex = nextIndex;
          const newTr = tr.setSelection(
            state.schema.text().createAndFill()?.type.createSelection(result.from, result.to) ||
            state.selection
          );
          dispatch(newTr);
        }
        return true;
      },

      goToPreviousSearchResult: () => ({ tr, state, dispatch }) => {
        const { results, currentIndex } = this.storage;
        if (results.length === 0) return false;

        const prevIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
        const result = results[prevIndex];
        
        if (result && dispatch) {
          this.storage.currentIndex = prevIndex;
          const newTr = tr.setSelection(
            state.schema.text().createAndFill()?.type.createSelection(result.from, result.to) ||
            state.selection
          );
          dispatch(newTr);
        }
        return true;
      },

      clearSearchResults: () => ({ tr, dispatch }) => {
        if (dispatch) {
          const newTr = tr.setMeta('search', { searchTerm: '' });
          dispatch(newTr);
        }
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    
    // Helper function to find matches in ProseMirror document
    const findMatches = (doc: any, searchTerm: string, options: SearchOptions) => {
      const results: Array<{ from: number; to: number }> = [];
      
      if (!searchTerm) return results;

      const searchText = options.caseSensitive ? searchTerm : searchTerm.toLowerCase();
      
      // Build a map of text content with proper positions
      const textContent: { char: string; pos: number }[] = [];
      
      doc.descendants((node: any, pos: number) => {
        if (node.isText) {
          const text = node.text;
          for (let i = 0; i < text.length; i++) {
            textContent.push({
              char: text[i],
              pos: pos + i, // Remove the +1, it might be causing the offset
            });
          }
        }
      });
      
      // Convert to searchable text
      const searchableText = textContent.map(item => 
        options.caseSensitive ? item.char : item.char.toLowerCase()
      ).join('');
      
      // Find matches in the searchable text
      let index = 0;
      while (index < searchableText.length) {
        const found = searchableText.indexOf(searchText, index);
        if (found === -1) break;

        // Check for whole word match if required
        if (options.wholeWord) {
          const before = found > 0 ? searchableText[found - 1] : ' ';
          const after = found + searchText.length < searchableText.length 
            ? searchableText[found + searchText.length] 
            : ' ';
          
          if (!/\W/.test(before) || !/\W/.test(after)) {
            index = found + 1;
            continue;
          }
        }

        // Get actual document positions
        if (textContent[found] && textContent[found + searchTerm.length - 1]) {
          const from = textContent[found].pos;
          const to = from + searchTerm.length;
          
          results.push({ from, to });
        }
        
        index = found + 1;
      }

      return results;
    };

    return [
      new Plugin({
        key: new PluginKey('search'),
        
        state: {
          init(): SearchState {
            return {
              searchTerm: '',
              results: [],
              currentIndex: -1,
            };
          },
          
          apply(tr, oldState): SearchState {
            const meta = tr.getMeta('search');
            if (meta && meta.searchTerm !== undefined) {
              const searchTerm = meta.searchTerm;
              const results = findMatches(tr.doc, searchTerm, extension.options);
              
              // Update storage
              extension.storage.searchTerm = searchTerm;
              extension.storage.results = results;
              extension.storage.currentIndex = results.length > 0 ? 0 : -1;
              
              return {
                searchTerm,
                results,
                currentIndex: results.length > 0 ? 0 : -1,
              };
            }
            return oldState;
          },
        },

        props: {
          decorations(state) {
            const { searchTerm, results } = this.getState(state);
            if (!searchTerm || results.length === 0) {
              return DecorationSet.empty;
            }

            const decorations = results.map(({ from, to }) =>
              Decoration.inline(from, to, {
                class: 'search-highlight',
                style: 'background-color: rgba(251, 191, 36, 0.4); border-radius: 2px;',
              })
            );

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});