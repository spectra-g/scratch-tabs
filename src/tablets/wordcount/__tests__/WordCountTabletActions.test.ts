import { WordCountTablet } from '../WordCountTablet';

describe('WordCountTablet', () => {
  describe('createInitialState', () => {
    it('should create initial state with payload from action context', () => {
      const payload = {
        content: 'This is test content for the word count analysis.',
        title: 'Test Document',
      };

      const initialState = WordCountTablet.createInitialState(payload);

      expect(initialState).toEqual({
        type: 'wordcount',
        data: {
          text: payload.content,
          title: payload.title,
          deviceType: 'standard',
          writingGoal: 'general',
          targetKeyword: '',
        },
      });
    });

    it('should create initial state with empty payload', () => {
      const initialState = WordCountTablet.createInitialState();

      expect(initialState).toEqual({
        type: 'wordcount',
        data: {
          text: '',
          title: '',
          deviceType: 'standard',
          writingGoal: 'general',
          targetKeyword: '',
        },
      });
    });

    it('should handle partial payload data', () => {
      const payload = {
        content: 'Only content provided',
      };

      const initialState = WordCountTablet.createInitialState(payload);

      expect(initialState).toEqual({
        type: 'wordcount',
        data: {
          text: payload.content,
          title: '',
          deviceType: 'standard',
          writingGoal: 'general',
          targetKeyword: '',
        },
      });
    });
  });
});