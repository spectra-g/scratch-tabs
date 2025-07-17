/**
 * Hidden test indicator fields for E2E testing
 * These elements are used by E2E tests to detect when certain operations complete
 */
export function TestFields() {
  return (
    <>
      {/* Hidden element for E2E tests to detect when saves complete */}
      <div 
        id="test-save-indicator" 
        data-last-save="0"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      
      {/* Hidden element for E2E tests to detect when cursor position debounce completes */}
      <div 
        id="test-cursor-indicator" 
        data-last-cursor-save="0"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </>
  );
}