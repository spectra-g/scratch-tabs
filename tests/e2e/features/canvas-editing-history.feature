Feature: Canvas selection operations and editing history

  Background:
    Given the Canvas experimental feature is enabled
    And I am using a Canvas desktop viewport
    And I am on the homepage
    When I click the icon for "New tab"
    And I create a new Canvas

  Scenario: Duplicate a multi-selection as an offset selected group
    When I add a Canvas text card containing "First selected card"
    And I add a Canvas text card containing "Second selected card"
    And I multi-select Canvas cards "First selected card" and "Second selected card"
    And I duplicate the selected Canvas cards "First selected card" and "Second selected card"
    Then the Canvas text card count should be 4
    And the duplicated Canvas cards "First selected card" and "Second selected card" should be selected and offset

  Scenario: Undo and redo completed move, resize, and delete operations
    When I add a Canvas text card containing "History card"
    And I move the selected Canvas card
    And I undo the Canvas operation
    Then the Canvas card should have its bounds from before the operation
    When I redo the Canvas operation
    Then the Canvas card should have its bounds from after the operation
    When I resize the selected Canvas card
    And I undo the Canvas operation
    Then the Canvas card should have its bounds from before the operation
    When I redo the Canvas operation
    Then the Canvas card should have its bounds from after the operation
    When I delete the Canvas selection from the selection toolbar
    Then the Canvas text card count should be 0
    When I undo the Canvas operation
    Then the Canvas text card count should be 1
    When I redo the Canvas operation
    Then the Canvas text card count should be 0

  Scenario: Reload persists the latest state without restoring session history
    When I add a Canvas text card containing "Session-only history"
    And I duplicate the current Canvas selection
    And I wait for the Canvas scene to be saved
    And I refresh the page
    Then the Canvas text card count should be 2
    And the Canvas undo history should be empty
