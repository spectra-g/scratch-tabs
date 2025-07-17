Feature: Cursor Position Persistence Simple

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