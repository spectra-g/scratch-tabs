export type GenerationMode = 'text' | 'html' | 'markdown' | 'json' | 'custom';
export type ThemeType = 'business' | 'tech' | 'academic' | 'creative' | 'general';
export type OutputUnit = 'paragraphs' | 'sentences' | 'words';

export interface LoremIpsumSettings {
  mode: GenerationMode;
  theme: ThemeType;
  outputUnit: OutputUnit;
  count: number;
  customSourceText: string;
  includeNumbers: boolean;
  includeSpecialChars: boolean;
  startWithLorem: boolean;
}

export interface LoremIpsumState {
  type: 'loremipsum';
  settings: LoremIpsumSettings;
  generatedOutput: string;
  isGenerating: boolean;
  lastGeneratedAt: number;
}

export interface GenerationOptions {
  mode: GenerationMode;
  theme: ThemeType;
  count: number;
  unit: OutputUnit;
  customSource?: string;
  includeNumbers?: boolean;
  includeSpecialChars?: boolean;
  startWithLorem?: boolean;
}