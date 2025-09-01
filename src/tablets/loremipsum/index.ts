export { LoremIpsumTablet } from './LoremIpsumTablet';
export type { LoremIpsumState, LoremIpsumSettings, GenerationOptions } from './types';
export { generateContent, validateOptions } from './utils/generator';

// Tablet factory function for the registry
export const createLoremIpsumTablet = () => ({
  id: 'loremipsum',
  label: 'Lorem Ipsum Generator',
  
  createInitialState: (payload?: any) => ({
    type: 'loremipsum' as const,
    settings: {
      mode: 'text' as const,
      theme: 'general' as const,
      outputUnit: 'paragraphs' as const,
      count: 3,
      customSourceText: '',
      includeNumbers: false,
      includeSpecialChars: false,
      startWithLorem: true,
      ...payload,
    },
    generatedOutput: '',
    isGenerating: false,
    lastGeneratedAt: 0,
  }),
  
  serializeState: (state: any) => JSON.stringify(state),
  
  deserializeState: (serialized: string) => {
    try {
      return JSON.parse(serialized);
    } catch {
      return createLoremIpsumTablet().createInitialState();
    }
  },
  
  render: (state: any, onChange: (newState: any) => void) => 
    React.createElement(LoremIpsumTablet, { state, onChange }),
});