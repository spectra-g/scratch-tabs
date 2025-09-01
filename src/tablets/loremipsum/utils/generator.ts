import { themeWordlists, classicLoremWords } from '../wordlists';
import { GenerationOptions } from '../types';

/**
 * Simple Markov chain implementation for custom text generation
 */
class MarkovChain {
  private chains: Map<string, string[]> = new Map();
  private starters: string[] = [];

  constructor(text: string) {
    this.buildChain(text);
  }

  private buildChain(text: string): void {
    // Clean and tokenize the text
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);

    if (words.length < 2) return;

    // Build the chain
    for (let i = 0; i < words.length - 1; i++) {
      const currentWord = words[i];
      const nextWord = words[i + 1];

      if (!this.chains.has(currentWord)) {
        this.chains.set(currentWord, []);
      }
      this.chains.get(currentWord)!.push(nextWord);

      // Track sentence starters (words that come after punctuation or at the beginning)
      if (i === 0 || this.isPunctuation(words[i - 1])) {
        this.starters.push(currentWord);
      }
    }
  }

  private isPunctuation(word: string): boolean {
    return /[.!?]$/.test(word);
  }

  generateText(wordCount: number): string {
    if (this.chains.size === 0 || wordCount <= 0) return '';

    const result: string[] = [];
    let currentWord = this.starters[Math.floor(Math.random() * this.starters.length)] || 
                     Array.from(this.chains.keys())[0];

    result.push(this.capitalize(currentWord));

    for (let i = 1; i < wordCount; i++) {
      const nextWords = this.chains.get(currentWord);
      if (!nextWords || nextWords.length === 0) {
        // Pick a random starter if we hit a dead end
        currentWord = this.starters[Math.floor(Math.random() * this.starters.length)] || 
                     Array.from(this.chains.keys())[0];
      } else {
        currentWord = nextWords[Math.floor(Math.random() * nextWords.length)];
      }
      result.push(currentWord);
    }

    return result.join(' ');
  }

  private capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
}

/**
 * Generates themed words based on the selected theme
 */
function generateThemedWords(theme: string, count: number): string[] {
  const wordlist = themeWordlists[theme as keyof typeof themeWordlists] || themeWordlists.general;
  const allWords = [...wordlist.nouns, ...wordlist.adjectives, ...wordlist.verbs];
  
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(allWords[Math.floor(Math.random() * allWords.length)]);
  }
  
  return result;
}

/**
 * Generates classic Lorem Ipsum text
 */
function generateClassicLorem(wordCount: number, startWithLorem: boolean = true): string {
  const result: string[] = [];
  
  if (startWithLorem && wordCount > 0) {
    result.push('Lorem');
    wordCount--;
  }
  
  for (let i = 0; i < wordCount; i++) {
    result.push(classicLoremWords[Math.floor(Math.random() * classicLoremWords.length)]);
  }
  
  return result.join(' ');
}

/**
 * Formats words into sentences and paragraphs
 */
function formatIntoSentences(words: string[], sentencesPerParagraph: number = 4): string {
  const sentences: string[] = [];
  let currentSentence: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    currentSentence.push(words[i]);
    
    // End sentence every 8-15 words
    if (currentSentence.length >= 8 && (currentSentence.length >= 15 || Math.random() < 0.3)) {
      const sentence = currentSentence.join(' ');
      sentences.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.');
      currentSentence = [];
    }
  }
  
  // Handle remaining words
  if (currentSentence.length > 0) {
    const sentence = currentSentence.join(' ');
    sentences.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.');
  }
  
  // Group sentences into paragraphs
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += sentencesPerParagraph) {
    paragraphs.push(sentences.slice(i, i + sentencesPerParagraph).join(' '));
  }
  
  return paragraphs.join('\n\n');
}

/**
 * Generates JSON mock data based on theme
 */
