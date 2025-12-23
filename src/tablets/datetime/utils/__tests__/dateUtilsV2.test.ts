import { intelligentParse } from '../dateUtils';

describe('dateUtils V2 - New Features', () => {
    describe('intelligentParse - Commands', () => {
        it('should parse timezone add command', () => {
            // Test direct city mapping
            const resultCity = intelligentParse('> Tokyo');
            expect(resultCity.format).toBe('Command');
            expect(resultCity.commandResult?.type).toBe('ADD_TIMEZONE');
            expect(resultCity.commandResult?.payload).toBe('Asia/Tokyo');

            // Test valid timezone
            const resultValid = intelligentParse('> Asia/Shanghai');
            expect(resultValid.commandResult?.type).toBe('ADD_TIMEZONE');
            expect(resultValid.commandResult?.payload).toBe('Asia/Shanghai');
        });

        it('should parse diff command', () => {
            const result = intelligentParse('> diff 2025-01-01');
            expect(result.format).toBe('Command');
            expect(result.commandResult).toBeDefined();
            expect(result.commandResult?.type).toBe('SHOW_DIFF');
            expect(result.commandResult?.payload).toBeInstanceOf(Date);
            expect((result.commandResult?.payload as Date).getFullYear()).toBe(2025);
        });

        it('should parse jump date command', () => {
            const result = intelligentParse('> 2030-01-01');
            expect(result.format).toBe('Command');
            expect(result.commandResult).toBeDefined();
            expect(result.commandResult?.type).toBe('JUMP_DATE');
            expect(result.commandResult?.payload).toBeInstanceOf(Date);
            expect(result.date).toBeInstanceOf(Date);
        });

        it('should warn on unknown command', () => {
            const result = intelligentParse('> xyzabcd');
            expect(result.format).toBe('Command');
            expect(result.commandResult).toBeUndefined();
            // warning is string, check exists
            expect(result.warning).toBe('Unknown command');
        });
    });
});
