@please-fix
Feature: Tab context menu

  Background:
    Given I am on the homepage

  Scenario: Open Transformations from tab context menu
    When I set clipboard content to "Hello from clipboard"
    When I click the icon for "New tab with contents from clipboard"
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "Transformations" from the context menu
    Then the batch tools modal should appear

  Scenario: Rename a tab using context menu
    When I click the icon for "New tab with contents from clipboard"
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "Rename" from the context menu
    Then the tab rename input should appear
    When I type "My Custom Tab" in the rename input
    And I press Enter to confirm rename
    Then the "My Custom Tab" tab should be active

  Scenario: Copy content using context menu
    When I click the icon for "New tab with contents from clipboard"
    Then the "Scratch 1" tab should be active
    When I type "Hello World! This is my test content." into the editor
    And I right-click the "Scratch 1" tab
    And I select "Copy content" from the context menu
    When I click the icon for "New tab with contents from clipboard"
    Then the "Scratch 2" tab should be active
    And the active editor content should contain "Hello World! This is my test content."

  Scenario: Load samples using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "From sample" from the context menu
    When I select "JSON" from the "From sample" submenu
    Then the first 10 lines of the editor should contain JSON content
    And the status bar language should be "JSON"
    When I right-click the "Scratch 1" tab
    And I select "From sample" from the context menu
    When I select "Markdown" from the "From sample" submenu
    Then the active editor content should contain "#"
    And the status bar language should be "Markdown"

  Scenario: Duplicate tab using context menu
    When I click the icon for "New tab with contents from clipboard"
    Then the "Scratch 1" tab should be active
    When I type "Original tab content for duplication test" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Duplicate tab" from the context menu
    Then the "Scratch 1 (Copy)" tab should be active
    And the active editor content should contain "Original tab content for duplication test"

  Scenario: Compare with clipboard using context menu
    When I set clipboard content to "Clipboard content for comparison test"
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Different content from clipboard for comparison" into the editor
    And I right-click the "Scratch 1" tab
    And I select "Compare with clipboard" from the context menu
    Then the diff modal should appear
    When I close the diff modal
    Then I should be in split view mode
    And the "Clipboard Compare" tab should exist on the page