function generateJsonData(theme: string, complexity: number = 3): string {
  const wordlist = themeWordlists[theme as keyof typeof themeWordlists] || themeWordlists.general;
  
  const getRandomWord = (type: 'nouns' | 'adjectives' | 'verbs') => 
    wordlist[type][Math.floor(Math.random() * wordlist[type].length)];
  
  const generateValue = (depth: number = 0): any => {
    if (depth > 2) return getRandomWord('nouns');
    
    const rand = Math.random();
    if (rand < 0.3) return getRandomWord('nouns');
    if (rand < 0.5) return Math.floor(Math.random() * 1000);
    if (rand < 0.7) return Math.random() < 0.5;
    if (rand < 0.85) {
      // Array
      const length = Math.floor(Math.random() * 3) + 1;
      return Array.from({ length }, () => generateValue(depth + 1));
    }
    
    // Object
    const obj: any = {};
    const propCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < propCount; i++) {
      obj[getRandomWord('nouns')] = generateValue(depth + 1);
    }
    return obj;
  };
  
  const rootObj: any = {};
  for (let i = 0; i < complexity; i++) {
    rootObj[getRandomWord('nouns')] = generateValue();
  }
  
  return JSON.stringify(rootObj, null, 2);
}

/**
 * Generates HTML content
 */
function generateHtmlContent(theme: string, paragraphCount: number): string {
  const wordlist = themeWordlists[theme as keyof typeof themeWordlists] || themeWordlists.general;
  const getRandomWord = (type: 'nouns' | 'adjectives' | 'verbs') => 
    wordlist[type][Math.floor(Math.random() * wordlist[type].length)];
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)} ${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)}</title>
</head>
<body>
    <header>
        <h1>${getRandomWord('adjectives').charAt(0).toUpperCase() + getRandomWord('adjectives').slice(1)} ${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)}</h1>
        <nav>
            <ul>`;
  
  // Generate navigation items
  for (let i = 0; i < 4; i++) {
    html += `\n                <li><a href="#${getRandomWord('nouns')}">${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)}</a></li>`;
  }
  
  html += `\n            </ul>
        </nav>
    </header>
    <main>`;
  
  // Generate content sections
  for (let i = 0; i < paragraphCount; i++) {
    const words = generateThemedWords(theme, 50);
    const content = formatIntoSentences(words, 3);
    
    html += `\n        <section>
            <h2>${getRandomWord('adjectives').charAt(0).toUpperCase() + getRandomWord('adjectives').slice(1)} ${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)}</h2>
            <p>${content.split('\n\n')[0]}</p>`;
    
    if (content.split('\n\n')[1]) {
      html += `\n            <p>${content.split('\n\n')[1]}</p>`;
    }
    
    html += `\n        </section>`;
  }
  
  html += `\n    </main>
    <footer>
        <p>&copy; 2025 ${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)} ${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)}. All rights reserved.</p>
    </footer>
</body>
</html>`;
  
  return html;
}

/**
 * Generates Markdown content
 */
function generateMarkdownContent(theme: string, sectionCount: number): string {
  const wordlist = themeWordlists[theme as keyof typeof themeWordlists] || themeWordlists.general;
  const getRandomWord = (type: 'nouns' | 'adjectives' | 'verbs') => 
    wordlist[type][Math.floor(Math.random() * wordlist[type].length)];
  
  let markdown = `# ${getRandomWord('adjectives').charAt(0).toUpperCase() + getRandomWord('adjectives').slice(1)} ${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)}\n\n`;
  
  // Add introduction
  const introWords = generateThemedWords(theme, 40);
  markdown += `${formatIntoSentences(introWords, 2)}\n\n`;
  
  // Generate sections
  for (let i = 0; i < sectionCount; i++) {
    markdown += `## ${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)} ${getRandomWord('adjectives').charAt(0).toUpperCase() + getRandomWord('adjectives').slice(1)}\n\n`;
    
    const sectionWords = generateThemedWords(theme, 60);
    markdown += `${formatIntoSentences(sectionWords, 3)}\n\n`;
    
    // Add a list sometimes
    if (Math.random() < 0.5) {
      markdown += `### Key ${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)}s\n\n`;
      for (let j = 0; j < 3; j++) {
        markdown += `- ${getRandomWord('adjectives').charAt(0).toUpperCase() + getRandomWord('adjectives').slice(1)} ${getRandomWord('nouns')}\n`;
      }
      markdown += '\n';
    }
    
    // Add code block sometimes for tech theme
    if (theme === 'tech' && Math.random() < 0.4) {
      markdown += `\`\`\`javascript
function ${getRandomWord('verbs')}${getRandomWord('nouns').charAt(0).toUpperCase() + getRandomWord('nouns').slice(1)}() {
    const ${getRandomWord('nouns')} = "${getRandomWord('adjectives')}";
    return ${getRandomWord('nouns')}.${getRandomWord('verbs')}();
}
\`\`\`\n\n`;
    }
  }
  
  return markdown;
}

