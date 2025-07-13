Feature: Undo Functionality

  Background:
    Given I am on the homepage

  Scenario: Test undo functionality across multiple tabs
    When I click the icon for "New tab"
    And I type "AAA" into the editor
    And I wait for 1 second
    And I type " XYZ" into the editor
    Then the active editor content should be "AAA XYZ"
    When I click the icon for "New tab"
    And I type "111" into the editor
    And I wait for 1 second
    And I type " 222" into the editor
    Then the active editor content should be "111 222"
    When I click the "Scratch 1" tab
    And I press Ctrl+Z
    Then the active editor content should be "AAA"
    When I click the "Scratch 2" tab
    And I press Ctrl+Z
    Then the active editor content should be "111"

  Scenario: Undo from programmatic change
    When I click the icon for "New tab"
    And I right-click the "Scratch 1" tab
    And I select "From sample" from the context menu
    And I select "JSON" from the "From sample" submenu
    Then the status bar language should be "JSON"
    And the status bar should show a green validation tick
    When I click the three dots menu
    And I select "Minify" from the context menu
    Then the editor content should be on a single line
    When I press Ctrl+Z
    Then the editor content should not be on a single line 