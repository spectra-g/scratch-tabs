Feature: Cursor Position Persistence

  Background:
    Given I am on the homepage

  Scenario: Cursor position is preserved when switching between tabs
    # Create first tab with content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Line 1: First tab content
      Line 2: More content here
      Line 3: Even more content
      Line 4: This is line four
      Line 5: Final line of content
      """
    
    # Create second tab with different content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Tab 2 Line 1: Different content
      Tab 2 Line 2: Second tab content
      Tab 2 Line 3: More text here
      Tab 2 Line 4: Fourth line
      Tab 2 Line 5: Last line here
      """
    
    # Position cursor in second tab at a specific location (line 3)
    When I click in the editor at line 3
    And I wait for cursor position to stabilize
    
    # Switch to first tab and position cursor differently (line 2)
    When I click the "Scratch 1" tab
    And I click in the editor at line 2
    And I wait for cursor position to stabilize
    
    # Switch back to second tab - cursor should be at line 3
    When I click the "Scratch 2" tab
    Then the cursor should be at line 3
    
    # Switch back to first tab - cursor should be at line 2
    When I click the "Scratch 1" tab
    Then the cursor should be at line 2

  Scenario: Cursor position persists after page refresh
    # Create tab with content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Line 1: Content for persistence test
      Line 2: Second line of content
      Line 3: Third line for testing
      Line 4: Fourth line here
      Line 5: Final line for test
      """
    
    # Position cursor at specific location
    When I click in the editor at line 4
    And I wait for cursor position to stabilize
    And I wait for the state to be saved
    
    # Refresh page and verify cursor position is restored
    When I refresh the page
    And I wait for the application to load
    Then the cursor should be at line 4

  Scenario: Cursor position is preserved when switching between multiple tabs
    # Create three tabs with different content
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Tab 1 content line 1
      Tab 1 content line 2
      Tab 1 content line 3
      """
    
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Tab 2 content line 1
      Tab 2 content line 2
      Tab 2 content line 3
      """
    
    When I click the icon for "New tab"
    And I type the following content into the active editor:
      """
      Tab 3 content line 1
      Tab 3 content line 2
      Tab 3 content line 3
      """
    
    # Set different cursor positions in each tab
    When I click the "Scratch 1" tab
    And I click in the editor at line 1
    And I wait for cursor position to stabilize
    
    When I click the "Scratch 2" tab
    And I click in the editor at line 2
    And I wait for cursor position to stabilize
    
    When I click the "Scratch 3" tab
    And I click in the editor at line 3
    And I wait for cursor position to stabilize
    
    # Verify each tab remembers its cursor position
    When I click the "Scratch 1" tab
    Then the cursor should be at line 1
    
    When I click the "Scratch 2" tab
    Then the cursor should be at line 2
    
    When I click the "Scratch 3" tab
    Then the cursor should be at line 3