/**
 * Main generation function
 */
export function generateContent(options: GenerationOptions): string {
  const { mode, theme, count, unit, customSource, startWithLorem = true } = options;
  
  try {
    // Handle custom source text generation
    if (mode === 'custom' && customSource && customSource.trim().length > 10) {
      const markov = new MarkovChain(customSource);
      const wordCount = unit === 'words' ? count : 
                      unit === 'sentences' ? count * 12 : 
                      count * 50;
      const generatedText = markov.generateText(wordCount);
      
      if (unit === 'sentences') {
        return formatIntoSentences(generatedText.split(' '), 1);
      } else if (unit === 'paragraphs') {
        return formatIntoSentences(generatedText.split(' '), 4);
      }
      return generatedText;
    }
    
    // Handle different generation modes
    switch (mode) {
      case 'html':
        return generateHtmlContent(theme, count);
        
      case 'markdown':
        return generateMarkdownContent(theme, count);
        
      case 'json':
        return generateJsonData(theme, count);
        
      case 'text':
      default:
        if (theme === 'general' && startWithLorem) {
          // Classic Lorem Ipsum
          const wordCount = unit === 'words' ? count : 
                          unit === 'sentences' ? count * 12 : 
                          count * 50;
          const loremText = generateClassicLorem(wordCount, startWithLorem);
          
          if (unit === 'sentences') {
            return formatIntoSentences(loremText.split(' '), 1);
          } else if (unit === 'paragraphs') {
            return formatIntoSentences(loremText.split(' '), 4);
          }
          return loremText;
        } else {
          // Themed content
          const wordCount = unit === 'words' ? count : 
                          unit === 'sentences' ? count * 12 : 
                          count * 50;
          const themedWords = generateThemedWords(theme, wordCount);
          const themedText = themedWords.join(' ');
          
          if (unit === 'sentences') {
            return formatIntoSentences(themedWords, 1);
          } else if (unit === 'paragraphs') {
            return formatIntoSentences(themedWords, 4);
          }
          return themedText;
        }
    }
  } catch (error) {
    console.error('Error generating content:', error);
    return 'Error generating content. Please try again.';
  }
}

/**
 * Validates generation options
 */
export function validateOptions(options: GenerationOptions): string | null {
  if (options.count <= 0) return 'Count must be greater than 0';
  if (options.count > 1000) return 'Count cannot exceed 1000';
  if (options.mode === 'custom' && (!options.customSource || options.customSource.trim().length < 10)) {
    return 'Custom source text must be at least 10 characters long';
  }
  return null;
}

/**
 * Gets the appropriate file extension for the generated content
 */
export function getFileExtension(mode: GenerationMode): string {
  switch (mode) {
    case 'html': return 'html';
    case 'markdown': return 'md';
    case 'json': return 'json';
    case 'custom':
    case 'text':
    default: return 'txt';
  }
}

/**
 * Gets the appropriate language for syntax highlighting
 */
export function getLanguageForMode(mode: GenerationMode): string {
  switch (mode) {
    case 'html': return 'html';
    case 'markdown': return 'markdown';
    case 'json': return 'json';
    case 'custom':
    case 'text':
    default: return 'plaintext';
  }
}