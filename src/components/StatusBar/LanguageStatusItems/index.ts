import { MarkdownStatusItem } from './markdown';
import { StatusItemProps } from '../types';

const languageStatusItems: Record<string, React.FC<StatusItemProps>> = {
  markdown: MarkdownStatusItem,
};

export const getLanguageStatusItem = (language: string) => {
  return languageStatusItems[language];
};