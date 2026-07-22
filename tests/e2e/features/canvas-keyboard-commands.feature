Feature: Canvas keyboard manipulation and shortcut help

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Manipulate cards and history using only keyboard commands
    When I create two Canvas cards using the keyboard
    And I select all Canvas cards using the keyboard
    And I nudge the Canvas selection using small and large keyboard steps
    Then the Canvas selection should move by one and ten grid units
    When I duplicate the Canvas selection using the keyboard
    Then the Canvas text card count should be 4
    And the Canvas selected card count should be 2
    When I delete the Canvas selection using the keyboard
    Then the Canvas text card count should be 2
    When I undo using the Canvas keyboard shortcut
    Then the Canvas text card count should be 4
    When I redo using the Canvas keyboard shortcut
    Then the Canvas text card count should be 2

  Scenario: Fit, reset zoom, and temporarily pan using the keyboard
    When I exercise the Canvas keyboard viewport commands
    Then the Canvas viewport commands should complete successfully

  Scenario: Shortcut help is discoverable and editing retains keyboard control
    When I exercise Canvas shortcut help and the editing guard
    Then Canvas shortcut help and editing isolation should complete successfully
