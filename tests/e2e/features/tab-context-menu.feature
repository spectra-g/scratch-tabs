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

  Scenario: Split tab using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Content for Scratch 1 tab" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Content for Scratch 2 tab" into the editor
    When I click the "Scratch 2" tab
    Then the "Scratch 2" tab should be active
    When I click the "Scratch 1" tab
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "Split" from the context menu
    Then I should be in split view mode

  Scenario: Compare with previous tab using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Original content in first tab" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Modified content in second tab" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I type "Different content in third tab" into the editor
    When I click the "Scratch 1" tab
    Then the "Scratch 1" tab should be active
    When I click the "Scratch 2" tab
    Then the "Scratch 2" tab should be active
    When I right-click the "Scratch 2" tab
    And I select "Compare with previous tab" from the context menu
    Then the diff modal should appear
    And the diff modal should show comparison between "Scratch 2" and "Scratch 1"
    And the diff modal left side should contain "Modified content in second tab"
    And the diff modal right side should contain "Original content in first tab"

  Scenario: Compare with other side in split view
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Left side first tab content" into the left editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Left side second tab content" into the left editor
    When I right-click the "Scratch 2" tab
    And I select "Split" from the context menu
    Then I should be in split view mode
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 3" tab should be active
    When I type "Right side first tab content" into the right editor
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 4" tab should be active
    When I type "Right side second tab content" into the right editor
    When I right-click the "Scratch 1" tab
    And I select "Compare with other side" from the context menu
    Then the diff modal should appear
    And the diff modal should show comparison between "Scratch 1" and "Scratch 4"
    And the diff modal left side should contain "Left side first tab content"
    And the diff modal right side should contain "Right side second tab content"
    When I close the diff modal
    When I click the "Scratch 3" tab on the right side
    Then the "Scratch 3" tab should be active
    When I right-click the "Scratch 3" tab
    And I select "Compare with other side" from the context menu
    Then the diff modal should appear
    And the diff modal should show comparison between "Scratch 1" and "Scratch 3"
    And the diff modal left side should contain "Left side first tab content"
    And the diff modal right side should contain "Right side first tab content"

    @please-fix2
  Scenario: Group tabs by type using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I right-click the "Scratch 1" tab
    And I select "From sample" from the context menu
    When I select "JSON" from the "From sample" submenu
    Then the status bar language should be "JSON"
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I right-click the "Scratch 2" tab
    And I select "From sample" from the context menu
    When I select "CSV / TSV" from the "From sample" submenu
    Then the status bar language should be "CSV / TSV"
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I right-click the "Scratch 3" tab
    And I select "From sample" from the context menu
    When I select "JSON" from the "From sample" submenu
    Then the status bar language should be "JSON"
    When I click the icon for "New tab"
    Then the "Scratch 4" tab should be active
    When I right-click the "Scratch 4" tab
    And I select "From sample" from the context menu
    When I select "CSV / TSV" from the "From sample" submenu
    Then the status bar language should be "CSV / TSV"
    When I right-click the "Scratch 1" tab
    And I select "Group tabs by type" from the context menu
    Then the tabs should be ordered as "Welcome, Scratch 1, Scratch 3, Scratch 2, Scratch 4"

  Scenario: Move tab right using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Left tab 1 content" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Left tab 2 content" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 3" tab should be active
    When I type "Left tab 3 content" into the editor
    When I right-click the "Scratch 2" tab
    And I select "Split" from the context menu
    Then I should be in split view mode
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 4" tab should be active
    When I type "Right tab 1 content" into the right editor
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 5" tab should be active
    When I type "Right tab 2 content" into the right editor
    When I right-click the "Scratch 1" tab
    And I select "Move right" from the context menu
    Then the left panel should contain tabs "Welcome, Scratch 3"
    And the right panel should contain tabs "Scratch 2, Scratch 4, Scratch 5, Scratch 1"

  @please-fix
  Scenario: Move tab left using context menu
    When I click the icon for "New tab"
    Then the "Scratch 1" tab should be active
    When I type "Left tab 1 content" into the editor
    When I click the icon for "New tab"
    Then the "Scratch 2" tab should be active
    When I type "Left tab 2 content" into the editor
    When I right-click the "Scratch 1" tab
    And I select "Split" from the context menu
    Then I should be in split view mode
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 3" tab should be active
    When I type "Right tab 1 content" into the right editor
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 4" tab should be active
    When I type "Right tab 2 content" into the right editor
    When I click the icon for "New tab" on the "right" side
    Then the "Scratch 5" tab should be active
    When I type "Right tab 3 content" into the right editor
    When I right-click the "Scratch 4" tab
    And I select "Move left" from the context menu
    Then the left panel should contain tabs "Welcome, Scratch 2, Scratch 4"
    And the right panel should contain tabs "Scratch 1, Scratch 3, Scratch 5"