import { getCellClasses, CELL_STYLES } from '../cellStyles';

describe('cellStyles', () => {
  describe('getCellClasses', () => {
    const defaultState = {
      isSelected: false,
      isMultiSelected: false,
      isActiveSearchMatch: false,
      isSearchMatch: false,
      isValid: true,
    };

    it('should return base classes for default state', () => {
      const classes = getCellClasses(defaultState);
      expect(classes).toContain(CELL_STYLES.BASE);
      expect(classes).toContain(CELL_STYLES.HOVER);
    });

    it('should prioritize selected and active search match', () => {
      const classes = getCellClasses({
        ...defaultState,
        isSelected: true,
        isActiveSearchMatch: true,
      });
      expect(classes).toContain(CELL_STYLES.SELECTED_AND_ACTIVE_SEARCH);
      expect(classes).not.toContain(CELL_STYLES.SELECTED);
      expect(classes).not.toContain(CELL_STYLES.ACTIVE_SEARCH_MATCH);
    });

    it('should show selected style when cell is selected', () => {
      const classes = getCellClasses({
        ...defaultState,
        isSelected: true,
      });
      expect(classes).toContain(CELL_STYLES.SELECTED);
      expect(classes).not.toContain(CELL_STYLES.HOVER);
    });

    it('should show multi-selected style when cell is multi-selected', () => {
      const classes = getCellClasses({
        ...defaultState,
        isMultiSelected: true,
      });
      expect(classes).toContain(CELL_STYLES.MULTI_SELECTED);
      expect(classes).not.toContain(CELL_STYLES.HOVER);
    });

    it('should show active search match style', () => {
      const classes = getCellClasses({
        ...defaultState,
        isActiveSearchMatch: true,
      });
      expect(classes).toContain(CELL_STYLES.ACTIVE_SEARCH_MATCH);
    });

    it('should show search match style', () => {
      const classes = getCellClasses({
        ...defaultState,
        isSearchMatch: true,
      });
      expect(classes).toContain(CELL_STYLES.SEARCH_MATCH);
    });

    it('should add invalid style when cell is invalid', () => {
      const classes = getCellClasses({
        ...defaultState,
        isValid: false,
      });
      expect(classes).toContain(CELL_STYLES.INVALID);
    });

    it('should handle multiple state combinations correctly', () => {
      const classes = getCellClasses({
        ...defaultState,
        isSearchMatch: true,
        isValid: false,
      });
      expect(classes).toContain(CELL_STYLES.SEARCH_MATCH);
      expect(classes).toContain(CELL_STYLES.INVALID);
      expect(classes).not.toContain(CELL_STYLES.HOVER);
    });
  });
});