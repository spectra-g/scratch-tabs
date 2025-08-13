import { renderHook, act } from "@testing-library/react";
import { usePropertiesData } from "../hooks/usePropertiesData";

describe("Group by Prefix Bug", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should preserve original structure and comments when grouping by prefix", () => {
    const originalContent = `# Java-style Properties Configuration
# Application settings
app.name = My Application
app.version = 1.0.3
app.environment = production

# Database configuration using dot notation
database.host = localhost
database.port = 5432
database.username = admin
database.password = secret
database.pool.min = 5
database.pool.max = 20

# Server settings
server.port = 8080
server.timeout = 30000
server.ssl.enabled = false

# Features and toggles
feature.authentication = true
feature.logging = enabled
feature.debug.mode = false

# File paths and resources
log.file.path = /var/log/application.log
config.dir = /etc/myapp/
temp.directory = /tmp/myapp/`;

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
    
    // The function should:
    // 1. NOT move all original comments to the top
    // 2. Group properties by prefix (app, database, server, feature, log, config, temp)
    // 3. Add group comments for each prefix group
    // 4. Preserve logical structure
    
    // Should preserve only the initial header comments, not all comments
    const lines = finalContent.split('\n');
    expect(lines[0]).toBe('# Java-style Properties Configuration');
    expect(lines[1]).toBe('# Application settings');
    expect(lines[2]).toBe(''); // blank line
    expect(lines[3]).toBe('# app configuration'); // First group header (generated - no existing comments)
    
    // Should NOT have moved section-specific comments to the top
    expect(finalContent).not.toContain('# Database configuration using dot notation\n# Server settings\n# Features and toggles');
    
    // Should have grouped properties with preserved original comments or generated defaults
    expect(finalContent).toContain("# app configuration"); // Generated (no existing comments)
    expect(finalContent).toContain("# Database configuration using dot notation"); // Preserved original
    expect(finalContent).toContain("# Server settings"); // Preserved original
    expect(finalContent).toContain("# Features and toggles"); // Preserved original
    
    // Should have properties grouped together
    const appSectionStart = lines.findIndex(line => line.includes('# app configuration'));
    const databaseSectionStart = lines.findIndex(line => line.includes('# Database configuration using dot notation'));
    
    expect(appSectionStart).toBeGreaterThan(-1);
    expect(databaseSectionStart).toBeGreaterThan(appSectionStart);
    
    // App properties should be together after app section header
    const appNameIndex = lines.findIndex(line => line.includes('app.name'));
    const appVersionIndex = lines.findIndex(line => line.includes('app.version'));
    const appEnvIndex = lines.findIndex(line => line.includes('app.environment'));
    
    expect(appNameIndex).toBeGreaterThan(appSectionStart);
    expect(appVersionIndex).toBeGreaterThan(appSectionStart);
    expect(appEnvIndex).toBeGreaterThan(appSectionStart);
    
    // Database properties should be together after database section header
    const dbHostIndex = lines.findIndex(line => line.includes('database.host'));
    const dbPortIndex = lines.findIndex(line => line.includes('database.port'));
    const serverSectionStart = lines.findIndex(line => line.includes('# Server settings'));
    
    expect(dbHostIndex).toBeGreaterThan(databaseSectionStart);
    expect(dbPortIndex).toBeGreaterThan(databaseSectionStart);
    expect(dbHostIndex).toBeLessThan(serverSectionStart);
  });

  test("should not duplicate comments when grouping", () => {
    const simpleContent = `# Main config
app.name = Test
app.version = 1.0
database.host = localhost`;

    let currentContent = simpleContent;
    
    const onContentChange = jest.fn((newContent: string) => {
      currentContent = newContent;
    });

    const { result } = renderHook(() =>
      usePropertiesData(simpleContent, onContentChange)
    );

    act(() => {
      result.current.groupByPrefix();
    });

    jest.advanceTimersByTime(300);

    const finalContent = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
    
    // Should not duplicate the original "# Main config" comment
    const mainConfigMatches = (finalContent.match(/# Main config/g) || []).length;
    expect(mainConfigMatches).toBe(1);
  });
});