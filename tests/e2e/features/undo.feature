Feature: Undo Functionality

  Background:
    Given I am on the homepage

  Scenario: Test undo functionality across multiple tabs
    When I click the icon for "New tab"
    And I type "AAA" into the editor
    And I type " XYZ" into the editor
    Then the active editor content should be "AAA XYZ"
    When I click the icon for "New tab"
    And I type "111" into the editor
    And I type " 222" into the editor
    Then the active editor content should be "111 222"
    When I click the "Scratch 1" tab
    And I press Ctrl+Z
    Then the active editor content should be "AAA"
    When I click the "Scratch 2" tab
    And I press Ctrl+Z
    Then the active editor content should be "111"