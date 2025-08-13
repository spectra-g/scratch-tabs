import { renderHook, act } from "@testing-library/react";
import { usePropertiesData } from "../hooks/usePropertiesData";

describe("Group by Prefix - Preserve Comments", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should preserve and merge group-specific comments, only add default when no comments exist", () => {
    const originalContent = `# Java-style Properties Configuration
# Application settings
app.name = My Application
app.version = 1.0.3
app.environment = production

# Database configuration using dot notation
# Connection settings
database.host = localhost
database.port = 5432
database.username = admin
database.password = secret

# Features and toggles
# Enable/disable various features
feature.authentication = true
feature.logging = enabled
feature.debug.mode = false

# Server settings
server.port = 8080
server.timeout = 30000

temp.directory = /tmp/myapp/
temp.cleanup = true`;

    let currentContent = originalContent;
    
    const onContentChange = jest.fn((newContent: string) => {
      currentContent = newContent;
    });

    const { result } = renderHook(() =>
      usePropertiesData(originalContent, onContentChange)
    );

    // Wait for initial parsing
    expect(result.current.loading).toBe(false);

    // Apply group by prefix transformation
    act(() => {
      result.current.groupByPrefix();
    });

    // Wait for debounced sync
    jest.advanceTimersByTime(300);

    expect(onContentChange).toHaveBeenCalled();
    const finalContent = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
    
    console.log("Final grouped content:", JSON.stringify(finalContent));
    
    const lines = finalContent.split('\n');
    
    // Should preserve global header comments
    expect(lines[0]).toBe('# Java-style Properties Configuration');
    expect(lines[1]).toBe('# Application settings');
    
    // App group - should only get default comment since no specific comments for app group
    const appSectionIndex = lines.findIndex(line => line.includes('# app configuration'));
    expect(appSectionIndex).toBeGreaterThan(-1);
    
    // Database group - should preserve the original comments
    const dbSectionStart = lines.findIndex(line => line.includes('# Database configuration using dot notation'));
    expect(dbSectionStart).toBeGreaterThan(-1);
    const dbConnectionLine = lines.findIndex(line => line.includes('# Connection settings'));
    expect(dbConnectionLine).toBeGreaterThan(dbSectionStart);
    expect(dbConnectionLine).toBeLessThan(lines.findIndex(line => line.includes('database.host')));
    
    // Feature group - should preserve both comments
    const featureSectionStart = lines.findIndex(line => line.includes('# Features and toggles'));
    expect(featureSectionStart).toBeGreaterThan(-1);
    const featureEnableLine = lines.findIndex(line => line.includes('# Enable/disable various features'));
    expect(featureEnableLine).toBeGreaterThan(featureSectionStart);
    expect(featureEnableLine).toBeLessThan(lines.findIndex(line => line.includes('feature.authentication')));
    
    // Server group - should preserve the original comment
    const serverSectionStart = lines.findIndex(line => line.includes('# Server settings'));
    expect(serverSectionStart).toBeGreaterThan(-1);
    
    // Temp group - should get default comment since no specific comments
    const tempSectionStart = lines.findIndex(line => line.includes('# temp configuration'));
    expect(tempSectionStart).toBeGreaterThan(-1);
    
    // Should NOT have generic "# database configuration" since we have specific comments
    expect(finalContent).not.toContain('# database configuration\ndatabase.host');
    
    // Should NOT have generic "# feature configuration" since we have specific comments
    expect(finalContent).not.toContain('# feature configuration\nfeature.authentication');
    
    // Should NOT have generic "# server configuration" since we have specific comment
    expect(finalContent).not.toContain('# server configuration\nserver.port');
    
    // Should have generic comment for temp since no specific comments existed
    expect(finalContent).toContain('# temp configuration\ntemp.cleanup');
    
    // Properties should still be grouped correctly
    const appNameIndex = lines.findIndex(line => line.includes('app.name'));
    const appVersionIndex = lines.findIndex(line => line.includes('app.version'));
    const dbHostIndex = lines.findIndex(line => line.includes('database.host'));
    
    expect(appNameIndex).toBeGreaterThan(appSectionIndex);
    expect(appVersionIndex).toBeGreaterThan(appSectionIndex);
    expect(dbHostIndex).toBeGreaterThan(dbSectionStart);
  });

  test("should handle case with no existing comments for any group", () => {
    const originalContent = `app.name = Test
database.host = localhost
feature.enabled = true`;

    let currentContent = originalContent;
    
    const onContentChange = jest.fn((newContent: string) => {
      currentContent = newContent;
    });

    const { result } = renderHook(() =>
      usePropertiesData(originalContent, onContentChange)
    );

    act(() => {
      result.current.groupByPrefix();
    });

    jest.advanceTimersByTime(300);

    const finalContent = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
    
    // Should generate default comments for all groups since none existed
    expect(finalContent).toContain('# app configuration');
    expect(finalContent).toContain('# database configuration');  
    expect(finalContent).toContain('# feature configuration');
  });

  test("should merge multiple comments for the same group", () => {
    const originalContent = `# App settings
app.name = Test

# Database config
# Important: use secure connection
# Port must be accessible
database.host = localhost
database.port = 5432`;

    let currentContent = originalContent;
    
    const onContentChange = jest.fn((newContent: string) => {
      currentContent = newContent;
    });

    const { result } = renderHook(() =>
      usePropertiesData(originalContent, onContentChange)
    );

    act(() => {
      result.current.groupByPrefix();
    });

    jest.advanceTimersByTime(300);

    const finalContent = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
    
    // Should preserve all database-related comments together
    expect(finalContent).toContain('# Database config');
    expect(finalContent).toContain('# Important: use secure connection');
    expect(finalContent).toContain('# Port must be accessible');
    
    // Comments should appear before the properties
    const lines = finalContent.split('\n');
    const dbConfigIndex = lines.findIndex(line => line.includes('# Database config'));
    const dbHostIndex = lines.findIndex(line => line.includes('database.host'));
    
    expect(dbConfigIndex).toBeLessThan(dbHostIndex);
  });
});