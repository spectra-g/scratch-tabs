import { describe, it, expect } from '@jest/globals';
import { applyTransformations } from '../transformations';

describe('Text Transformations', () => {
  const sampleText = 'Hello World\nTest Line\nAnother Line';

  it('should trim whitespace', () => {
    const input = '  Hello World  \n  Test Line  \n  Another Line  ';
    const config = { trim: true };
    const result = applyTransformations(input, config);
    expect(result).toBe('Hello World\nTest Line\nAnother Line');
  });

  it('should remove extra whitespace preserving single spaces', () => {
    const input = 'Hello    World\nTest     Line\nAnother  Line';
    const config = { removeExtraWhitespace: 'preserve-single' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('Hello World\nTest Line\nAnother Line');
  });

  it('should remove all whitespace', () => {
    const input = 'Hello World\nTest Line\nAnother Line';
    const config = { removeExtraWhitespace: 'remove-all' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('HelloWorld\nTestLine\nAnotherLine');
  });

  it('should remove extra blank lines', () => {
    const input = 'Line 1\n\n\nLine 2\n\n\n\nLine 3';
    const config = { removeExtraBlankLines: true };
    const result = applyTransformations(input, config);
    expect(result).toBe('Line 1\n\nLine 2\n\nLine 3');
  });

  it('should remove all blank lines', () => {
    const input = 'Line 1\n\nLine 2\n\nLine 3';
    const config = { removeAllBlankLines: true };
    const result = applyTransformations(input, config);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });

  it('should convert to uppercase', () => {
    const config = { caseTransform: 'upper' as const };
    const result = applyTransformations(sampleText, config);
    expect(result).toBe('HELLO WORLD\nTEST LINE\nANOTHER LINE');
  });

  it('should convert to lowercase', () => {
    const config = { caseTransform: 'lower' as const };
    const result = applyTransformations(sampleText, config);
    expect(result).toBe('hello world\ntest line\nanother line');
  });

  it('should convert to title case', () => {
    const input = 'hello world\ntest line';
    const config = { caseTransform: 'title' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('Hello World\nTest Line');
  });

  it('should sort lines ascending', () => {
    const input = 'zebra\napple\nbanana';
    const config = { sortLines: 'asc' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('apple\nbanana\nzebra');
  });

  it('should sort lines descending', () => {
    const input = 'zebra\napple\nbanana';
    const config = { sortLines: 'desc' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('zebra\nbanana\napple');
  });

  it('should sort lines by length', () => {
    const input = 'a\nabcdef\nabc';
    const config = { sortLines: 'length' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('a\nabc\nabcdef');
  });

  it('should reverse lines', () => {
    const input = 'first\nsecond\nthird';
    const config = { reverseLines: true };
    const result = applyTransformations(input, config);
    expect(result).toBe('third\nsecond\nfirst');  
  });

  it('should remove duplicates', () => {
    const input = 'apple\nbanana\napple\ncherry\nbanana';
    const config = { removeDuplicates: true };
    const result = applyTransformations(input, config);
    expect(result).toBe('apple\nbanana\ncherry');
  });

  it('should add prefix', () => {
    const input = 'line1\nline2';
    const config = { addPrefix: '> ' };
    const result = applyTransformations(input, config);
    expect(result).toBe('> line1\n> line2');
  });

  it('should add suffix', () => {
    const input = 'line1\nline2';
    const config = { addSuffix: ' <' };
    const result = applyTransformations(input, config);
    expect(result).toBe('line1 <\nline2 <');
  });

  it('should number lines numerically', () => {
    const input = 'first\nsecond\nthird';
    const config = { numberLines: 'numeric' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('1. first\n2. second\n3. third');
  });

  it('should number lines with roman numerals', () => {
    const input = 'first\nsecond\nthird';
    const config = { numberLines: 'roman' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('I. first\nII. second\nIII. third');
  });

  it('should number lines alphabetically', () => {
    const input = 'first\nsecond\nthird';
    const config = { numberLines: 'alpha' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('A. first\nB. second\nC. third');
  });

  it('should join lines with separator', () => {
    const input = 'apple\nbanana\ncherry';
    const config = { joinLines: ', ' };
    const result = applyTransformations(input, config);
    expect(result).toBe('apple, banana, cherry');
  });

  it('should split lines by delimiter', () => {
    const input = 'apple,banana,cherry\ndog,cat,fish';
    const config = { splitLines: ',' };
    const result = applyTransformations(input, config);
    expect(result).toBe('apple\nbanana\ncherry\ndog\ncat\nfish');
  });

  it('should duplicate lines', () => {
    const input = 'line1\nline2';
    const config = { duplicateLines: 2 };
    const result = applyTransformations(input, config);
    expect(result).toBe('line1\nline1\nline2\nline2');
  });

  it('should shuffle lines (test deterministically)', () => {
    const input = 'a\nb\nc\nd\ne';
    const config = { shuffleLines: true };
    const result = applyTransformations(input, config);
    
    // Check that all original lines are present
    const originalLines = input.split('\n');
    const resultLines = result.split('\n');
    expect(resultLines.length).toBe(originalLines.length);
    
    for (const line of originalLines) {
      expect(resultLines).toContain(line);
    }
  });

  it('should filter by regex', () => {
    const input = 'test123\nhello\ntest456\nworld';
    const config = { filterByRegex: 'test\\d+' };
    const result = applyTransformations(input, config);
    expect(result).toBe('test123\ntest456');
  });

  it('should handle invalid regex gracefully', () => {
    const input = 'line1\nline2';
    const config = { filterByRegex: '[' }; // Invalid regex
    const result = applyTransformations(input, config);
    expect(result).toBe(input); // Should return original content
  });

  it('should apply multiple transformations', () => {
    const input = '  zebra  \n  apple  \n  banana  \n  apple  ';
    const config = {
      trim: true,
      sortLines: 'asc' as const,
      removeDuplicates: true,
      addPrefix: '- '
    };
    const result = applyTransformations(input, config);
    expect(result).toBe('- apple\n- banana\n- zebra');
  });

  it('should return empty string for empty input', () => {
    const result = applyTransformations('', { trim: true });
    expect(result).toBe('');
  });

  it('should handle single line input', () => {
    const input = 'single line';
    const config = { trim: true, caseTransform: 'upper' as const };
    const result = applyTransformations(input, config);
    expect(result).toBe('SINGLE LINE');
  });

  it('should handle numbering with duplication correctly', () => {
    const input = 'first\nsecond\nthird';
    const config = { 
      numberLines: 'numeric' as const,
      duplicateLines: 2 
    };
    const result = applyTransformations(input, config);
    // Should duplicate first, then number sequentially
    expect(result).toBe('1. first\n2. first\n3. second\n4. second\n5. third\n6. third');
  });

}); 